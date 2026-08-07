import React from "react";
import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 py-8 border-t bg-slate-950/80 border-slate-800/50 pointer-events-auto">
      <div className="flex flex-col items-center justify-between px-6 mx-auto max-w-7xl sm:flex-row">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <p className="text-sm text-slate-500">
            Built for The Last Mile Hackathon
          </p>
          <p className="text-sm text-slate-600">
            Powered by KeeperHub
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm transition-colors text-slate-500 hover:text-slate-300">
            <Github className="w-5 h-5" />
            <span>GitHub</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
