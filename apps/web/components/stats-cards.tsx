"use client";

import { Shield, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { useAppStore } from "../lib/store";

export function StatsCards() {
  const { stats, connectionStatus } = useAppStore();

  const cards = [
    {
      id: "stat-monitored",
      label: "Total Events",
      value: stats.totalEvents,
      icon: Shield,
      color: "text-v-info",
      bgColor: "bg-v-info/10",
      borderColor: "border-v-info/20",
    },
    {
      id: "stat-protected",
      label: "Protected",
      value: stats.protected,
      icon: ShieldCheck,
      color: "text-v-safe",
      bgColor: "bg-v-safe/10",
      borderColor: "border-v-safe/20",
    },
    {
      id: "stat-pending",
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-v-warn",
      bgColor: "bg-v-warn/10",
      borderColor: "border-v-warn/20",
    },
    {
      id: "stat-threats",
      label: "Active Threats",
      value: stats.monitored - stats.protected,
      icon: AlertTriangle,
      color: "text-v-danger",
      bgColor: "bg-v-danger/10",
      borderColor: "border-v-danger/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className={`
              relative overflow-hidden rounded-none border ${card.borderColor}
              bg-v-surface p-5 transition-all duration-300
              hover:border-opacity-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]
              animate-fade-in
            `}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background glow */}
            <div
              className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${card.bgColor} blur-2xl opacity-50`}
            />

            <div className="relative flex items-start gap-4">
              <div className={`${card.bgColor} p-3 rounded-none shrink-0`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-v-text-secondary font-medium">
                  {card.label}
                </p>
                <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
