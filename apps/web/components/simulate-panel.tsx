"use client";

import { useState } from "react";
import { Play, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { cn, getThreatBadge, getThreatEmoji } from "../lib/utils";

type SimResult = {
  riskScore: number;
  threatLevel: "low" | "medium" | "high" | "critical";
  heuristics: Array<{ name: string; score: number; description: string }>;
  proposedAction: string;
  gammaApprove: boolean;
  gammaConfidence: number;
  gammaReasoning: string;
} | null;

export function SimulatePanel() {
  const [txHash, setTxHash] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimResult>(null);

  async function runSimulation() {
    if (!txHash.trim()) return;
    setIsRunning(true);
    setResult(null);

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 2000));

    // Generate a mock result based on the hash
    const hashNum = parseInt(txHash.slice(-4), 16) || 50;
    const score = Math.min(100, Math.max(10, hashNum % 100));

    const heuristics = [];
    if (score > 60) heuristics.push({ name: "UNLIMITED_APPROVAL", score: 40, description: "Approval amount equals MaxUint256" });
    if (score > 40) heuristics.push({ name: "UNKNOWN_SPENDER", score: 30, description: "Spender not in known protocol registry" });
    if (score > 70) heuristics.push({ name: "LARGE_AMOUNT", score: 20, description: "USD value exceeds $10,000" });
    if (score > 80) heuristics.push({ name: "NEW_CONTRACT", score: 25, description: "Contract deployed < 7 days ago" });

    setResult({
      riskScore: score,
      threatLevel: score >= 85 ? "critical" : score >= 70 ? "high" : score >= 50 ? "medium" : "low",
      heuristics,
      proposedAction: score >= 85 ? "sweep_funds" : score >= 70 ? "revoke_allowance" : "alert_only",
      gammaApprove: score > 70,
      gammaConfidence: 0.7 + Math.random() * 0.3,
      gammaReasoning: score > 70
        ? "Multiple threat indicators detected. The spender is not recognized and the approval amount is abnormally high. Recommend protective action."
        : "Risk level is moderate. This appears to be a standard DeFi interaction. Monitoring recommended.",
    });
    setIsRunning(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-kg-text">
          Threat Simulator
        </h2>
        <p className="text-sm text-kg-text-secondary mt-1">
          Paste a transaction hash to run it through the Alpha + Gamma pipeline
          without executing any actions.
        </p>
      </div>

      {/* Input */}
      <div className="bg-kg-surface rounded-xl border border-kg-border p-6 space-y-4">
        <label
          htmlFor="sim-tx-hash"
          className="text-sm font-medium text-kg-text-secondary"
        >
          Transaction Hash
        </label>
        <div className="flex gap-3">
          <input
            id="sim-tx-hash"
            type="text"
            placeholder="0x..."
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            className="flex-1 bg-kg-base border border-kg-border rounded-lg px-4 py-3 font-mono text-sm text-kg-text placeholder:text-kg-text-secondary/50 focus:outline-none focus:border-kg-info/50 focus:ring-1 focus:ring-kg-info/20 transition-all"
          />
          <button
            id="sim-run-btn"
            onClick={runSimulation}
            disabled={isRunning || !txHash.trim()}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all",
              "bg-kg-info text-white hover:bg-kg-info/90 disabled:opacity-40 disabled:cursor-not-allowed",
              "cursor-pointer"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </button>
        </div>

        {/* Quick-fill example */}
        <button
          onClick={() =>
            setTxHash(
              "0x3f8a92c1d4e5b6f7a8091234567890abcdef0123456789abcdef0123456789ab"
            )
          }
          className="text-xs text-kg-info/60 hover:text-kg-info transition-colors cursor-pointer"
        >
          Use example transaction ↗
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-kg-surface rounded-xl border border-kg-border p-6 space-y-6 animate-fade-in">
          {/* Score Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "text-5xl font-bold font-mono",
                  result.riskScore >= 85
                    ? "text-kg-danger"
                    : result.riskScore >= 70
                    ? "text-orange-400"
                    : result.riskScore >= 50
                    ? "text-kg-warn"
                    : "text-kg-safe"
                )}
              >
                {result.riskScore}
              </div>
              <div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold",
                    getThreatBadge(result.threatLevel)
                  )}
                >
                  {getThreatEmoji(result.threatLevel)} {result.threatLevel.toUpperCase()}
                </span>
                <p className="text-sm text-kg-text-secondary mt-1">
                  Proposed: {result.proposedAction.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-kg-text-secondary uppercase tracking-wider mb-3">
              Heuristic Breakdown
            </h3>
            <div className="space-y-2">
              {result.heuristics.length > 0 ? (
                result.heuristics.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-kg-base rounded-lg px-4 py-3 border border-kg-border"
                  >
                    <div>
                      <span className="text-sm font-medium text-kg-text">
                        {h.name}
                      </span>
                      <p className="text-xs text-kg-text-secondary">
                        {h.description}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-kg-warn font-mono">
                      +{h.score}
                    </span>
                  </div>
                ))
              ) : (
                <div className="bg-kg-base rounded-lg px-4 py-3 border border-kg-border text-sm text-kg-text-secondary">
                  No heuristics triggered
                </div>
              )}
            </div>
          </div>

          {/* Gamma Critique */}
          <div>
            <h3 className="text-sm font-semibold text-kg-text-secondary uppercase tracking-wider mb-3">
              Gamma Critique
            </h3>
            <div
              className={cn(
                "rounded-xl p-4 border",
                result.gammaApprove
                  ? "bg-kg-safe/5 border-kg-safe/20"
                  : "bg-kg-danger/5 border-kg-danger/20"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.gammaApprove ? (
                  <CheckCircle className="w-5 h-5 text-kg-safe" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-kg-danger" />
                )}
                <span className="text-sm font-semibold">
                  {result.gammaApprove
                    ? "Would APPROVE execution"
                    : "Would REJECT execution"}
                </span>
                <span className="text-xs text-kg-text-secondary font-mono ml-auto">
                  {(result.gammaConfidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="text-sm text-kg-text-secondary">
                {result.gammaReasoning}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
