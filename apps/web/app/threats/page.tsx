"use client";

import { useEffect, useState } from "react";
import { Shield, Activity, Search, Settings, Radio } from "lucide-react";
import Image from "next/image";
import { useAppStore } from "@lib/store";
import { ThreatFeed } from "@components/threat-feed";
import { AuditTimeline } from "@components/audit-timeline";
import { SimulatePanel } from "@components/simulate-panel";
import { SettingsPanel } from "@components/settings-panel";
import { StatsCards } from "@components/stats-cards";
import { ThreatDetail } from "@components/threat-detail";
import { AgentVisualization } from "@components/AgentVisualization";

type Tab = "threats" | "audit" | "simulate" | "settings";

const NAV_ITEMS: Array<{ id: Tab; label: string; icon: typeof Shield }> = [
  { id: "threats", label: "Threats", icon: Shield },
  { id: "audit", label: "Audit", icon: Activity },
  { id: "simulate", label: "Simulate", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("threats");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [latestEvent, setLatestEvent] = useState<any>(null);
  const { setThreats, connectionStatus, setConnectionStatus, selectedThreat } =
    useAppStore();

  // Connect to live agent via WebSockets
  useEffect(() => {
    setConnectionStatus("connecting");
    const socket = new WebSocket("ws://localhost:3001");
    setWs(socket);

    socket.onopen = () => {
      setConnectionStatus("connected");
    };

    socket.onclose = () => {
      setConnectionStatus("disconnected");
    };

    socket.onerror = () => {
      setConnectionStatus("disconnected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const store = useAppStore.getState();
        
        if (data.type === "INIT") {
          setThreats(data.entries);
        } else if (data.type === "UPDATE") {
          setLatestEvent(data.entry);
          const exists = store.threats.some((t) => t.id === data.entry.id);
          if (exists) {
            store.updateThreat(data.entry.id, data.entry);
          } else {
            store.addThreat(data.entry);
          }
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    return () => {
      socket.close();
    };
  }, [setThreats, setConnectionStatus]);

  const handleSimulateAttack = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "SIMULATE_ATTACK" }));
    }
  };

  const handleTestKeeperHub = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "SIMULATE_TRUE_THREAT" }));
    }
  };

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
            
            <div className="flex gap-2">
              <button
                onClick={handleSimulateAttack}
                className="bg-v-surface hover:bg-v-elevated text-v-text px-3 py-1 rounded text-xs font-bold tracking-wider uppercase border border-v-border transition-colors"
              >
                Random Event
              </button>
              <button
                onClick={handleTestKeeperHub}
                className="bg-v-danger hover:bg-v-danger/80 text-white px-3 py-1 rounded text-xs font-bold tracking-wider uppercase transition-colors"
              >
                Test KeeperHub
              </button>
            </div>

            <div className="h-6 w-px bg-v-border" />

            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Velora Logo" width={28} height={28} className="object-contain" />
              <h1 className="text-2xl font-extrabold tracking-tight text-v-text">
                Velora
              </h1>
            </div>
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
                        ? "bg-v-elevated border-v-border text-v-text shadow-sm"
                        : "border-transparent text-v-text-secondary hover:text-v-text hover:bg-v-surface"
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
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-6 relative z-10 flex flex-col gap-6">
        
        {/* 3D Visualization */}
        <AgentVisualization currentEvent={latestEvent} />

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
