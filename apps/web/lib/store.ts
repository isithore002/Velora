import { create } from "zustand";
import type { AuditEntry, ThreatLevel } from "@keeperguard/core";

/** Dashboard connection status */
type ConnectionStatus = "connected" | "disconnected" | "connecting";

/** Stats for the dashboard header */
interface DashboardStats {
  monitored: number;
  protected: number;
  pending: number;
  totalEvents: number;
}

/** Global application state */
interface AppState {
  // Threat data
  threats: AuditEntry[];
  selectedThreat: AuditEntry | null;

  // Connection
  connectionStatus: ConnectionStatus;
  lastPollTime: number | null;

  // Stats
  stats: DashboardStats;

  // Settings
  threshold: number;
  monitoredWallet: string;
  coldWallet: string;

  // Actions
  setThreats: (threats: AuditEntry[]) => void;
  addThreat: (threat: AuditEntry) => void;
  updateThreat: (id: string, updates: Partial<AuditEntry>) => void;
  selectThreat: (threat: AuditEntry | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setThreshold: (threshold: number) => void;
  setWallets: (monitored: string, cold: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  threats: [],
  selectedThreat: null,
  connectionStatus: "disconnected",
  lastPollTime: null,
  stats: { monitored: 0, protected: 0, pending: 0, totalEvents: 0 },
  threshold: 70,
  monitoredWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
  coldWallet: "0x0000000000000000000000000000000000C01D00",

  // Actions
  setThreats: (threats) => {
    set({
      threats,
      stats: computeStats(threats),
      lastPollTime: Date.now(),
    });
  },

  addThreat: (threat) => {
    const threats = [threat, ...get().threats];
    set({
      threats,
      stats: computeStats(threats),
      lastPollTime: Date.now(),
    });
  },

  updateThreat: (id, updates) => {
    const threats = get().threats.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({
      threats,
      stats: computeStats(threats),
    });
  },

  selectThreat: (threat) => set({ selectedThreat: threat }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setThreshold: (threshold) => set({ threshold }),

  setWallets: (monitored, cold) =>
    set({ monitoredWallet: monitored, coldWallet: cold }),
}));

function computeStats(threats: AuditEntry[]): DashboardStats {
  return {
    monitored: threats.length,
    protected: threats.filter((t) =>
      ["confirmed", "executing"].includes(t.status)
    ).length,
    pending: threats.filter((t) =>
      ["detected", "scoring", "critiquing", "approved"].includes(t.status)
    ).length,
    totalEvents: threats.length,
  };
}
