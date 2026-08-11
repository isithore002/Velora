"use client";

import { useAppStore } from "../lib/store";
import { formatTime, getExplorerTxUrl, formatAddress } from "../lib/utils";
import { Terminal } from "lucide-react";

export function AuditTimeline() {
  const { threats } = useAppStore();

  // Only show events that went through the pipeline
  const timelineEntries = threats.filter(
    (t) => t.alphaDecision.riskScore > 50
  );

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex items-center justify-between p-3 border-b border-v-border bg-v-surface">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-v-text-secondary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-v-text">Terminal Output</h2>
        </div>
        <span className="text-xs text-v-text-secondary font-mono">
          {timelineEntries.length} events
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
        {timelineEntries.map((entry, index) => (
          <div key={entry.id} className="mb-4 space-y-1.5 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="text-v-text-secondary">
              <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
              <span className="text-v-info font-bold">system</span> &gt; EVENT_DETECTED:{" "}
              <a
                href={getExplorerTxUrl(entry.event.txHash, entry.event.chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-v-info hover:underline"
              >
                {formatAddress(entry.event.txHash, 8)}
              </a>
            </div>
            
            <div className="text-v-text-secondary">
              <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
              <span className="text-v-warn font-bold">warden</span> &gt; ANALYZING... SCORE: {entry.alphaDecision.riskScore}/100
            </div>
            
            <div className="text-v-text-secondary">
              <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
              <span className="text-v-warn font-bold">warden</span> &gt; PROPOSED_ACTION: {entry.alphaDecision.proposedAction}
            </div>

            {entry.gammaCritique && (
              <>
                <div className="text-v-text-secondary">
                  <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
                  <span className="text-purple-400 font-bold">judge</span> &gt; CRITIQUING...
                </div>
                <div className="text-v-text-secondary">
                  <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
                  <span className="text-purple-400 font-bold">judge</span> &gt; DECISION:{" "}
                  {entry.gammaCritique.approve ? (
                    <span className="text-v-safe">APPROVED</span>
                  ) : (
                    <span className="text-v-danger">REJECTED</span>
                  )}{" "}
                  ({(entry.gammaCritique.confidence * 100).toFixed(0)}% confidence)
                </div>
                <div className="text-v-text-secondary/60 pl-8 border-l-2 border-v-border ml-2 italic">
                  "{entry.gammaCritique.reasoning}"
                </div>
              </>
            )}

            {entry.keeperhubTxHash ? (
                <div className="text-v-text-secondary">
                  <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
                  <span className="text-v-safe font-bold">keeperhub</span> &gt; EXECUTION SUCCESS:{" "}
                  <a
                    href={getExplorerTxUrl(entry.keeperhubTxHash, entry.event.chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-v-safe hover:underline"
                  >
                    {formatAddress(entry.keeperhubTxHash, 8)}
                  </a>
                  {" "}(Gas: {entry.gasUsed})
                </div>
            ) : (
                entry.status === "rejected" ? (
                  <div className="text-v-text-secondary">
                    <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
                    <span className="text-v-danger font-bold">keeperhub</span> &gt; EXECUTION BLOCKED BY JUDGE
                  </div>
                ) : entry.status === "executing" ? (
                  <div className="text-v-text-secondary animate-pulse">
                    <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
                    <span className="text-v-warn font-bold">keeperhub</span> &gt; EXECUTING...
                  </div>
                ) : (
                  <div className="text-v-text-secondary">
                    <span className="text-v-text-secondary/50">[{formatTime(entry.timestamp)}]</span>{" "}
                    <span className="text-v-info font-bold">system</span> &gt; NO ACTION REQUIRED
                  </div>
                )
            )}
            
            <div className="text-v-border pt-2 pb-1">
              ----------------------------------------------------------------------
            </div>
          </div>
        ))}

        {timelineEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-v-text-secondary opacity-50 pt-20">
            <Terminal className="w-8 h-8 mb-4" />
            <p>Waiting for system events...</p>
          </div>
        )}
        
        {/* Blinking cursor */}
        {timelineEntries.length > 0 && (
           <div className="animate-pulse w-2 h-4 bg-v-text mt-2"></div>
        )}
      </div>
    </div>
  );
}
