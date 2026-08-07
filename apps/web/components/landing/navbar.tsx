import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-slate-950/50 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-emerald-500" />
        <span className="font-mono text-xl font-bold tracking-tight text-slate-50">Velora</span>
      </div>
      
      <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
        <Link href="#features" className="hover:text-slate-50 transition-colors">Features</Link>
        <Link href="#how-it-works" className="hover:text-slate-50 transition-colors">How It Works</Link>
        <Link href="#audit-trail" className="hover:text-slate-50 transition-colors">Audit Trail</Link>
        <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-50 transition-colors">GitHub</Link>
      </div>

      <div>
        <Link href="/threats">
          <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
            View Dashboard
          </Button>
        </Link>
      </div>
    </nav>
  );
}
