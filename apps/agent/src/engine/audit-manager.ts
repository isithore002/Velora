import Database from "better-sqlite3";
import type { AuditEntry, AuditLogger } from "@velora/core";
import { join } from "path";
import { mkdirSync } from "fs";

/**
 * SQLite backing store for the Velora AuditLogger.
 * Persists audit entries across agent restarts.
 */
export class SqliteAuditManager {
  private db: Database.Database;

  constructor(
    private readonly auditLogger: AuditLogger,
    dbPath: string = "data/audit.db"
  ) {
    // Ensure directory exists
    const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
    if (dir && dir !== dbPath) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initDb();
    this.sync();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_entries (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        tx_hash TEXT NOT NULL,
        data_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_entries(timestamp DESC);
    `);
  }

  /**
   * Load existing entries from DB into the AuditLogger, and subscribe to future updates.
   */
  private sync() {
    // 1. Load existing
    const rows = this.db.prepare("SELECT data_json FROM audit_entries ORDER BY timestamp DESC LIMIT 1000").all() as { data_json: string }[];
    
    const entries: AuditEntry[] = rows.map(r => JSON.parse(r.data_json));
    if (entries.length > 0) {
      this.auditLogger.importEntries(entries);
    }

    // 2. Listen for new/updated entries and save to DB
    const insertStmt = this.db.prepare(`
      INSERT INTO audit_entries (id, timestamp, status, risk_score, tx_hash, data_json)
      VALUES (@id, @timestamp, @status, @risk_score, @tx_hash, @data_json)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        data_json = excluded.data_json
    `);

    this.auditLogger.onUpdate((entry) => {
      insertStmt.run({
        id: entry.id,
        timestamp: entry.timestamp,
        status: entry.status,
        risk_score: entry.alphaDecision.riskScore,
        tx_hash: entry.event.txHash,
        data_json: JSON.stringify(entry),
      });
    });
  }

  public close() {
    this.db.close();
  }
}
