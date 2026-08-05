"use client";

import { useAppStore } from "../lib/store";
import {
  formatAddress,
  formatTime,
  getThreatEmoji,
  cn,
} from "../lib/utils";
import { Bell, Search, Brain, Zap, CheckCircle } from "lucide-react";

const TIMELINE_STEPS = [
  { key: "detected", icon: Bell, label: "Detected", color: "text-kg-info" },
  { key: "scoring", icon: Search, label: "Scored", color: "text-kg-info" },
  { key: "critiquing", icon: Brain, label: "Critiqued", color: "text-purple-400" },
  { key: "executing", icon: Zap, label: "Executed", color: "text-kg-warn" },
  { key: "confirmed", icon: CheckCircle, label: "Confirmed", color: "text-kg-safe" },
];

const STATUS_ORDER = ["detected", "scoring", "critiquing", "approved", "rejected", "executing", "confirmed", "failed"];

export function AuditTimeline() {
  const { threats } = useAppStore();

  // Only show events that went through the pipeline
  const timelineEntries = threats.filter(
    (t) => t.alphaDecision.riskScore > 50
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-kg-text">Audit Timeline</h2>
        <span className="text-xs text-kg-text-secondary font-mono">
          {timelineEntries.length} events
        </span>
      </div>

      <div className="space-y-6">
        {timelineEntries.map((entry, index) => {
          const statusIndex = STATUS_ORDER.indexOf(entry.status);
          return (
            <div
              key={entry.id}
              id={`audit-entry-${index}`}
              className="bg-kg-surface rounded-xl border border-kg-border p-6 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span>{getThreatEmoji(entry.alphaDecision.threatLevel)}</span>
                  <span className="font-mono text-sm text-kg-info">
                    {formatAddress(entry.event.txHash)}
                  </span>
                  <span className="text-xs text-kg-text-secondary">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-kg-text-secondary">
                  Score: {entry.alphaDecision.riskScore}/100
                </span>
              </div>

              {/* Timeline Steps */}
              <div className="flex items-center justify-between relative">
                {/* Connecting line */}
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-kg-border" />
                <div
                  className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-kg-info via-purple-400 to-kg-safe transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (statusIndex / (TIMELINE_STEPS.length - 1)) * 100)}%`,
                    maxWidth: "calc(100% - 40px)",
                  }}
                />

                {TIMELINE_STEPS.map((step, stepIndex) => {
                  const Icon = step.icon;
                  const isActive = statusIndex >= stepIndex;
                  const isCurrent = step.key === entry.status || 
                    (step.key === "confirmed" && entry.status === "confirmed") ||
                    (step.key === "critiquing" && ["approved", "rejected"].includes(entry.status));

                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center gap-2 relative z-10"
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                          isActive
                            ? `bg-kg-surface border-2 ${step.color} border-current`
                            : "bg-kg-elevated border-2 border-kg-border"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive ? step.color : "text-kg-text-secondary"
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isActive ? "text-kg-text" : "text-kg-text-secondary"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Details */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Alpha */}
                <div className="bg-kg-base rounded-lg p-4 border border-kg-border">
                  <h4 className="text-xs font-semibold text-kg-info uppercase tracking-wider mb-2">
                    Alpha
                  </h4>
                  <p className="text-sm text-kg-text-secondary">
                    Action: {entry.alphaDecision.proposedAction.replace(/_/g, " ")}
                  </p>
                  {entry.alphaDecision.triggeredHeuristics.map((h, i) => (
                    <span
                      key={i}
                      className="inline-block text-xs bg-kg-elevated px-2 py-0.5 rounded mt-1 mr-1 text-kg-text-secondary"
                    >
                      {h.name} +{h.score}
                    </span>
                  ))}
                </div>

                {/* Gamma */}
                <div className="bg-kg-base rounded-lg p-4 border border-kg-border">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    Gamma
                  </h4>
                  {entry.gammaCritique ? (
                    <>
                      <p className="text-sm">
                        {entry.gammaCritique.approve ? "✅" : "❌"}{" "}
                        <span className="text-kg-text-secondary">
                          {(entry.gammaCritique.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </p>
                      <p className="text-xs text-kg-text-secondary mt-1 line-clamp-2">
                        {entry.gammaCritique.reasoning}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-kg-text-secondary">
                      Not triggered (below threshold)
                    </p>
                  )}
                </div>

                {/* Execution */}
                <div className="bg-kg-base rounded-lg p-4 border border-kg-border">
                  <h4 className="text-xs font-semibold text-kg-warn uppercase tracking-wider mb-2">
                    Execution
                  </h4>
                  {entry.keeperhubTxHash ? (
                    <>
                      <p className="text-sm font-mono text-kg-info">
                        {formatAddress(entry.keeperhubTxHash, 6)}
                      </p>
                      <p className="text-xs text-kg-text-secondary mt-1">
                        Gas: {entry.gasUsed?.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-kg-text-secondary">
                      {entry.status === "rejected"
                        ? "Blocked by Gamma"
                        : entry.status === "executing"
                        ? "In progress..."
                        : "No execution needed"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {timelineEntries.length === 0 && (
          <div className="text-center py-20 text-kg-text-secondary">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No high-risk events to display</p>
            <p className="text-xs mt-1">Events with score &gt; 50 appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
