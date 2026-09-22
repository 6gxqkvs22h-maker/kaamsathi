"use client";

import { useCallback, useEffect, useState } from "react";
import { customerHeaders, getCustomerToken, getWorkerToken } from "./clientAuth";

export type SessionWorker = {
  id: number;
  name: string;
  avatar: string;
  trade: string;
  skills: string;
  area: string;
  online: boolean;
  rating: number;
  ratingCount: number;
  jobsDone: number;
  experienceYears: number;
  baseRate: number;
  minRate: number;
  priceUnit: string;
  bio: string;
  phone: string;
  email: string;
  workTypes: string;
  availableDays: string;
  preferredHours: string;
  serviceAreas: string;
  languages: string;
  verified: boolean;
  verificationStatus: string;
  completion: number;
  canApply: boolean;
  missing: { key: string; label: string }[];
};

export type SessionAccount = {
  id: number;
  name: string;
  username: string;
  phone: string;
  email: string;
  area: string;
  avatar: string;
  businessName: string;
  businessDesc: string;
  serviceArea: string;
  verified: boolean;
};

export type Session = {
  signedIn: boolean;
  activeMode: "hire" | "worker";
  account: SessionAccount | null;
  worker: SessionWorker | null;
  hasWorkerProfile: boolean;
};

const authHeaders = () => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const c = getCustomerToken();
  const w = getWorkerToken();
  if (c) h["x-customer-token"] = c;
  if (w) h["x-worker-token"] = w;
  return h;
};

export { authHeaders };

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { headers: authHeaders() });
      const data = await res.json();
      setSession(data);
    } catch {
      setSession({
        signedIn: false,
        activeMode: "hire",
        account: null,
        worker: null,
        hasWorkerProfile: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const switchMode = useCallback(
    async (mode: "hire" | "worker") => {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: customerHeaders(),
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      await reload();
      return data as {
        activeMode?: string;
        needsWorkerSetup?: boolean;
        completion?: number;
        error?: string;
      };
    },
    [reload],
  );

  return { session, loading, reload, switchMode };
}
