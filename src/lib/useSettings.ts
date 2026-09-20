"use client";

import { useEffect, useState } from "react";

export type ClientSettings = {
  city: string;
  currency: string;
  commissionPct: number;
  serviceFee: number;
  minOffer: number;
  maxOffer: number;
  maxRadiusKm: number;
  defaultRadiusKm: number;
  surgeMultiplier: number;
  commissionEnabled: boolean;
  requireWorkerApproval: boolean;
  autoBidEnabled: boolean;
  autoBidCount: number;
  minRatingToBid: number;
  tradeRates: Record<string, number>;
  disabledTrades: string;
  announcement: string;
  appName?: string;
  appTagline?: string;
  socialLinks?: Record<string, string>;
  emergencyHotlines?: Record<string, string>;
};

export function useSettings() {
  const [settings, setSettings] = useState<ClientSettings | null>(null);
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => setSettings(null));
  }, []);
  return settings;
}
