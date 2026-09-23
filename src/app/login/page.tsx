"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  setAdminToken,
  setCustomerToken,
  setWorkerToken,
} from "@/lib/clientAuth";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  // Shared login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  // Signup state
  const [suName, setSuName] = useState("");
  const [suUser, setSuUser] = useState("");
  const [suPass, setSuPass] = useState("");
  const [suPhone, setSuPhone] = useState("");

  const applyToken = (role: string, token: string) => {
    if (role === "admin") setAdminToken(token);
    else if (role === "worker") setWorkerToken(token);
    else setCustomerToken(token);
  };

  const goTo = (role: string, token: string, redirect?: string) => {
    // Pass the token in the URL too — this survives browsers that block
    // cookies and localStorage inside preview iframes.
    const key = role === "admin" ? "t" : role === "worker" ? "t" : "ct";
    const dest = redirect || (role === "admin" ? "/admin" : role === "worker" ? "/worker" : "/");
    window.location.href = `${dest}${dest.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(token)}`;
  };

  // Pick up the token/error Google's callback route redirects back with.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gToken = params.get("g_token");
    const gRole = params.get("g_role");
    const gError = params.get("g_error");
    if (gToken && gRole) {
      applyToken(gRole, gToken);
      goTo(gRole, gToken);
      return;
    }
    if (gError) {
      setError(gError);
      window.history.replaceState({}, "", "/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /** One submit handler for admin + worker + customer. */
  const submit = async (overrideId?: string, overridePass?: string) => {
    const id = (overrideId ?? identifier).trim();
    const pw = overridePass ?? password;
    setError("");
    setHint("");
    if (!id) {
      setError("Type your mobile number, username or admin passcode.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id, password: pw }),
      });
      const data = await res.json().catch(() => ({}));

      // Account found but we still need the password (customers only).
      if (res.ok && data.needsPassword) {
        setNeedsPassword(true);
        setHint(data.message ?? "Type your password to continue.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not sign you in.");
        if (data.needsRegister) setMode("signup");
        return;
      }
      if (data.token) {
        applyToken(data.role, data.token);
        goTo(data.role, data.token, data.redirect);
      }
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Demo buttons: fill the box AND sign in immediately. */
  const demo = (kind: "customer" | "worker" | "admin") => {
    setError("");
    setHint("");
    setNeedsPassword(false);
    if (kind === "customer") {
      setIdentifier("customer");
      setPassword("customer123");
      void submit("customer", "customer123");
    } else if (kind === "worker") {
      setIdentifier("9800000001");
      setPassword("");
      void submit("9800000001", "");
    } else {
      setIdentifier("admin123");
      setPassword("");
      void submit("admin123", "");
    }
  };

  const signup = async () => {
    setError("");
    setHint("");
    if (!suName.trim() || !suUser.trim() || !suPass) {
      setError("Fill your name, username and password to create an account.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name: suName.trim(),
          username: suUser.trim(),
          password: suPass,
          phone: suPhone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create your account.");
        return;
      }
      if (data.token) {
        setCustomerToken(data.token);
        goTo("customer", data.token, "/");
      }
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-lime-400 text-2xl font-black text-slate-950 shadow-lg shadow-lime-400/20">
          K
        </span>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
          Kaam<span className="text-lime-400">Sathi</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          One login for everyone — customers, workers and admin.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-900 p-1.5">
        <button
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`rounded-xl py-2 text-xs font-extrabold transition ${
            mode === "login"
              ? "bg-lime-400 text-slate-950"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Login
        </button>
        <button
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          className={`rounded-xl py-2 text-xs font-extrabold transition ${
            mode === "signup"
              ? "bg-lime-400 text-slate-950"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Create account
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        {mode === "login" ? (
          <>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              Mobile number, username or admin passcode
            </label>
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setNeedsPassword(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="9800000001 · customer · admin123"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm"
            />

            {/* Password only appears when the account actually needs one */}
            {needsPassword && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-bold text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-lime-400/60 bg-slate-950 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm"
                />
              </div>
            )}

            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Workers sign in with their <b className="text-slate-300">mobile</b>.
              Customers use their <b className="text-slate-300">username + password</b>.
              Admin uses the <b className="text-slate-300">passcode</b>. We detect it
              automatically.
            </p>

            {error && (
              <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
                {error}
              </div>
            )}
            {hint && (
              <div className="mt-3 rounded-xl border border-lime-400/40 bg-lime-400/10 p-2.5 text-xs font-semibold text-lime-300">
                {hint}
              </div>
            )}

            <button
              onClick={() => submit()}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-lime-400 py-3.5 text-sm font-black text-slate-950 shadow-md shadow-lime-400/20 transition hover:bg-lime-300 active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? "Signing you in…" : "Continue"}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-sm font-extrabold text-slate-100">
              Create a customer account
            </h2>
            <p className="mb-3 text-[11px] text-slate-400">
              To offer your services instead,{" "}
              <Link href="/worker" className="font-bold text-lime-400 hover:underline">
                register as a worker
              </Link>
              .
            </p>
            <div className="space-y-2">
              <input
                value={suName}
                onChange={(e) => setSuName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm"
              />
              <input
                value={suUser}
                onChange={(e) => setSuUser(e.target.value)}
                placeholder="Choose a username"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm"
              />
              <input
                type="password"
                value={suPass}
                onChange={(e) => setSuPass(e.target.value)}
                placeholder="Choose a password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm"
              />
              <input
                value={suPhone}
                onChange={(e) => setSuPhone(e.target.value)}
                inputMode="numeric"
                placeholder="Mobile (workers call you on this)"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm"
              />
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
                {error}
              </div>
            )}

            <button
              onClick={signup}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-lime-400 py-3.5 text-sm font-black text-slate-950 shadow-md shadow-lime-400/20 transition hover:bg-lime-300 active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create account & continue"}
            </button>
          </>
        )}
      </div>

      {/* Continue with Google */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          or
          <span className="h-px flex-1 bg-slate-800" />
        </div>
        <a
          href="/api/auth/google/start?role=customer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500"
        >
          <span>🙋</span>
          <span>Continue with Google — I need a service</span>
        </a>
        <a
          href="/api/auth/google/start?role=worker"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500"
        >
          <span>🛠️</span>
          <span>Continue with Google — I'm a worker</span>
        </a>
        <p className="text-center text-[10px] text-slate-500">
          Workers: Google sign-in works after you've registered once with your
          trade &amp; mobile.
        </p>
      </div>

      {/* One-tap demo logins */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          One-tap demo accounts
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => demo("customer")}
            disabled={busy}
            className="rounded-xl border border-sky-400/40 bg-sky-400/10 px-2 py-2.5 text-[11px] font-bold text-sky-300 transition hover:bg-sky-400/20 disabled:opacity-50"
          >
            🙋 Customer
          </button>
          <button
            onClick={() => demo("worker")}
            disabled={busy}
            className="rounded-xl border border-lime-400/40 bg-lime-400/10 px-2 py-2.5 text-[11px] font-bold text-lime-300 transition hover:bg-lime-400/20 disabled:opacity-50"
          >
            🛠️ Worker
          </button>
          <button
            onClick={() => demo("admin")}
            disabled={busy}
            className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-2 py-2.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-50"
          >
            🛡️ Admin
          </button>
        </div>
        <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
          <div>
            Customer · <span className="font-mono text-slate-400">customer / customer123</span>
          </div>
          <div>
            Worker · <span className="font-mono text-slate-400">9800000001</span>
          </div>
          <div>
            Admin · <span className="font-mono text-slate-400">admin123</span>
          </div>
        </div>
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-lime-300"
        >
          ← Back to map
        </Link>
      </div>
    </main>
  );
}
