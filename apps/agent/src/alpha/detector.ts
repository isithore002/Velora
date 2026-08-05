import {
  RiskEngine,
  AuditLogger,
  ActionRegistry,
  type DetectedEvent,
  type AlphaDecision,
  type RiskEngineConfig,
} from "@keeperguard/core";

/**
 * Alpha Agent — The Detector
 * 
 * Monitors wallet/contract events, scores risk 0-100, and drafts
 * protective actions. Runs on every block or incoming webhook event.
 */
export class AlphaAgent {
  private readonly riskEngine: RiskEngine;
  private readonly actionRegistry: ActionRegistry;
  private readonly auditLogger: AuditLogger;

  constructor(
    config?: Partial<RiskEngineConfig>,
    auditLogger?: AuditLogger
  ) {
    this.riskEngine = new RiskEngine(config);
    this.actionRegistry = new ActionRegistry();
    this.auditLogger = auditLogger ?? new AuditLogger();
  }

  /**
   * Analyze a detected event and produce an Alpha decision.
   * Does NOT execute any action — just scores and proposes.
   */
  public analyze(event: DetectedEvent): AlphaDecision {
    const score = this.riskEngine.scoreEvent(event);
    const threatLevel = this.riskEngine.classify(score);
    const triggeredHeuristics = this.riskEngine.getTriggeredHeuristics(event);
    const proposedAction = this.actionRegistry.resolveAction(
      event,
      score,
      threatLevel
    );

    const decision: AlphaDecision = {
      riskScore: score,
      threatLevel,
      triggeredHeuristics,
      proposedAction,
      timestamp: Date.now(),
    };

    console.log(JSON.stringify({
      type: "alpha_decision",
      txHash: event.txHash,
      riskScore: score,
      threatLevel,
      proposedAction,
      heuristicsTriggered: triggeredHeuristics.map((h) => h.name),
    }));

    return decision;
  }

  /**
   * Check if the score warrants Gamma critique.
   */
  public shouldEscalateToGamma(score: number): boolean {
    return this.riskEngine.shouldTriggerGamma(score);
  }

  /**
   * Get the underlying risk engine for configuration access.
   */
  public getRiskEngine(): RiskEngine {
    return this.riskEngine;
  }
}
