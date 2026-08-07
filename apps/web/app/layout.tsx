import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Velora — Anomaly Detection Agent",
  description:
    "AI-powered anomaly detection and protective execution agent for crypto wallets. Powered by KeeperHub.",
  keywords: ["velora", "keeper", "crypto", "wallet", "security", "anomaly", "detection"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} bg-v-base text-v-text antialiased min-h-screen font-mono uppercase`}>
        {children}
      </body>
    </html>
  );
}
