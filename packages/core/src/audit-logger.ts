import type {
  AuditEntry,
  AuditStatus,
  DetectedEvent,
  AlphaDecision,
  CritiqueResult,
  ProtectiveAction,
} from "./types";
import { randomUUID } from "crypto";

/** Callback for audit entry changes */
export type AuditListener = (entry: AuditEntry) => void;

/**
 * Manages the audit trail for all detection events.
 * In-memory storage with listener support for real-time dashboard updates.
 * Designed to be backed by SQLite in the agent runtime.
 */
export class AuditLogger {
  private readonly entries: Map<string, AuditEntry> = new Map();
  private readonly listeners: Set<AuditListener> = new Set();

  /**
   * Create a new audit entry when a threat is first detected.
   */
  public createEntry(
    event: DetectedEvent,
    alphaDecision: AlphaDecision
  ): AuditEntry {
    const entry: AuditEntry = {
      id: randomUUID(),
      event,
      alphaDecision,
      gammaCritique: null,
      finalAction: alphaDecision.proposedAction,
      keeperhubTxHash: null,
      gasUsed: null,
      status: "detected",
      timestamp: Date.now(),
      updatedAt: Date.now(),
    };

    this.entries.set(entry.id, entry);
    this.notify(entry);

    return entry;
  }

  /**
   * Update the audit entry with Gamma's critique result.
   */
  public addCritique(entryId: string, critique: CritiqueResult): AuditEntry {
    const entry = this.getEntry(entryId);

    entry.gammaCritique = critique;
    entry.status = critique.approve ? "approved" : "rejected";

    if (critique.overrideAlpha) {
      entry.finalAction = critique.suggestedAction;
    }

    entry.updatedAt = Date.now();
    this.notify(entry);

    return entry;
  }

  /**
   * Update the audit entry when execution begins.
   */
  public markExecuting(entryId: string): AuditEntry {
    const entry = this.getEntry(entryId);

    entry.status = "executing";
    entry.updatedAt = Date.now();
    this.notify(entry);

    return entry;
  }

  /**
   * Update the audit entry with KeeperHub execution result.
   */
  public markConfirmed(
    entryId: string,
    txHash: string,
    gasUsed: number
  ): AuditEntry {
    const entry = this.getEntry(entryId);

    entry.keeperhubTxHash = txHash;
    entry.gasUsed = gasUsed;
    entry.status = "confirmed";
    entry.updatedAt = Date.now();
    this.notify(entry);

    return entry;
  }

  /**
   * Mark an entry as failed.
   */
  public markFailed(entryId: string): AuditEntry {
    const entry = this.getEntry(entryId);

    entry.status = "failed";
    entry.updatedAt = Date.now();
    this.notify(entry);

    return entry;
  }

  /**
   * Update status to an arbitrary value.
   */
  public updateStatus(entryId: string, status: AuditStatus): AuditEntry {
    const entry = this.getEntry(entryId);

    entry.status = status;
    entry.updatedAt = Date.now();
    this.notify(entry);

    return entry;
  }

  /**
   * Get a single audit entry by ID.
   */
  public getEntry(id: string): AuditEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Audit entry not found: ${id}`);
    }
    return entry;
  }

  /**
   * Get all audit entries, optionally filtered by status.
   * Returns newest first.
   */
  public getEntries(filter?: { status?: AuditStatus; limit?: number }): AuditEntry[] {
    let entries = Array.from(this.entries.values());

    if (filter?.status) {
      entries = entries.filter((e) => e.status === filter.status);
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      entries = entries.slice(0, filter.limit);
    }

    return entries;
  }

  /**
   * Get total count of entries.
   */
  public getCount(): number {
    return this.entries.size;
  }

  /**
   * Subscribe to audit entry changes for real-time dashboard updates.
   */
  public onUpdate(listener: AuditListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Export all entries as an array (for serialization).
   */
  public exportAll(): AuditEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Import entries from external source (e.g., SQLite restore).
   */
  public importEntries(entries: AuditEntry[]): void {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private notify(entry: AuditEntry): void {
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // Don't let listener errors break the logger
      }
    }
  }
}
