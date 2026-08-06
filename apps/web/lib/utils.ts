import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ThreatLevel } from "@velora/core";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Get threat level color classes */
export function getThreatColor(level: ThreatLevel): string {
  switch (level) {
    case "critical":
      return "text-v-danger";
    case "high":
      return "text-orange-400";
    case "medium":
      return "text-v-warn";
    case "low":
      return "text-v-safe";
  }
}

/** Get threat level background classes */
export function getThreatBg(level: ThreatLevel): string {
  switch (level) {
    case "critical":
      return "bg-v-danger/10 border-v-danger/30";
    case "high":
      return "bg-orange-400/10 border-orange-400/30";
    case "medium":
      return "bg-v-warn/10 border-v-warn/30";
    case "low":
      return "bg-v-safe/10 border-v-safe/30";
  }
}

/** Get threat level badge classes */
export function getThreatBadge(level: ThreatLevel): string {
  switch (level) {
    case "critical":
      return "bg-v-danger/20 text-v-danger border border-v-danger/30";
    case "high":
      return "bg-orange-400/20 text-orange-400 border border-orange-400/30";
    case "medium":
      return "bg-v-warn/20 text-v-warn border border-v-warn/30";
    case "low":
      return "bg-v-safe/20 text-v-safe border border-v-safe/30";
  }
}

/** Format a wallet/tx address for display */
export function formatAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Format timestamp to relative or absolute time */
export function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Format a number as USD */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}
