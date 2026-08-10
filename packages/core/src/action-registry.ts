import type {
  DetectedEvent,
  ThreatLevel,
  ProtectiveAction,
} from "./types";

/** Override rule for specific protocol/contract adjustments */
export interface OverrideRule {
  /** Match condition */
  match: {
    protocol?: string;
    contractAddress?: string;
    chainId?: number;
  };
  /** Score adjustment (negative = reduce, positive = increase) */
  scoreAdjustment: number;
  /** Force a specific action regardless of score */
  forceAction?: ProtectiveAction;
}

/** Default mapping from threat level to protective action */
const DEFAULT_ACTION_MAP: Record<ThreatLevel, ProtectiveAction> = {
  low: "alert_only",
  medium: "alert_only",
  high: "revoke_allowance",
  critical: "sweep_funds",
};

/**
 * Maps threat levels to protective actions with support for
 * protocol-specific overrides and forced actions.
 */
export class ActionRegistry {
  private readonly actionMap: Record<ThreatLevel, ProtectiveAction>;
  private readonly overrideRules: OverrideRule[];

  constructor(
    actionMap?: Partial<Record<ThreatLevel, ProtectiveAction>>,
    overrideRules: OverrideRule[] = []
  ) {
    this.actionMap = { ...DEFAULT_ACTION_MAP, ...actionMap };
    this.overrideRules = overrideRules;
  }

  /**
   * Resolve the appropriate protective action for an event and its risk score.
   * Applies override rules if any match the event context.
   */
  public resolveAction(
    event: DetectedEvent,
    score: number,
    threatLevel: ThreatLevel
  ): ProtectiveAction {
    // Check override rules first
    for (const rule of this.overrideRules) {
      if (this.matchesRule(rule, event)) {
        if (rule.forceAction) {
          return rule.forceAction;
        }
        // Adjust score and reclassify
        const adjustedScore = Math.min(100, Math.max(0, score + rule.scoreAdjustment));
        const adjustedLevel = this.classifyScore(adjustedScore);
        return this.actionMap[adjustedLevel];
      }
    }

    return this.actionMap[threatLevel];
  }

  /**
   * Get the default action for a threat level (no overrides applied).
   */
  public getDefaultAction(threatLevel: ThreatLevel): ProtectiveAction {
    return this.actionMap[threatLevel];
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private matchesRule(rule: OverrideRule, event: DetectedEvent): boolean {
    const { match } = rule;

    if (match.chainId !== undefined && match.chainId !== event.chainId) {
      return false;
    }

    if (
      match.contractAddress !== undefined &&
      match.contractAddress.toLowerCase() !== event.contractAddress.toLowerCase()
    ) {
      return false;
    }

    // Protocol matching would require protocol identification from risk engine
    // For now, match by contract address only
    return true;
  }

  private classifyScore(score: number): ThreatLevel {
    if (score >= 80) return "critical";
    if (score >= 70) return "high";
    if (score >= 50) return "medium";
    return "low";
  }
}

/**
 * Convenience function to resolve an action using default settings.
 */
export function resolveAction(
  event: DetectedEvent,
  score: number
): ProtectiveAction {
  const registry = new ActionRegistry();
  const level: ThreatLevel =
    score >= 80 ? "critical" : score >= 70 ? "high" : score >= 50 ? "medium" : "low";
  return registry.resolveAction(event, score, level);
}
