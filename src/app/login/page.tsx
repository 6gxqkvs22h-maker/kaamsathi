"use client";

import { useState } from "react";
import Link from "next/link";
import {
  setAdminToken,
  setCustomerToken,
  setWorkerToken,
} from "@/lib/clientAuth";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  // Quick-fill helpers for the demo accounts.
  const fillDemo = (kind: "customer" | "worker" | "admin") => {
    setError("");
    if (kind === "customer") {
      setUsername("customer");
      setPassword("customer123");
      setIdentifier("");
    } else if (kind === "worker") {
      setIdentifier("9800000001");
      setUsername("");
      setPassword("");
    } else {
      setIdentifier("admin123");
      setUsername("");
      setPassword("");
    }
  };

  const submitCustomer = async () => {
    setError("");
    setHint("");
    if (!username.trim() || !password) {
      setError("Type your username and password to sign in as customer.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: username.trim(),
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      if (data.role !== "customer") {
        setError(`That account is a ${data.role}. Use the single-field box below for workers/admin.`);
        return;
      }
      if (data.token) setCustomerToken(data.token);
      window.location.href = `/?ct=${encodeURIComponent(data.token ?? "")}`;
    } catch {
      setError("Network problem — try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError("");
    setHint("");
    const value = identifier.trim();
    if (!value) {
      setError("Enter your mobile number or admin passcode.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not sign you in.");
        return;
      }

      if (data.role === "admin") {
        if (data.token) setAdminToken(data.token);
        window.location.href = `/admin?t=${encodeURIComponent(data.token ?? "")}`;
        return;
      }
      if (data.role === "worker") {
        if (data.token) setWorkerToken(data.token);
        window.location.href = `/worker?t=${encodeURIComponent(data.token ?? "")}`;
        return;
      }
      if (data.role === "customer") {
        if (data.token) setCustomerToken(data.token);
        window.location.href = `/?ct=${encodeURIComponent(data.token ?? "")}`;
        return;
      }
    } catch {
      setError("Network problem — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="text-center mb-6">
        <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-lime-400 text-2xl font-black text-slate-950 shadow-lg shadow-lime-400/20">
          K
        </span>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
          Kaam<span className="text-lime-400">Sathi</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          One login for everyone — switch your mode from the menu after signing in.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-3">
        {/* CUSTOMER login: username + password */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-sky-300">
              Customer login
            </span>
            <button
              type="button"
              onClick={() => fillDemo("customer")}
              className="text-[10px] font-bold text-lime-400 hover:underline"
            >
              Use demo customer
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCustomer()}
                placeholder="password"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
              />
              <button
                onClick={submitCustomer}
                disabled={busy}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-extrabold text-sky-300 disabled:opacity-50"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>

        <div className="relative py-1 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-2 text-[10px] font-bold uppercase text-slate-500">
            Or single-field (worker / admin)
          </span>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-amber-300">
              Mobile number or admin passcode
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo("worker")}
                className="text-[10px] font-bold text-lime-400 hover:underline"
              >
                Demo worker
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className="text-[10px] font-bold text-lime-400 hover:underline"
              >
                Demo admin
              </button>
            </div>
          </div>
          <input
            type="text"
            autoComplete="off"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="9800000001 (worker) · admin123 (admin)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-slate-950 shadow-md shadow-lime-400/20 transition hover:bg-lime-300 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "Signing you in…" : "Login"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
            {error}
          </div>
        )}
        {hint && (
          <div className="rounded-xl border border-lime-400/40 bg-lime-400/10 p-2.5 text-xs font-semibold text-lime-300">
            {hint}
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-lime-300"
        >
          ← Back to Kathmandu map
        </Link>
      </div>
    </main>
  );
}
