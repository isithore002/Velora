"use client";

import { useEffect, useState } from "react";
import { Shield, Activity, Search, Settings, Radio } from "lucide-react";
import { useAppStore } from "../lib/store";
import { generateMockThreats } from "../lib/mock-data";
import { ThreatFeed } from "../components/threat-feed";
import { AuditTimeline } from "../components/audit-timeline";
import { SimulatePanel } from "../components/simulate-panel";
import { SettingsPanel } from "../components/settings-panel";
import { StatsCards } from "../components/stats-cards";
import { ThreatDetail } from "../components/threat-detail";

type Tab = "threats" | "audit" | "simulate" | "settings";

const NAV_ITEMS: Array<{ id: Tab; label: string; icon: typeof Shield }> = [
  { id: "threats", label: "Threats", icon: Shield },
  { id: "audit", label: "Audit", icon: Activity },
  { id: "simulate", label: "Simulate", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("threats");
  const { setThreats, connectionStatus, setConnectionStatus, selectedThreat } =
    useAppStore();

  // Load mock data on mount
  useEffect(() => {
    const mockThreats = generateMockThreats(12);
    setThreats(mockThreats);
    setConnectionStatus("connected");

    // Simulate live updates every 15 seconds
    const interval = setInterval(() => {
      const newThreats = generateMockThreats(1);
      const store = useAppStore.getState();
      store.addThreat(newThreats[0]!);
    }, 15000);

    return () => clearInterval(interval);
  }, [setThreats, setConnectionStatus]);

  return (
    <div className="min-h-screen bg-v-base flex flex-col relative overflow-hidden">
      <div className="ambient-glow"></div>
      {/* Top Navigation Bar */}
      <header className="glass sticky top-0 z-50 border-b border-v-border/50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo + Live Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio
                  className={`w-4 h-4 ${
                    connectionStatus === "connected"
                      ? "text-v-danger"
                      : "text-v-text-secondary"
                  }`}
                />
                {connectionStatus === "connected" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-v-danger rounded-full live-pulse" />
                )}
              </div>
              <span className="text-xs font-medium text-v-text-secondary uppercase tracking-wider">
                {connectionStatus === "connected" ? "LIVE" : "OFFLINE"}
              </span>
            </div>

            <div className="h-6 w-px bg-v-border" />

            <h1 className="text-2xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-v-accent to-v-info bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                Velora
              </span>
            </h1>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium
                    transition-all duration-300 cursor-pointer border
                    ${
                      isActive
                        ? "bg-v-elevated border-white/20 text-v-text shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                        : "border-transparent text-v-text-secondary hover:text-v-text hover:bg-v-surface hover:border-white/10"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Status */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-v-text-secondary font-mono">
              Chain: Base (8453)
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-v-safe" : "bg-v-danger"
              }`}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-6 relative z-10">
        {/* Stats Cards (always visible) */}
        <StatsCards />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "threats" && <ThreatFeed />}
          {activeTab === "audit" && <AuditTimeline />}
          {activeTab === "simulate" && <SimulatePanel />}
          {activeTab === "settings" && <SettingsPanel />}
        </div>
      </main>

      {/* Threat Detail Slide-Over */}
      {selectedThreat && <ThreatDetail />}
    </div>
  );
}
