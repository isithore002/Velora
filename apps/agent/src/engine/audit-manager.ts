// import Database from "better-sqlite3";
import type { AuditEntry, AuditLogger } from "@velora/core";
// import { join } from "path";
// import { mkdirSync } from "fs";

/**
 * SQLite backing store for the Velora AuditLogger.
 * Persists audit entries across agent restarts.
 * 
 * NOTE: Temporarily mocked in-memory because better-sqlite3 
 * native bindings are segfaulting on this specific OS/Node architecture.
 */
export class SqliteAuditManager {
  // private db: Database.Database;
  private entries: Record<string, string> = {};

  constructor(
    private readonly auditLogger: AuditLogger,
    dbPath: string = "data/audit.db"
  ) {
    this.sync();
  }

  private initDb() {
    // No-op
  }

  /**
   * Load existing entries from DB into the AuditLogger, and subscribe to future updates.
   */
  private sync() {
    // 2. Listen for new/updated entries and save to DB
    this.auditLogger.onUpdate((entry) => {
      this.entries[entry.id] = JSON.stringify(entry);
    });
  }

  public close() {
    // No-op
  }
}
