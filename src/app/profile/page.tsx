"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Stars from "@/components/Stars";
import { useSession } from "@/lib/useSession";
import {
  clearAdminToken,
  clearCustomerToken,
  clearWorkerToken,
  customerHeaders,
} from "@/lib/clientAuth";
import { categoryByKey, splitList } from "@/lib/marketplace";

export default function ProfilePage() {
  const router = useRouter();
  const { session, loading, reload, switchMode } = useSession();
  const [switching, setSwitching] = useState(false);
  const [note, setNote] = useState("");

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-900" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-900" />
        </div>
      </main>
    );
  }

  if (!session?.signedIn) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16">
        <div className="mx-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <div className="text-3xl">🙏</div>
          <h1 className="mt-2 text-lg font-bold text-slate-100">Namaste</h1>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to manage your profile, post work or find jobs.
          </p>
          <Link
            href="/login"
            className="mt-4 block rounded-xl bg-lime-400 py-3 text-sm font-black text-slate-950"
          >
            Sign in or create account
          </Link>
        </div>
      </main>
    );
  }

  const mode = session.activeMode;
  const acct = session.account;
  const w = session.worker;

  const doSwitch = async (next: "hire" | "worker") => {
    setSwitching(true);
    setNote("");
    const res = await switchMode(next);
    setSwitching(false);
    if (next === "worker") {
      if (res?.needsWorkerSetup || !session.hasWorkerProfile) {
        router.push("/profile/worker");
        return;
      }
      router.push("/work");
      return;
    }
    router.push("/hire");
  };

  const signOut = async () => {
    clearCustomerToken();
    clearWorkerToken();
    clearAdminToken();
    await Promise.all([
      fetch("/api/auth/login", { method: "DELETE" }).catch(() => undefined),
      fetch("/api/worker/session", { method: "DELETE" }).catch(() => undefined),
    ]);
    await reload();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {/* Identity */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-800 text-3xl">
              {mode === "worker" ? (w?.avatar ?? "🛠️") : (acct?.avatar ?? "🙋")}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-slate-100">
                {mode === "worker" ? w?.name : acct?.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    mode === "worker"
                      ? "bg-lime-400/15 text-lime-300"
                      : "bg-sky-400/15 text-sky-300"
                  }`}
                >
                  {mode === "worker" ? "Worker" : "Hire Pro"}
                </span>
                {(mode === "worker" ? w?.verified : acct?.verified) && (
                  <span className="text-[10px] font-bold text-sky-400">
                    ✓ Verified
                  </span>
                )}
              </div>
              {mode === "worker" && w && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Stars value={w.rating} size="text-xs" />
                  <span className="font-semibold text-slate-200">
                    {w.rating.toFixed(1)}
                  </span>
                  <span>· {w.jobsDone} jobs</span>
                </div>
              )}
              {mode === "hire" && acct && (
                <p className="mt-1 text-xs text-slate-500">
                  {acct.businessName || acct.area || "Kathmandu"}
                </p>
              )}
            </div>
          </div>

          <Link
            href={mode === "worker" ? "/profile/worker" : "/profile/hire"}
            className="mt-4 block w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-center text-xs font-bold text-slate-200 transition hover:border-lime-400/50 hover:text-lime-300"
          >
            Edit {mode === "worker" ? "worker" : "Hire Pro"} profile
          </Link>
        </section>

        {/* Mode switch */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Current mode
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            One account, two profiles. Switch any time.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={switching}
              onClick={() => doSwitch("hire")}
              className={`rounded-xl border p-3 text-center transition ${
                mode === "hire"
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="text-xl">💼</div>
              <div
                className={`mt-1 text-xs font-bold ${
                  mode === "hire" ? "text-lime-300" : "text-slate-300"
                }`}
              >
                Hire Pro
              </div>
              <div className="text-[10px] text-slate-500">Post work</div>
            </button>
            <button
              disabled={switching}
              onClick={() => doSwitch("worker")}
              className={`rounded-xl border p-3 text-center transition ${
                mode === "worker"
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="text-xl">👷</div>
              <div
                className={`mt-1 text-xs font-bold ${
                  mode === "worker" ? "text-lime-300" : "text-slate-300"
                }`}
              >
                Worker
              </div>
              <div className="text-[10px] text-slate-500">
                {session.hasWorkerProfile ? "Find work" : "Set up profile"}
              </div>
            </button>
          </div>
          {note && <p className="mt-2 text-[11px] text-lime-300">{note}</p>}
        </section>

        {/* Worker detail */}
        {mode === "worker" && w && (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Profile strength
                </span>
                <span className="font-bold text-lime-300">{w.completion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-lime-400 transition-all"
                  style={{ width: `${w.completion}%` }}
                />
              </div>
              {w.missing.length > 0 && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Add: {w.missing.map((m) => m.label).join(", ")}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Skills
              </h2>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-lg bg-lime-400/15 px-2 py-1 text-[11px] font-bold text-lime-300">
                  {categoryByKey(w.trade).emoji} {categoryByKey(w.trade).label} · primary
                </span>
                {splitList(w.skills).map((s) => (
                  <span
                    key={s}
                    className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Cell label="Experience">{w.experienceYears} years</Cell>
                <Cell label="Rate">
                  Rs {w.baseRate}/{w.priceUnit}
                </Cell>
                <Cell label="Available">
                  {splitList(w.availableDays).join(", ") || "Not set"}
                </Cell>
                <Cell label="Work types">
                  {splitList(w.workTypes).join(", ") || "Any"}
                </Cell>
              </dl>
            </section>
          </>
        )}

        {/* Hire Pro detail */}
        {mode === "hire" && acct && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <dl className="grid grid-cols-1 gap-2 text-xs">
              <Cell label="Phone">{acct.phone || "Not set"}</Cell>
              <Cell label="Email">{acct.email || "Not set"}</Cell>
              <Cell label="Location">{acct.area || "Not set"}</Cell>
              {acct.businessName && (
                <Cell label="Business">{acct.businessName}</Cell>
              )}
              {acct.businessDesc && <Cell label="About">{acct.businessDesc}</Cell>}
            </dl>
          </section>
        )}

        {/* Settings */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {[
            { l: "My bookings & requests", h: "/requests" },
            mode === "worker"
              ? { l: "My applications", h: "/work/applications" }
              : { l: "My posted work", h: "/hire" },
          ].map((r) => (
            <Link
              key={r.h}
              href={r.h}
              className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5 text-sm text-slate-200 last:border-0 hover:bg-slate-800/50"
            >
              <span>{r.l}</span>
              <span className="text-slate-600">›</span>
            </Link>
          ))}
        </section>

        <button
          onClick={signOut}
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 text-sm font-semibold text-rose-300 transition hover:border-rose-400/40"
        >
          Sign out
        </button>
      </div>

      <BottomNav mode={mode} />
    </main>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-950 p-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-200">{children}</dd>
    </div>
  );
}
