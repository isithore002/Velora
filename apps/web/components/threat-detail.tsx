"use client";

import { X, ExternalLink, Shield, Brain, Zap } from "lucide-react";
import { useAppStore } from "../lib/store";
import {
  formatAddress,
  formatUSD,
  getThreatBadge,
  getThreatEmoji,
  cn,
} from "../lib/utils";

export function ThreatDetail() {
  const { selectedThreat, selectThreat } = useAppStore();

  if (!selectedThreat) return null;

  const entry = selectedThreat;
  const score = entry.alphaDecision.riskScore;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={() => selectThreat(null)}
      />

      {/* Slide-over Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-kg-surface border-l border-kg-border z-50 overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 glass border-b border-kg-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold",
                getThreatBadge(entry.alphaDecision.threatLevel)
              )}
            >
              {getThreatEmoji(entry.alphaDecision.threatLevel)}{" "}
              {entry.alphaDecision.threatLevel.toUpperCase()}
            </span>
            <span className="font-mono text-sm text-kg-text-secondary">
              {formatAddress(entry.event.txHash)}
            </span>
          </div>
          <button
            id="close-detail"
            onClick={() => selectThreat(null)}
            className="p-2 hover:bg-kg-elevated rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Risk Score Visual */}
          <div className="text-center py-6">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className="fill-none stroke-kg-border"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className={cn(
                    "fill-none",
                    score >= 85
                      ? "stroke-kg-danger"
                      : score >= 70
                      ? "stroke-orange-400"
                      : score >= 50
                      ? "stroke-kg-warn"
                      : "stroke-kg-safe"
                  )}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 352} 352`}
                />
              </svg>
              <span className="absolute text-4xl font-bold font-mono">
                {score}
              </span>
            </div>
            <p className="text-sm text-kg-text-secondary mt-2">Risk Score</p>
          </div>

          {/* Event Details */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-kg-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" /> Event Details
            </h3>
            <div className="bg-kg-base rounded-xl p-4 space-y-2 font-mono text-sm border border-kg-border">
              <DetailRow label="Tx Hash" value={entry.event.txHash} link />
              <DetailRow label="Chain" value={`${entry.event.chainId}`} />
              <DetailRow
                label="Contract"
                value={formatAddress(entry.event.contractAddress)}
              />
              {entry.event.spender && (
                <DetailRow
                  label="Spender"
                  value={formatAddress(entry.event.spender)}
                />
              )}
              {entry.event.usdValue !== undefined && (
                <DetailRow
                  label="USD Value"
                  value={formatUSD(entry.event.usdValue)}
                />
              )}
              {entry.event.functionName && (
                <DetailRow label="Function" value={entry.event.functionName} />
              )}
            </div>
          </section>

          {/* Alpha Analysis */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-kg-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-kg-info" /> Alpha Analysis
            </h3>
            <div className="bg-kg-base rounded-xl p-4 border border-kg-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-kg-text-secondary">
                  Proposed Action
                </span>
                <span className="text-sm font-semibold capitalize text-kg-text">
                  {entry.alphaDecision.proposedAction.replace(/_/g, " ")}
                </span>
              </div>

              {entry.alphaDecision.triggeredHeuristics.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-kg-text-secondary">
                    Triggered Heuristics:
                  </span>
                  {entry.alphaDecision.triggeredHeuristics.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-kg-elevated rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-kg-text">{h.name}</span>
                      <span className="text-xs font-bold text-kg-warn">
                        +{h.score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Gamma Critique */}
          {entry.gammaCritique && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-kg-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" /> Gamma Critique
              </h3>
              <div
                className={cn(
                  "rounded-xl p-4 border space-y-3",
                  entry.gammaCritique.approve
                    ? "bg-kg-safe/5 border-kg-safe/20"
                    : "bg-kg-danger/5 border-kg-danger/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {entry.gammaCritique.approve
                      ? "✅ APPROVED"
                      : "❌ REJECTED"}
                  </span>
                  <span className="text-sm font-mono text-kg-text-secondary">
                    {(entry.gammaCritique.confidence * 100).toFixed(0)}%
                    confidence
                  </span>
                </div>
                <p className="text-sm text-kg-text-secondary leading-relaxed">
                  {entry.gammaCritique.reasoning}
                </p>
                {entry.gammaCritique.overrideAlpha && (
                  <div className="bg-kg-warn/10 border border-kg-warn/30 rounded-lg px-3 py-2 text-xs text-kg-warn">
                    ⚠️ Gamma overrode Alpha's decision → {entry.gammaCritique.suggestedAction.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* KeeperHub Execution */}
          {entry.keeperhubTxHash && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-kg-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-kg-warn" /> KeeperHub Execution
              </h3>
              <div className="bg-kg-base rounded-xl p-4 border border-kg-border space-y-2 font-mono text-sm">
                <DetailRow
                  label="Tx Hash"
                  value={formatAddress(entry.keeperhubTxHash)}
                  link
                />
                <DetailRow
                  label="Gas Used"
                  value={`${entry.gasUsed?.toLocaleString()} gas`}
                />
                <DetailRow
                  label="Route"
                  value="Private (MEV protected)"
                />
                <DetailRow label="Status" value={entry.status.toUpperCase()} />
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-kg-text-secondary">{label}</span>
      <span className={cn("text-kg-text", link && "text-kg-info flex items-center gap-1")}>
        {value}
        {link && <ExternalLink className="w-3 h-3" />}
      </span>
    </div>
  );
}
