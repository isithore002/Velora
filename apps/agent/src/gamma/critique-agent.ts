import {
  type DetectedEvent,
  type AlphaDecision,
  type CritiqueResult,
  type AuditEntry,
  CritiqueResultSchema,
} from "@velora/core";

/** System prompt instructing Gamma to be skeptical but not paranoid */
const GAMMA_SYSTEM_PROMPT = `You are a skeptical security auditor for crypto wallets. Your role is to challenge Alpha agent's threat assessments before any protective action is executed.

You receive:
1. A detected blockchain event
2. Alpha's risk score and proposed action
3. Recent audit history

Your job is to critically evaluate whether the threat is real:
- Could this be a legitimate DeFi interaction (swap, deposit, yield farming)?
- Is the spender a known, reputable protocol?
- Would revoking this approval break an active yield strategy or LP position?
- Are there similar recent events that turned out benign?

Be conservative in approving protective actions. Only approve if you are highly confident (>0.8) the event is genuinely malicious or dangerous.

If you override Alpha's decision, explain clearly why you disagree.

Respond in valid JSON matching this exact schema:
{
  "approve": boolean,
  "confidence": number (0-1),
  "reasoning": string,
  "suggestedAction": "revoke_allowance" | "sweep_funds" | "pause_contract" | "alert_only",
  "overrideAlpha": boolean
}`;

/**
 * Gamma Agent — The Critic
 *
 * Challenges Alpha's decisions before execution. Uses LLM to evaluate
 * whether detected threats are genuine or false positives.
 * Includes circuit breaker: 3 consecutive failures → fallback to Alpha.
 */
export class CritiqueAgent {
  private readonly openaiApiKey: string;
  private consecutiveFailures: number = 0;
  private readonly maxFailures: number = 3;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Critique Alpha's decision with LLM-based analysis.
   * Falls back to Alpha's decision if the LLM fails repeatedly.
   */
  public async critique(
    event: DetectedEvent,
    alphaDecision: AlphaDecision,
    recentHistory: AuditEntry[]
  ): Promise<CritiqueResult> {
    // Circuit breaker: if Gamma has failed too many times, trust Alpha
    if (this.consecutiveFailures >= this.maxFailures) {
      console.log(JSON.stringify({
        type: "gamma_circuit_breaker",
        message: `Circuit breaker active after ${this.maxFailures} failures. Falling back to Alpha's decision.`,
        txHash: event.txHash,
      }));

      return {
        approve: true,
        confidence: 0.5,
        reasoning: `Circuit breaker: Gamma agent failed ${this.maxFailures} consecutive times. Auto-approving Alpha's decision with reduced confidence.`,
        suggestedAction: alphaDecision.proposedAction,
        overrideAlpha: false,
      };
    }

    try {
      const result = await this.callLLM(event, alphaDecision, recentHistory);
      this.consecutiveFailures = 0; // Reset on success
      return result;
    } catch (error) {
      this.consecutiveFailures++;
      const errMessage = error instanceof Error ? error.message : String(error);

      console.log(JSON.stringify({
        type: "gamma_error",
        error: errMessage,
        consecutiveFailures: this.consecutiveFailures,
        txHash: event.txHash,
      }));

      // Fallback: approve Alpha's decision with warning
      return {
        approve: true,
        confidence: 0.5,
        reasoning: `Gamma agent error: ${errMessage}. Falling back to Alpha's decision.`,
        suggestedAction: alphaDecision.proposedAction,
        overrideAlpha: false,
      };
    }
  }

  /**
   * Reset the circuit breaker (e.g., after fixing the API key).
   */
  public resetCircuitBreaker(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Get current circuit breaker status.
   */
  public getCircuitBreakerStatus(): {
    failures: number;
    maxFailures: number;
    isOpen: boolean;
  } {
    return {
      failures: this.consecutiveFailures,
      maxFailures: this.maxFailures,
      isOpen: this.consecutiveFailures >= this.maxFailures,
    };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async callLLM(
    event: DetectedEvent,
    alphaDecision: AlphaDecision,
    recentHistory: AuditEntry[]
  ): Promise<CritiqueResult> {
    // Use mock mode if no real API key
    if (!this.openaiApiKey || this.openaiApiKey.startsWith("sk-your")) {
      return this.mockCritique(event, alphaDecision);
    }

    const reputation = await this.fetchContractReputation(event.chainId, event.contractAddress);
    const userPrompt = this.buildUserPrompt(event, alphaDecision, recentHistory, reputation);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: GAMMA_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed: unknown = JSON.parse(content);
    const validated = CritiqueResultSchema.parse(parsed);

    console.log(JSON.stringify({
      type: "gamma_critique",
      txHash: event.txHash,
      approve: validated.approve,
      confidence: validated.confidence,
      overrideAlpha: validated.overrideAlpha,
    }));

    return validated;
  }

  private buildUserPrompt(
    event: DetectedEvent,
    alphaDecision: AlphaDecision,
    recentHistory: AuditEntry[],
    reputation: any
  ): string {
    const historySnippet = recentHistory.slice(0, 5).map((h) => ({
      txHash: h.event.txHash,
      riskScore: h.alphaDecision.riskScore,
      action: h.finalAction,
      status: h.status,
    }));

    let reputationSnippet = "Not available.";
    if (reputation) {
      reputationSnippet = `- Is Honeypot: ${reputation.is_honeypot === "1" ? "Yes 🚨" : "No"}
- Is Blacklisted: ${reputation.is_blacklisted === "1" ? "Yes 🚨" : "No"}
- Is Open Source: ${reputation.is_open_source === "1" ? "Yes" : "No"}
- In Trust List: ${reputation.trust_list === "1" ? "Yes ✅" : "No"}
- Malicious Behavior Flags: ${reputation.malicious_behavior?.length ? reputation.malicious_behavior.join(", ") : "None"}`;
    }

    return `## Detected Event
- Transaction: ${event.txHash}
- Chain ID: ${event.chainId}
- Contract: ${event.contractAddress}
- Spender: ${event.spender ?? "N/A"}
- Amount: ${event.amount ?? "N/A"}
- USD Value: ${event.usdValue !== undefined ? `$${event.usdValue.toLocaleString()}` : "Unknown"}
- Function: ${event.functionName ?? event.functionSelector ?? "N/A"}

## Smart Contract Reputation (GoPlus Security)
${reputationSnippet}

## Alpha's Assessment
- Risk Score: ${alphaDecision.riskScore}/100
- Threat Level: ${alphaDecision.threatLevel.toUpperCase()}
- Proposed Action: ${alphaDecision.proposedAction}
- Triggered Heuristics:
${alphaDecision.triggeredHeuristics.map((h) => `  • ${h.name} (+${h.score}): ${h.description}`).join("\n")}

## Recent History (last 5)
${JSON.stringify(historySnippet, null, 2)}

Please evaluate this threat and provide your critique.`;
  }

  private async fetchContractReputation(chainId: number, contractAddress: string): Promise<any> {
    try {
      const response = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${contractAddress}`);
      if (!response.ok) return null;
      const data = await response.json() as any;
      if (data.code !== 1) return null;
      const contractData = data.result[contractAddress.toLowerCase()];
      if (!contractData) return null;
      
      return {
        is_honeypot: contractData.is_honeypot,
        is_blacklisted: contractData.is_blacklisted,
        is_open_source: contractData.is_open_source,
        trust_list: contractData.trust_list,
        malicious_behavior: contractData.malicious_behavior || [],
      };
    } catch (error) {
      console.log(`[Gamma] Failed to fetch GoPlus reputation for ${contractAddress}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Mock critique for development/testing without OpenAI API key.
   * Uses simple heuristics to simulate Gamma's behavior.
   */
  private mockCritique(
    event: DetectedEvent,
    alphaDecision: AlphaDecision
  ): CritiqueResult {
    // If score is very high (>85), likely genuine threat
    if (alphaDecision.riskScore > 85) {
      return {
        approve: true,
        confidence: 0.9,
        reasoning: `[MOCK] Risk score ${alphaDecision.riskScore}/100 is critically high. Multiple heuristics triggered (${alphaDecision.triggeredHeuristics.map((h) => h.name).join(", ")}). Recommend immediate protective action.`,
        suggestedAction: alphaDecision.proposedAction,
        overrideAlpha: false,
      };
    }

    // Moderate scores — approve but with lower confidence
    if (alphaDecision.riskScore > 70) {
      return {
        approve: true,
        confidence: 0.7,
        reasoning: `[MOCK] Risk score ${alphaDecision.riskScore}/100 warrants action. However, confidence is moderate — could be legitimate DeFi interaction. Proceeding with Alpha's recommendation.`,
        suggestedAction: alphaDecision.proposedAction,
        overrideAlpha: false,
      };
    }

    // Lower scores — reject and suggest alert only
    return {
      approve: false,
      confidence: 0.6,
      reasoning: `[MOCK] Risk score ${alphaDecision.riskScore}/100 is below critical threshold. This may be a legitimate interaction. Recommending alert only.`,
      suggestedAction: "alert_only",
      overrideAlpha: true,
    };
  }
}
