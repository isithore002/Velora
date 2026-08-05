"use client";

import { useAppStore } from "../lib/store";
import {
  formatAddress,
  formatTime,
  getThreatBadge,
  getThreatEmoji,
  cn,
} from "../lib/utils";
import { ExternalLink, Eye, ChevronRight } from "lucide-react";

export function ThreatFeed() {
  const { threats, selectThreat } = useAppStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-kg-text">Threat Feed</h2>
        <span className="text-xs text-kg-text-secondary font-mono">
          {threats.length} events
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-kg-border bg-kg-surface overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[100px_140px_80px_100px_130px_120px_100px_60px] gap-2 px-4 py-3 bg-kg-elevated/50 border-b border-kg-border text-xs font-medium text-kg-text-secondary uppercase tracking-wider">
          <span>Time</span>
          <span>Tx Hash</span>
          <span>Score</span>
          <span>Level</span>
          <span>Alpha Action</span>
          <span>Gamma</span>
          <span>Status</span>
          <span></span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-kg-border/50 max-h-[600px] overflow-y-auto">
          {threats.map((entry, index) => (
            <div
              key={entry.id}
              id={`threat-row-${index}`}
              onClick={() => selectThreat(entry)}
              className={cn(
                "grid grid-cols-[100px_140px_80px_100px_130px_120px_100px_60px] gap-2 px-4 py-3",
                "cursor-pointer transition-all duration-200",
                "hover:bg-kg-elevated/50",
                "table-row-animate"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Time */}
              <span className="text-sm text-kg-text-secondary font-mono">
                {formatTime(entry.timestamp)}
              </span>

              {/* Tx Hash */}
              <span className="text-sm font-mono text-kg-info hover:underline flex items-center gap-1">
                {formatAddress(entry.event.txHash, 4)}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </span>

              {/* Score */}
              <span
                className={cn(
                  "text-sm font-bold font-mono",
                  entry.alphaDecision.riskScore >= 85
                    ? "text-kg-danger"
                    : entry.alphaDecision.riskScore >= 70
                    ? "text-orange-400"
                    : entry.alphaDecision.riskScore >= 50
                    ? "text-kg-warn"
                    : "text-kg-safe"
                )}
              >
                {entry.alphaDecision.riskScore}/100
              </span>

              {/* Level */}
              <span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    getThreatBadge(entry.alphaDecision.threatLevel)
                  )}
                >
                  {getThreatEmoji(entry.alphaDecision.threatLevel)}
                  {entry.alphaDecision.threatLevel.charAt(0).toUpperCase() +
                    entry.alphaDecision.threatLevel.slice(1)}
                </span>
              </span>

              {/* Alpha Action */}
              <span className="text-sm text-kg-text-secondary capitalize">
                {entry.alphaDecision.proposedAction.replace(/_/g, " ")}
              </span>

              {/* Gamma Verdict */}
              <span className="text-sm">
                {entry.gammaCritique ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      entry.gammaCritique.approve
                        ? "text-kg-safe"
                        : "text-kg-danger"
                    )}
                  >
                    {entry.gammaCritique.approve ? "✅ Approved" : "❌ Rejected"}
                  </span>
                ) : (
                  <span className="text-kg-text-secondary">—</span>
                )}
              </span>

              {/* Status */}
              <span>
                <StatusBadge status={entry.status} />
              </span>

              {/* Arrow */}
              <span className="flex items-center justify-end">
                <ChevronRight className="w-4 h-4 text-kg-text-secondary" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    detected: { label: "🔔 Detected", className: "text-kg-info" },
    scoring: { label: "🔍 Scoring", className: "text-kg-info" },
    critiquing: { label: "🧠 Critiquing", className: "text-kg-warn" },
    approved: { label: "✅ Approved", className: "text-kg-safe" },
    rejected: { label: "🚫 Rejected", className: "text-kg-text-secondary" },
    executing: { label: "⚡ Executing", className: "text-kg-warn animate-pulse" },
    confirmed: { label: "✅ Confirmed", className: "text-kg-safe" },
    failed: { label: "❌ Failed", className: "text-kg-danger" },
  };

  const item = config[status] ?? { label: status, className: "text-kg-text-secondary" };

  return (
    <span className={cn("text-xs font-medium", item.className)}>
      {item.label}
    </span>
  );
}
