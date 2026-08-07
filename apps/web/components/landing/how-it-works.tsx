import React from "react";
import { ScanLine, BrainCircuit, Zap } from "lucide-react";

const steps = [
  {
    title: "Detect",
    description: "Alpha agent scans every transaction in real-time, scoring anomalies and threats before they are mined.",
    icon: ScanLine,
    color: "text-amber-500",
  },
  {
    title: "Critique",
    description: "Gamma agent challenges every alert. As a circuit breaker, it ensures false positives never trigger execution.",
    icon: BrainCircuit,
    color: "text-blue-500",
  },
  {
    title: "Execute",
    description: "KeeperHub executes protective transactions (e.g., revoking allowances) instantly upon Gamma's approval.",
    icon: Zap,
    color: "text-emerald-500",
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 py-24 px-4 mx-auto max-w-7xl pointer-events-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-50">
          The Two-Agent Pipeline
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          A robust architecture designed to eliminate false positives.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center p-8 text-center transition-colors border rounded-2xl bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-slate-600"
          >
            <step.icon className={`w-12 h-12 mb-6 ${step.color}`} />
            <h3 className="mb-3 text-xl font-semibold text-slate-50">{step.title}</h3>
            <p className="text-sm text-slate-400">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
