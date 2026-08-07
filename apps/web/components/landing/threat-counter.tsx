import React, { useEffect, useState } from "react";

export function ThreatCounter() {
  const [count, setCount] = useState(12847);

  useEffect(() => {
    // Simulate live threats being neutralized
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 mt-8 border rounded-full bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <div className="relative flex items-center justify-center w-2 h-2">
        <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400"></span>
        <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
      </div>
      <span className="text-sm font-medium text-slate-300">
        <strong className="text-slate-50">{count.toLocaleString()}</strong> threats neutralized
      </span>
    </div>
  );
}
