import type { AuditEntry, ThreatLevel } from "@velora/core";

/**
 * Generate realistic mock audit entries for the dashboard.
 * Used when no live agent connection is available.
 */
export function generateMockThreats(count: number = 10): AuditEntry[] {
  const scenarios: Array<{
    threat: ThreatLevel;
    action: string;
    spender: string;
    contract: string;
    heuristics: Array<{ name: string; score: number; description: string }>;
    approve: boolean;
    status: AuditEntry["status"];
  }> = [
    {
      threat: "critical",
      action: "revoke_allowance",
      spender: "0xDEADBEEF00000000000000000000000000000001",
      contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      heuristics: [
        { name: "UNLIMITED_APPROVAL", score: 40, description: "Approval amount equals MaxUint256" },
        { name: "UNKNOWN_SPENDER", score: 30, description: "Spender not in known protocol registry" },
        { name: "LARGE_AMOUNT", score: 20, description: "USD value exceeds $10,000" },
      ],
      approve: true,
      status: "confirmed",
    },
    {
      threat: "high",
      action: "revoke_allowance",
      spender: "0xBADBADBAD0000000000000000000000000000002",
      contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      heuristics: [
        { name: "UNKNOWN_SPENDER", score: 30, description: "Spender not in known protocol registry" },
        { name: "SUSPICIOUS_FUNCTION", score: 50, description: "Function selector matches exploit" },
      ],
      approve: false,
      status: "rejected",
    },
    {
      threat: "low",
      action: "alert_only",
      spender: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      contract: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      heuristics: [],
      approve: true,
      status: "confirmed",
    },
    {
      threat: "critical",
      action: "sweep_funds",
      spender: "0xSUSPICIOUS000000000000000000000000000003",
      contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      heuristics: [
        { name: "UNLIMITED_APPROVAL", score: 40, description: "Approval amount equals MaxUint256" },
        { name: "NEW_CONTRACT", score: 25, description: "Contract deployed < 7 days ago" },
        { name: "SUSPICIOUS_FUNCTION", score: 50, description: "Function selector matches exploit" },
      ],
      approve: true,
      status: "executing",
    },
    {
      threat: "medium",
      action: "alert_only",
      spender: "0x1111111254EEB25477B68fb85Ed929f73A960582",
      contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      heuristics: [
        { name: "LARGE_AMOUNT", score: 20, description: "USD value exceeds $10,000" },
      ],
      approve: true,
      status: "confirmed",
    },
  ];

  const entries: AuditEntry[] = [];

  for (let i = 0; i < count; i++) {
    const scenario = scenarios[i % scenarios.length]!;
    const timestamp = Date.now() - i * 180_000; // 3 min apart
    const score = scenario.threat === "critical" ? 88 + Math.floor(Math.random() * 12)
      : scenario.threat === "high" ? 72 + Math.floor(Math.random() * 13)
      : scenario.threat === "medium" ? 50 + Math.floor(Math.random() * 20)
      : 15 + Math.floor(Math.random() * 30);

    const txHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    entries.push({
      id: `mock-${i}-${Date.now()}`,
      event: {
        txHash,
        chainId: 8453,
        contractAddress: scenario.contract,
        spender: scenario.spender,
        amount: scenario.threat === "critical"
          ? "115792089237316195423570985008687907853269984665640564039457584007913129639935"
          : `${Math.floor(Math.random() * 50000)}000000`,
        usdValue: scenario.threat === "critical" ? 24500 + Math.floor(Math.random() * 10000)
          : scenario.threat === "high" ? 8000 + Math.floor(Math.random() * 7000)
          : 500 + Math.floor(Math.random() * 5000),
        functionSelector: "0x095ea7b3",
        functionName: "approve",
        riskScore: score,
        timestamp,
      },
      alphaDecision: {
        riskScore: score,
        threatLevel: scenario.threat,
        triggeredHeuristics: scenario.heuristics,
        proposedAction: scenario.action as AuditEntry["finalAction"],
        timestamp,
      },
      gammaCritique: score > 70
        ? {
            approve: scenario.approve,
            confidence: scenario.approve ? 0.88 + Math.random() * 0.12 : 0.6 + Math.random() * 0.2,
            reasoning: scenario.approve
              ? `Spender ${scenario.spender.slice(0, 10)}... is not in the known protocol registry. ${
                  scenario.threat === "critical" ? "Unlimited approval for significant USD value is abnormal." : "Transaction pattern is suspicious."
                } Recommend immediate ${scenario.action.replace("_", " ")}.`
              : `While the risk score is elevated, the spender appears to be interacting with a known DeFi pattern. The function call matches standard swap operations. Recommend monitoring only.`,
            suggestedAction: scenario.approve ? scenario.action as AuditEntry["finalAction"] : "alert_only",
            overrideAlpha: !scenario.approve,
          }
        : null,
      finalAction: scenario.approve ? scenario.action as AuditEntry["finalAction"] : "alert_only",
      keeperhubTxHash: scenario.status === "confirmed"
        ? `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`
        : null,
      gasUsed: scenario.status === "confirmed" ? 45000 + Math.floor(Math.random() * 30000) : null,
      status: scenario.status,
      timestamp,
      updatedAt: timestamp + 14000,
    });
  }

  return entries;
}
