import type {
  DetectedEvent,
  ThreatLevel,
  RiskEngineConfig,
  HeuristicConfig,
  KnownProtocol,
} from "./types";
import knownProtocolsData from "./known-protocols.json";

/** Maximum uint256 value — indicates unlimited approval */
const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

/** Known exploit function selectors */
const SUSPICIOUS_SELECTORS: ReadonlySet<string> = new Set([
  "0xa9059cbb", // transfer (when called suspiciously)
  "0x23b872dd", // transferFrom
  "0x42842e0e", // safeTransferFrom (ERC721)
  "0xf242432a", // safeTransferFrom (ERC1155)
  "0x095ea7b3", // approve (flagged separately by unlimited check)
  "0x39509351", // increaseAllowance
  "0xa22cb465", // setApprovalForAll
  "0x2eb2c2d6", // safeBatchTransferFrom
  "0xe63d38ed", // batchTransfer (used in exploits)
]);

/** Default heuristic configuration */
const DEFAULT_HEURISTICS: HeuristicConfig[] = [
  {
    name: "UNLIMITED_APPROVAL",
    enabled: true,
    weight: 40,
    description: "Approval amount equals MaxUint256 (unlimited)",
  },
  {
    name: "UNKNOWN_SPENDER",
    enabled: true,
    weight: 30,
    description: "Spender address not found in known protocol registry",
  },
  {
    name: "LARGE_AMOUNT",
    enabled: true,
    weight: 20,
    description: "Transaction USD value exceeds $10,000",
  },
  {
    name: "NEW_CONTRACT",
    enabled: true,
    weight: 25,
    description: "Target contract deployed less than 7 days ago",
  },
  {
    name: "SUSPICIOUS_FUNCTION",
    enabled: true,
    weight: 50,
    description: "Function selector matches known exploit patterns",
  },
];

/** Default risk engine configuration */
export const DEFAULT_CONFIG: RiskEngineConfig = {
  heuristics: DEFAULT_HEURISTICS,
  gammaThreshold: 70,
  protocolOverrides: {},
};

export interface TriggeredHeuristic {
  name: string;
  score: number;
  description: string;
}

/**
 * Alpha detection engine — scores blockchain events 0-100 based on
 * configurable heuristics to identify anomalous/malicious transactions.
 */
export class RiskEngine {
  private readonly config: RiskEngineConfig;
  private readonly knownProtocols: KnownProtocol[];

  constructor(config: Partial<RiskEngineConfig> = {}) {
    this.config = {
      heuristics: config.heuristics ?? DEFAULT_HEURISTICS,
      gammaThreshold: config.gammaThreshold ?? 70,
      protocolOverrides: config.protocolOverrides ?? {},
    };
    this.knownProtocols = knownProtocolsData as KnownProtocol[];
  }

  /**
   * Score a detected event from 0-100 based on enabled heuristics.
   * Scores are capped at 100.
   */
  public scoreEvent(event: DetectedEvent): number {
    let totalScore = 0;

    for (const heuristic of this.config.heuristics) {
      if (!heuristic.enabled) continue;

      const score = this.evaluateHeuristic(heuristic.name, event);
      if (score > 0) {
        totalScore += Math.min(score, heuristic.weight);
      }
    }

    // Apply protocol overrides (reduce score for trusted protocols)
    const protocolName = this.identifyProtocol(event);
    if (protocolName) {
      const override = this.config.protocolOverrides[protocolName];
      if (override !== undefined) {
        totalScore = Math.max(0, totalScore + override);
      }
    }

    return Math.min(100, Math.max(0, totalScore));
  }

  /**
   * Classify a numeric risk score into a threat level.
   */
  public classify(score: number): ThreatLevel {
    if (score >= 80) return "critical";
    if (score >= 70) return "high";
    if (score >= 50) return "medium";
    return "low";
  }

  /**
   * Get all heuristics that triggered for a given event, with scores.
   */
  public getTriggeredHeuristics(event: DetectedEvent): TriggeredHeuristic[] {
    const triggered: TriggeredHeuristic[] = [];

    for (const heuristic of this.config.heuristics) {
      if (!heuristic.enabled) continue;

      const score = this.evaluateHeuristic(heuristic.name, event);
      if (score > 0) {
        triggered.push({
          name: heuristic.name,
          score: Math.min(score, heuristic.weight),
          description: heuristic.description,
        });
      }
    }

    return triggered;
  }

  /**
   * Check if the Gamma threshold is exceeded for a given score.
   */
  public shouldTriggerGamma(score: number): boolean {
    return score >= this.config.gammaThreshold;
  }

  /**
   * Get the current configuration.
   */
  public getConfig(): RiskEngineConfig {
    return { ...this.config };
  }

  // ─── Private Heuristic Evaluators ─────────────────────────────────────────

  private evaluateHeuristic(name: string, event: DetectedEvent): number {
    switch (name) {
      case "UNLIMITED_APPROVAL":
        return this.checkUnlimitedApproval(event);
      case "UNKNOWN_SPENDER":
        return this.checkUnknownSpender(event);
      case "LARGE_AMOUNT":
        return this.checkLargeAmount(event);
      case "NEW_CONTRACT":
        return this.checkNewContract(event);
      case "SUSPICIOUS_FUNCTION":
        return this.checkSuspiciousFunction(event);
      default:
        return 0;
    }
  }

  private checkUnlimitedApproval(event: DetectedEvent): number {
    if (event.amount === MAX_UINT256) {
      return this.getWeight("UNLIMITED_APPROVAL");
    }
    return 0;
  }

  private checkUnknownSpender(event: DetectedEvent): number {
    if (!event.spender) return 0;

    const spenderLower = event.spender.toLowerCase();
    const chainId = String(event.chainId);

    for (const protocol of this.knownProtocols) {
      const addresses = protocol.addresses[chainId];
      if (
        addresses?.some(
          (addr) => addr.toLowerCase() === spenderLower
        )
      ) {
        return 0; // Known protocol — safe
      }
    }

    return this.getWeight("UNKNOWN_SPENDER");
  }

  private checkLargeAmount(event: DetectedEvent): number {
    if (event.usdValue !== undefined && event.usdValue > 10_000) {
      return this.getWeight("LARGE_AMOUNT");
    }
    return 0;
  }

  private checkNewContract(event: DetectedEvent): number {
    if (event.contractDeployedAt === undefined) return 0;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (event.contractDeployedAt > sevenDaysAgo) {
      return this.getWeight("NEW_CONTRACT");
    }
    return 0;
  }

  private checkSuspiciousFunction(event: DetectedEvent): number {
    if (!event.functionSelector) return 0;

    if (SUSPICIOUS_SELECTORS.has(event.functionSelector.toLowerCase())) {
      return this.getWeight("SUSPICIOUS_FUNCTION");
    }
    return 0;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getWeight(heuristicName: string): number {
    const heuristic = this.config.heuristics.find(
      (h) => h.name === heuristicName
    );
    return heuristic?.weight ?? 0;
  }

  private identifyProtocol(event: DetectedEvent): string | undefined {
    const addressLower = event.contractAddress.toLowerCase();
    const chainId = String(event.chainId);

    for (const protocol of this.knownProtocols) {
      const addresses = protocol.addresses[chainId];
      if (
        addresses?.some(
          (addr) => addr.toLowerCase() === addressLower
        )
      ) {
        return protocol.name;
      }
    }

    return undefined;
  }
}
