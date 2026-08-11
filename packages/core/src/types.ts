import { z } from "zod";

// ─── Enums & Literals ────────────────────────────────────────────────────────

/** Threat severity classification */
export const ThreatLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type ThreatLevel = z.infer<typeof ThreatLevelSchema>;

/** Available protective actions that KeeperHub can execute */
export const ProtectiveActionSchema = z.enum([
  "revoke_allowance",
  "sweep_funds",
  "pause_contract",
  "alert_only",
]);
export type ProtectiveAction = z.infer<typeof ProtectiveActionSchema>;

/** Status of an audit entry through the pipeline */
export const AuditStatusSchema = z.enum([
  "detected",
  "scoring",
  "critiquing",
  "approved",
  "rejected",
  "executing",
  "confirmed",
  "failed",
]);
export type AuditStatus = z.infer<typeof AuditStatusSchema>;

// ─── Core Event Types ────────────────────────────────────────────────────────

/** A blockchain event detected by the monitoring system */
export const DetectedEventSchema = z.object({
  /** Transaction hash on the source chain */
  txHash: z.string(),
  /** Chain ID (e.g., 1 for Ethereum, 8453 for Base) */
  chainId: z.number(),
  /** Contract address involved in the transaction */
  contractAddress: z.string(),
  /** Spender address (for approval events) */
  spender: z.string().optional(),
  /** Token amount in raw units */
  amount: z.string().optional(),
  /** USD value of the transaction */
  usdValue: z.number().optional(),
  /** 4-byte function selector */
  functionSelector: z.string().optional(),
  /** Human-readable function name if decoded */
  functionName: z.string().optional(),
  /** Risk score assigned by Alpha (0-100) */
  riskScore: z.number().min(0).max(100).default(0),
  /** When the event was detected */
  timestamp: z.number(),
  /** Contract deployment timestamp (for age-based heuristics) */
  contractDeployedAt: z.number().optional(),
  /** Raw event data for debugging */
  rawData: z.unknown().optional(),
});
export type DetectedEvent = z.infer<typeof DetectedEventSchema>;

// ─── Alpha Decision ──────────────────────────────────────────────────────────

/** Alpha agent's analysis result */
export const AlphaDecisionSchema = z.object({
  /** Risk score 0-100 */
  riskScore: z.number().min(0).max(100),
  /** Classified threat level */
  threatLevel: ThreatLevelSchema,
  /** Which heuristics triggered and their individual scores */
  triggeredHeuristics: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      description: z.string(),
    })
  ),
  /** Proposed protective action */
  proposedAction: ProtectiveActionSchema,
  /** Timestamp of the analysis */
  timestamp: z.number(),
});
export type AlphaDecision = z.infer<typeof AlphaDecisionSchema>;

// ─── Gamma Critique ──────────────────────────────────────────────────────────

/** Gamma agent's critique of Alpha's decision */
export const CritiqueResultSchema = z.object({
  /** Whether Gamma approves the proposed action */
  approve: z.boolean(),
  /** Confidence level 0-1 */
  confidence: z.number().min(0).max(1),
  /** Reasoning for the decision */
  reasoning: z.string(),
  /** Gamma's suggested action (may differ from Alpha) */
  suggestedAction: ProtectiveActionSchema,
  /** Whether Gamma is overriding Alpha's decision */
  overrideAlpha: z.boolean(),
});
export type CritiqueResult = z.infer<typeof CritiqueResultSchema>;

// ─── Audit Trail ─────────────────────────────────────────────────────────────

/** Complete audit entry for a single detection event */
export const AuditEntrySchema = z.object({
  /** Unique identifier for this audit entry */
  id: z.string(),
  /** The original detected event */
  event: DetectedEventSchema,
  /** Alpha agent's decision */
  alphaDecision: AlphaDecisionSchema,
  /** Gamma agent's critique (null if score below threshold) */
  gammaCritique: CritiqueResultSchema.nullable(),
  /** Final action taken after Alpha + Gamma pipeline */
  finalAction: ProtectiveActionSchema,
  /** KeeperHub execution transaction hash */
  keeperhubTxHash: z.string().nullable(),
  /** Gas used for the protective transaction */
  gasUsed: z.number().nullable(),
  /** Current status in the pipeline */
  status: AuditStatusSchema,
  /** When this audit entry was created */
  timestamp: z.number(),
  /** When this audit entry was last updated */
  updatedAt: z.number(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

// ─── KeeperHub Types ─────────────────────────────────────────────────────────

/** KeeperHub workflow trigger type */
export const WorkflowTriggerSchema = z.enum(["webhook", "cron", "manual"]);
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;

/** A step in a KeeperHub workflow */
export const WorkflowStepSchema = z.object({
  action: z.string(),
  params: z.record(z.unknown()),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

/** KeeperHub workflow definition */
export const WorkflowDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  trigger: WorkflowTriggerSchema,
  chain: z.string(),
  steps: z.array(WorkflowStepSchema),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

/** KeeperHub workflow execution result */
export const ExecutionResultSchema = z.object({
  executionId: z.string(),
  workflowId: z.string(),
  txHash: z.string().nullable(),
  /** PR #1990: contract-call now returns transactionHash and transactionLink */
  transactionLink: z.string().nullable().optional(),
  status: z.enum(["pending", "success", "failed", "simulated"]),
  gasUsed: z.number().nullable(),
  timestamp: z.number(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// ─── Configuration ───────────────────────────────────────────────────────────

/** Heuristic configuration for the risk engine */
export const HeuristicConfigSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  weight: z.number().min(0).max(100),
  description: z.string(),
});
export type HeuristicConfig = z.infer<typeof HeuristicConfigSchema>;

/** Complete risk engine configuration */
export const RiskEngineConfigSchema = z.object({
  heuristics: z.array(HeuristicConfigSchema),
  /** Score threshold to trigger Gamma critique */
  gammaThreshold: z.number().min(0).max(100).default(70),
  /** Protocol-specific score overrides */
  protocolOverrides: z
    .record(z.number())
    .default({}),
});
export type RiskEngineConfig = z.infer<typeof RiskEngineConfigSchema>;

/** Known DeFi protocol entry */
export const KnownProtocolSchema = z.object({
  name: z.string(),
  addresses: z.record(z.array(z.string())),
  category: z.enum(["dex", "lending", "bridge", "yield", "nft", "other"]),
  trusted: z.boolean(),
});
export type KnownProtocol = z.infer<typeof KnownProtocolSchema>;
