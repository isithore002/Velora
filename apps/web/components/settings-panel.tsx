"use client";

import { useState } from "react";
import { useAppStore } from "../lib/store";
import { Check, Wifi, WifiOff } from "lucide-react";
import { cn } from "../lib/utils";

const HEURISTICS = [
  { name: "UNLIMITED_APPROVAL", defaultWeight: 40, description: "Flag unlimited token approvals (MaxUint256)" },
  { name: "UNKNOWN_SPENDER", defaultWeight: 30, description: "Flag spenders not in known protocol registry" },
  { name: "LARGE_AMOUNT", defaultWeight: 20, description: "Flag transactions exceeding $10,000 USD" },
  { name: "NEW_CONTRACT", defaultWeight: 25, description: "Flag contracts deployed less than 7 days ago" },
  { name: "SUSPICIOUS_FUNCTION", defaultWeight: 50, description: "Flag known exploit function signatures" },
];

export function SettingsPanel() {
  const { threshold, setThreshold, monitoredWallet, coldWallet, setWallets, connectionStatus } = useAppStore();
  const [localThreshold, setLocalThreshold] = useState(threshold);
  const [localMonitored, setLocalMonitored] = useState(monitoredWallet);
  const [localCold, setLocalCold] = useState(coldWallet);
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(HEURISTICS.map((h) => [h.name, h.defaultWeight]))
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setThreshold(localThreshold);
    setWallets(localMonitored, localCold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-semibold text-v-text">Configuration</h2>

      {/* Connection Status */}
      <div className="bg-v-surface rounded-xl border border-v-border p-5">
        <h3 className="text-sm font-semibold text-v-text-secondary uppercase tracking-wider mb-4">
          KeeperHub Connection
        </h3>
        <div className="flex items-center gap-3">
          {connectionStatus === "connected" ? (
            <Wifi className="w-5 h-5 text-v-safe" />
          ) : (
            <WifiOff className="w-5 h-5 text-v-danger" />
          )}
          <span className="text-sm text-v-text">
            {connectionStatus === "connected"
              ? "Connected (Mock Mode)"
              : "Disconnected"}
          </span>
          <span className="text-xs text-v-text-secondary ml-auto font-mono">
            Base (Chain ID: 8453)
          </span>
        </div>
      </div>

      {/* Threshold */}
      <div className="bg-v-surface rounded-xl border border-v-border p-5">
        <h3 className="text-sm font-semibold text-v-text-secondary uppercase tracking-wider mb-4">
          Gamma Threshold
        </h3>
        <p className="text-xs text-v-text-secondary mb-4">
          Events with risk scores above this threshold trigger the Gamma critique agent.
        </p>
        <div className="flex items-center gap-4">
          <input
            id="settings-threshold"
            type="range"
            min={0}
            max={100}
            value={localThreshold}
            onChange={(e) => setLocalThreshold(Number((e.target as HTMLInputElement).value))}
            className="flex-1 h-2 bg-v-border rounded-full appearance-none cursor-pointer accent-v-info"
          />
          <span className="text-2xl font-bold font-mono text-v-text w-16 text-right">
            {localThreshold}
          </span>
        </div>
        <div className="flex justify-between text-xs text-v-text-secondary mt-1">
          <span>Alert only</span>
          <span>Aggressive protection</span>
        </div>
      </div>

      {/* Heuristic Weights */}
      <div className="bg-v-surface rounded-xl border border-v-border p-5">
        <h3 className="text-sm font-semibold text-v-text-secondary uppercase tracking-wider mb-4">
          Heuristic Weights
        </h3>
        <div className="space-y-4">
          {HEURISTICS.map((h) => (
            <div key={h.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-v-text">
                    {h.name}
                  </span>
                  <p className="text-xs text-v-text-secondary">
                    {h.description}
                  </p>
                </div>
                <span className="text-lg font-bold font-mono text-v-warn w-12 text-right">
                  +{weights[h.name]}
                </span>
              </div>
              <input
                id={`weight-${h.name}`}
                type="range"
                min={0}
                max={100}
                value={weights[h.name]}
                onChange={(e) =>
                  setWeights((prev) => ({
                    ...prev,
                    [h.name]: Number((e.target as HTMLInputElement).value),
                  }))
                }
                className="w-full h-1.5 bg-v-border rounded-full appearance-none cursor-pointer accent-v-warn"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Wallet Addresses */}
      <div className="bg-v-surface rounded-xl border border-v-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-v-text-secondary uppercase tracking-wider">
          Wallet Addresses
        </h3>
        <div>
          <label
            htmlFor="settings-monitored"
            className="text-xs text-v-text-secondary"
          >
            Monitored Wallet
          </label>
          <input
            id="settings-monitored"
            type="text"
            value={localMonitored}
            onChange={(e) => setLocalMonitored((e.target as HTMLInputElement).value)}
            className="w-full mt-1 bg-v-base border border-v-border rounded-lg px-4 py-2.5 font-mono text-sm text-v-text focus:outline-none focus:border-v-info/50"
          />
        </div>
        <div>
          <label
            htmlFor="settings-cold"
            className="text-xs text-v-text-secondary"
          >
            Cold Wallet (sweep destination)
          </label>
          <input
            id="settings-cold"
            type="text"
            value={localCold}
            onChange={(e) => setLocalCold((e.target as HTMLInputElement).value)}
            className="w-full mt-1 bg-v-base border border-v-border rounded-lg px-4 py-2.5 font-mono text-sm text-v-text focus:outline-none focus:border-v-info/50"
          />
        </div>
      </div>

      {/* Save */}
      <button
        id="settings-save-btn"
        onClick={handleSave}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer",
          saved
            ? "bg-v-safe text-white"
            : "bg-v-info text-white hover:bg-v-info/90"
        )}
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : (
          "Save Configuration"
        )}
      </button>
    </div>
  );
}
