"use client";

import { useAppStore } from "../lib/store";
import {
  formatAddress,
  formatTime,
  getThreatBadge,
  getExplorerTxUrl,
  cn,
} from "../lib/utils";
import {
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Bell,
  Search,
  Brain,
  Zap,
} from "lucide-react";

export function ThreatFeed() {
  const { threats, selectThreat } = useAppStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-v-text">Threat Feed</h2>
        <span className="text-xs text-v-text-secondary font-mono">
          {threats.length} events
        </span>
      </div>

      {/* Table */}
      <div className="rounded-none border border-v-border bg-v-surface overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)]">
        {/* Header */}
        <div className="grid grid-cols-[100px_140px_80px_100px_130px_120px_100px_60px] gap-2 px-4 py-3 bg-v-elevated/50 border-b border-v-border text-xs font-medium text-v-text-secondary uppercase tracking-wider">
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
        <div className="divide-y divide-v-border/50 max-h-[600px] overflow-y-auto">
          {threats.map((entry, index) => (
            <div
              key={entry.id}
              id={`threat-row-${index}`}
              onClick={() => selectThreat(entry)}
              className={cn(
                "grid grid-cols-[100px_140px_80px_100px_130px_120px_100px_60px] gap-2 px-4 py-3",
                "cursor-pointer transition-all duration-200",
                "hover:bg-v-elevated/50",
                "table-row-animate"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Time */}
              <span className="text-sm text-v-text-secondary font-mono">
                {formatTime(entry.timestamp)}
              </span>

              {/* Tx Hash */}
              <a
                href={getExplorerTxUrl(entry.event.txHash, entry.event.chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-v-info hover:text-v-info/80 hover:underline flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {formatAddress(entry.event.txHash, 4)}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>

              {/* Score */}
              <span
                className={cn(
                  "text-sm font-bold font-mono",
                  entry.alphaDecision.riskScore >= 85
                    ? "text-v-danger"
                    : entry.alphaDecision.riskScore >= 70
                    ? "text-orange-400"
                    : entry.alphaDecision.riskScore >= 50
                    ? "text-v-warn"
                    : "text-v-safe"
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
                  {entry.alphaDecision.threatLevel.charAt(0).toUpperCase() +
                    entry.alphaDecision.threatLevel.slice(1)}
                </span>
              </span>

              {/* Alpha Action */}
              <span className="text-sm text-v-text-secondary capitalize">
                {entry.alphaDecision.proposedAction.replace(/_/g, " ")}
              </span>

              {/* Gamma Verdict */}
              <span className="text-sm">
                {entry.gammaCritique ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      entry.gammaCritique.approve
                        ? "text-v-safe"
                        : "text-v-danger"
                    )}
                  >
                    {entry.gammaCritique.approve ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Approved</span>
                    ) : (
                      <span className="flex items-center gap-1"><XCircle className="w-4 h-4" /> Rejected</span>
                    )}
                  </span>
                ) : (
                  <span className="text-v-text-secondary">—</span>
                )}
              </span>

              {/* Status */}
              <span>
                <StatusBadge status={entry.status} />
              </span>

              {/* Arrow */}
              <span className="flex items-center justify-end">
                <ChevronRight className="w-4 h-4 text-v-text-secondary" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: any; className: string }> = {
    detected: { label: "Detected", icon: Bell, className: "text-v-info" },
    scoring: { label: "Scoring", icon: Search, className: "text-v-info" },
    critiquing: { label: "Critiquing", icon: Brain, className: "text-v-warn" },
    approved: { label: "Approved", icon: CheckCircle2, className: "text-v-safe" },
    rejected: { label: "Rejected", icon: XCircle, className: "text-v-text-secondary" },
    executing: { label: "Executing", icon: Zap, className: "text-v-warn animate-pulse" },
    confirmed: { label: "Confirmed", icon: CheckCircle2, className: "text-v-safe" },
    failed: { label: "Failed", icon: XCircle, className: "text-v-danger" },
  };

  const item = config[status] ?? { label: status, icon: Search, className: "text-v-text-secondary" };
  const Icon = item.icon;

  return (
    <span className={cn("text-xs font-medium flex items-center gap-1", item.className)}>
      <Icon className="w-3.5 h-3.5" />
      {item.label}
    </span>
  );
}
