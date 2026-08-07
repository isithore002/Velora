"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThreatCounter } from "./threat-counter";

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-20 text-center pointer-events-auto">
      <motion.h1 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-4xl font-extrabold tracking-tight md:text-7xl text-slate-50 font-sans"
      >
        Your Wallet's Last Line of Defense
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="max-w-2xl mt-6 text-xl text-slate-400"
      >
        AI agents that detect threats and execute protective transactions via KeeperHub — before your funds disappear.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="flex flex-col gap-4 mt-8 sm:flex-row"
      >
        <Link href="/threats">
          <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
            Explore the Dashboard
          </Button>
        </Link>
        <Link href="https://docs.keeperhub.com" target="_blank" rel="noopener noreferrer">
          <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-slate-300">
            Read the Docs
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <ThreatCounter />
      </motion.div>
    </section>
  );
}
