// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  ThreatLevel,
  ProtectiveAction,
  AuditStatus,
  DetectedEvent,
  AlphaDecision,
  CritiqueResult,
  AuditEntry,
  WorkflowTrigger,
  WorkflowStep,
  WorkflowDefinition,
  ExecutionResult,
  HeuristicConfig,
  RiskEngineConfig,
  KnownProtocol,
} from "./types";

export {
  ThreatLevelSchema,
  ProtectiveActionSchema,
  AuditStatusSchema,
  DetectedEventSchema,
  AlphaDecisionSchema,
  CritiqueResultSchema,
  AuditEntrySchema,
  WorkflowTriggerSchema,
  WorkflowStepSchema,
  WorkflowDefinitionSchema,
  ExecutionResultSchema,
  HeuristicConfigSchema,
  RiskEngineConfigSchema,
  KnownProtocolSchema,
} from "./types";

// ─── Core Modules ────────────────────────────────────────────────────────────
export { RiskEngine, DEFAULT_CONFIG } from "./risk-engine";
export type { TriggeredHeuristic } from "./risk-engine";

export { ActionRegistry, resolveAction } from "./action-registry";
export type { OverrideRule } from "./action-registry";

export { AuditLogger } from "./audit-logger";
export type { AuditListener } from "./audit-logger";

export { KeeperHubClient } from "./keeperhub-client";
