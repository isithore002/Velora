"use client";

import { useAppStore } from "../lib/store";
import {
  formatAddress,
  formatTime,
  cn,
} from "../lib/utils";
import { Bell, Search, Brain, Zap, CheckCircle, XCircle } from "lucide-react";

const TIMELINE_STEPS = [
  { key: "detected", icon: Bell, label: "Detected", color: "text-v-info" },
  { key: "scoring", icon: Search, label: "Scored", color: "text-v-info" },
  { key: "critiquing", icon: Brain, label: "Critiqued", color: "text-purple-400" },
  { key: "executing", icon: Zap, label: "Executed", color: "text-v-warn" },
  { key: "confirmed", icon: CheckCircle, label: "Confirmed", color: "text-v-safe" },
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
        <h2 className="text-lg font-semibold text-v-text">Audit Timeline</h2>
        <span className="text-xs text-v-text-secondary font-mono">
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
              className="bg-v-surface/80 backdrop-blur-xl rounded-2xl border border-v-border p-6 animate-fade-in shadow-[0_0_20px_rgba(255,255,255,0.02)]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    entry.alphaDecision.riskScore >= 85 ? "bg-v-danger" :
                    entry.alphaDecision.riskScore >= 70 ? "bg-orange-400" :
                    entry.alphaDecision.riskScore >= 50 ? "bg-v-warn" : "bg-v-safe"
                  )} />
                  <span className="font-mono text-sm text-v-info">
                    {formatAddress(entry.event.txHash)}
                  </span>
                  <span className="text-xs text-v-text-secondary">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-v-text-secondary">
                  Score: {entry.alphaDecision.riskScore}/100
                </span>
              </div>

              {/* Timeline Steps */}
              <div className="flex items-center justify-between relative">
                {/* Connecting line */}
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-v-border" />
                <div
                  className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-v-info via-purple-400 to-v-safe transition-all duration-500"
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
                            ? `bg-v-surface border-2 ${step.color} border-current`
                            : "bg-v-elevated border-2 border-v-border"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive ? step.color : "text-v-text-secondary"
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isActive ? "text-v-text" : "text-v-text-secondary"
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
                {/* Warden */}
                <div className="bg-v-base rounded-lg p-4 border border-v-border">
                  <h4 className="text-xs font-semibold text-v-info uppercase tracking-wider mb-2">
                    Warden
                  </h4>
                  <p className="text-sm text-v-text-secondary">
                    Action: {entry.alphaDecision.proposedAction.replace(/_/g, " ")}
                  </p>
                  {entry.alphaDecision.triggeredHeuristics.map((h, i) => (
                    <span
                      key={i}
                      className="inline-block text-xs bg-v-elevated px-2 py-0.5 rounded mt-1 mr-1 text-v-text-secondary"
                    >
                      {h.name} +{h.score}
                    </span>
                  ))}
                </div>

                {/* Judge */}
                <div className="bg-v-base rounded-lg p-4 border border-v-border">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    Judge
                  </h4>
                  {entry.gammaCritique ? (
                    <>
                      <p className="flex items-center gap-1 text-sm">
                        {entry.gammaCritique.approve ? <CheckCircle className="w-4 h-4 text-v-safe" /> : <XCircle className="w-4 h-4 text-v-danger" />}
                        <span className="text-v-text-secondary">
                          {(entry.gammaCritique.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </p>
                      <p className="text-xs text-v-text-secondary mt-1 line-clamp-2">
                        {entry.gammaCritique.reasoning}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-v-text-secondary">
                      Not triggered (below threshold)
                    </p>
                  )}
                </div>

                {/* Execution */}
                <div className="bg-v-base rounded-lg p-4 border border-v-border">
                  <h4 className="text-xs font-semibold text-v-warn uppercase tracking-wider mb-2">
                    Execution
                  </h4>
                  {entry.keeperhubTxHash ? (
                    <>
                      <p className="text-sm font-mono text-v-info">
                        {formatAddress(entry.keeperhubTxHash, 6)}
                      </p>
                      <p className="text-xs text-v-text-secondary mt-1">
                        Gas: {entry.gasUsed?.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-v-text-secondary">
                      {entry.status === "rejected"
                        ? "Blocked by Judge"
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
          <div className="text-center py-20 text-v-text-secondary">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No high-risk events to display</p>
            <p className="text-xs mt-1">Events with score &gt; 50 appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
