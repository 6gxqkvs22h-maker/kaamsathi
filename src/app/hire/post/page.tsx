"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { authHeaders } from "@/lib/useSession";
import {
  CATEGORIES,
  PAYMENT_TYPES,
  WORK_TYPES,
  categoryByKey,
} from "@/lib/marketplace";
import { KTM_AREAS, tradeByKey } from "@/lib/trades";

export default function PostWorkPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({
    title: "",
    category: "",
    requiredSkills: [] as string[],
    workersNeeded: 1,
    description: "",
    area: KTM_AREAS[0].name,
    address: "",
    startDate: new Date().toISOString().slice(0, 10),
    startTime: "",
    durationHours: "",
    offerPrice: 1500,
    paymentType: "fixed",
    workType: "one-day",
    urgent: false,
  });

  const skillOptions = f.category ? tradeByKey(f.category).skills : [];

  const submit = async () => {
    setError("");
    if (!f.title.trim()) return setError("Add a job title.");
    if (!f.category) return setError("Choose a work category.");
    setBusy(true);
    try {
      const area = KTM_AREAS.find((a) => a.name === f.area) ?? KTM_AREAS[0];
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...f,
          durationHours: f.durationHours ? Number(f.durationHours) : null,
          lat: area.lat,
          lng: area.lng,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not post the job.");
        return;
      }
      router.push(`/hire/jobs/${data.job.id}`);
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-28">
      <div className="sticky top-0 z-[500] border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/hire"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800 text-slate-400"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold text-slate-100">Post work</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <Field label="Job title" required>
          <input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder="e.g. Need 2 restaurant waiters"
            className={input}
          />
        </Field>

        <Field label="Category" required>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() =>
                  setF({ ...f, category: c.key, requiredSkills: [] })
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  f.category === c.key
                    ? "bg-lime-400 text-slate-950"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </Field>

        {skillOptions.length > 0 && (
          <Field label="Required skills">
            <div className="flex flex-wrap gap-1.5">
              {skillOptions.map((s) => {
                const on = f.requiredSkills.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setF({
                        ...f,
                        requiredSkills: on
                          ? f.requiredSkills.filter((x) => x !== s)
                          : [...f.requiredSkills, s],
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      on ? "bg-sky-400 text-slate-950" : "bg-slate-900 text-slate-400"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Description">
          <textarea
            rows={3}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder="Describe the work, tools needed, and what you expect…"
            className={input}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Workers needed">
            <input
              type="number"
              min={1}
              value={f.workersNeeded}
              onChange={(e) =>
                setF({ ...f, workersNeeded: Number(e.target.value) })
              }
              className={input}
            />
          </Field>
          <Field label="Duration (hours)">
            <input
              type="number"
              min={0}
              value={f.durationHours}
              onChange={(e) => setF({ ...f, durationHours: e.target.value })}
              placeholder="6"
              className={input}
            />
          </Field>
        </div>

        <Field label="Area">
          <select
            value={f.area}
            onChange={(e) => setF({ ...f, area: e.target.value })}
            className={input}
          >
            {KTM_AREAS.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Address / landmark">
          <input
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
            placeholder="Near Chabahil Chowk"
            className={input}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={f.startDate}
              onChange={(e) => setF({ ...f, startDate: e.target.value })}
              className={input}
            />
          </Field>
          <Field label="Start time">
            <input
              type="time"
              value={f.startTime}
              onChange={(e) => setF({ ...f, startTime: e.target.value })}
              className={input}
            />
          </Field>
        </div>

        <Field label="Work type">
          <div className="flex flex-wrap gap-1.5">
            {WORK_TYPES.map((w) => (
              <button
                key={w.key}
                onClick={() => setF({ ...f, workType: w.key })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  f.workType === w.key
                    ? "bg-lime-400 text-slate-950"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="rounded-2xl border border-lime-400/30 bg-lime-400/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Payment
            </span>
            <span className="text-xl font-black text-lime-400">
              Rs {f.offerPrice.toLocaleString("en-IN")}
            </span>
          </div>
          <input
            type="range"
            min={200}
            max={20000}
            step={100}
            value={f.offerPrice}
            onChange={(e) => setF({ ...f, offerPrice: Number(e.target.value) })}
            className="w-full accent-lime-400"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PAYMENT_TYPES.map((p) => (
              <button
                key={p.key}
                onClick={() => setF({ ...f, paymentType: p.key })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  f.paymentType === p.key
                    ? "bg-lime-400 text-slate-950"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
          <input
            type="checkbox"
            checked={f.urgent}
            onChange={(e) => setF({ ...f, urgent: e.target.checked })}
            className="h-4 w-4 accent-rose-400"
          />
          <span className="text-xs font-semibold text-slate-200">
            Mark as urgent — show first in the feed
          </span>
        </label>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-2xl bg-lime-400 py-4 text-sm font-black text-slate-950 disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post work"}
        </button>
        <p className="pb-2 text-center text-[11px] text-slate-500">
          {f.category
            ? `Workers in ${categoryByKey(f.category).label} near ${f.area} will see this.`
            : "Choose a category so the right workers see your job."}
        </p>
      </div>

      <BottomNav mode="hire" />
    </main>
  );
}

const input =
  "w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      {children}
    </label>
  );
}
