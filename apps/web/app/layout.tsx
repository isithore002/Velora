import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-kg-base text-kg-text antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
