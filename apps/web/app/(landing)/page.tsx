import React from "react";
import { Scene } from "@components/landing/scene";
import { Navbar } from "@components/landing/navbar";
import { HeroSection } from "@components/landing/hero-section";
import { HowItWorks } from "@components/landing/how-it-works";
import { AuditPreview } from "@components/landing/audit-preview";
import { Footer } from "@components/landing/footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* 3D Background */}
      <Scene />

      {/* UI Layer */}
      <div className="relative z-10 w-full h-full text-slate-50">
        <Navbar />
        <HeroSection />
        <HowItWorks />
        <AuditPreview />
        <Footer />
      </div>
    </main>
  );
}
