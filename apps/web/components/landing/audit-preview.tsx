"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const terminalLines = [
  { time: "22:01:14", text: 'Alpha: Threat detected on 0x7a3...b2f (Score: 92/100)', color: "text-amber-400" },
  { time: "22:01:15", text: 'Gamma: Critiquing... "Unlimited USDC approval to unknown spender"', color: "text-blue-400" },
  { time: "22:01:16", text: 'Gamma: ✅ APPROVED — Executing revocation', color: "text-emerald-400" },
  { time: "22:01:18", text: 'KeeperHub: Tx confirmed — 0x8d...3e2 (Gas: 45,231)', color: "text-slate-300" },
];

export function AuditPreview() {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  useEffect(() => {
    let step = 0;
    
    const tick = () => {
      step++;
      if (step <= terminalLines.length) {
        setVisibleLines(step);
      } else if (step === terminalLines.length + 3) {
        // Pause for 3 ticks after completion, then reset
        setVisibleLines(0);
        step = 0;
      }
    };

    const interval = setInterval(tick, 1000); // 1 tick per second
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="audit-trail" className="relative z-10 py-24 px-4 mx-auto max-w-4xl pointer-events-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-50">
          Live Audit Trail
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Transparent, verifiable execution logs.
        </p>
      </div>

      <div className="w-full p-4 overflow-hidden border shadow-2xl rounded-xl bg-slate-900 border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
          <span className="ml-2 text-xs text-slate-500 font-mono">agent-runtime ~ zsh</span>
        </div>
        
        <div className="font-mono text-sm leading-relaxed sm:text-base min-h-[140px]">
          <AnimatePresence>
            {terminalLines.slice(0, visibleLines).map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-2"
              >
                <span className="text-slate-500 mr-3">[{line.time}]</span>
                <span className={line.color}>{line.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.div
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="inline-block w-2 h-4 ml-1 align-middle bg-slate-400"
          />
        </div>
      </div>
    </section>
  );
}
