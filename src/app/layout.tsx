import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "KaamSathi — Kathmandu instant services marketplace",
  description:
    "Find electricians, plumbers, painters, mechanics, gardeners, masons and helpers near you in Kathmandu Valley. Live map, ratings, name your price.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
