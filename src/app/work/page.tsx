"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useSession, authHeaders } from "@/lib/useSession";
import {
  CATEGORIES,
  PAYMENT_TYPES,
  WORK_TYPES,
  categoryByKey,
  splitList,
  timeAgo,
} from "@/lib/marketplace";

type Job = {
  id: number;
  title: string;
  trade: string;
  description: string;
  requiredSkills: string;
  offerPrice: number;
  paymentType: string;
  workType: string;
  workersNeeded: number;
  durationHours: number | null;
  startDate: string;
  startTime: string;
  area: string;
  urgency: string;
  createdAt: string;
  distanceKm: number;
  match: { score: number; label: string; reasons: string[] };
  applied: boolean;
  applicationStatus: string | null;
  saved: boolean;
};

const PAY_LABEL: Record<string, string> = {
  fixed: "fixed",
  daily: "/day",
  hourly: "/hr",
  negotiable: "negotiable",
};

export default function WorkFeedPage() {
  const { session, loading: sessionLoading } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currency, setCurrency] = useState("Rs");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [f, setF] = useState({
    category: "",
    workType: "",
    paymentType: "",
    minPay: 0,
    maxKm: 0,
    when: "",
    mySkills: false,
    sort: "match",
  });

  const [detail, setDetail] = useState<Job | null>(null);
  const [applyFor, setApplyFor] = useState<Job | null>(null);
  const [applyMsg, setApplyMsg] = useState("");
  const [applyPay, setApplyPay] = useState<number | "">("");
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyErr, setApplyErr] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      setLoading(true);
      const params = new URLSearchParams({
        q,
        category: f.category,
        workType: f.workType,
        paymentType: f.paymentType,
        minPay: String(f.minPay || ""),
        maxKm: String(f.maxKm || ""),
        when: f.when,
        mySkills: f.mySkills ? "1" : "0",
        sort: f.sort,
        page: String(nextPage),
      });
      try {
        const res = await fetch(`/api/jobs?${params}`, { headers: authHeaders() });
        const data = await res.json();
        setJobs((prev) => (append ? [...prev, ...(data.jobs ?? [])] : data.jobs ?? []));
        setCurrency(data.currency ?? "Rs");
        setTotal(data.total ?? 0);
        setHasMore(Boolean(data.hasMore));
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [q, f],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(1, false), 250);
    return () => clearTimeout(t);
  }, [load]);

  const activeFilters = useMemo(
    () =>
      [
        f.category,
        f.workType,
        f.paymentType,
        f.minPay ? "pay" : "",
        f.maxKm ? "km" : "",
        f.when,
        f.mySkills ? "skills" : "",
      ].filter(Boolean).length,
    [f],
  );

  const clearFilters = () =>
    setF({
      category: "",
      workType: "",
      paymentType: "",
      minPay: 0,
      maxKm: 0,
      when: "",
      mySkills: false,
      sort: "match",
    });

  const toggleSave = async (job: Job) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, saved: !j.saved } : j)),
    );
    await fetch(`/api/jobs/${job.id}/save`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => undefined);
  };

  const submitApply = async () => {
    if (!applyFor) return;
    setApplyBusy(true);
    setApplyErr("");
    try {
      const res = await fetch(`/api/jobs/${applyFor.id}/apply`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          message: applyMsg,
          expectedPay: applyPay === "" ? undefined : Number(applyPay),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplyErr(
          data.missing?.length
            ? `${data.error} Missing: ${data.missing.join(", ")}`
            : (data.error ?? "Could not apply."),
        );
        return;
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === applyFor.id
            ? { ...j, applied: true, applicationStatus: "applied" }
            : j,
        ),
      );
      setApplyFor(null);
      setApplyMsg("");
      setApplyPay("");
      setToast("Application sent ✓");
      setTimeout(() => setToast(""), 2500);
    } finally {
      setApplyBusy(false);
    }
  };

  const worker = session?.worker ?? null;
  const needsProfile = Boolean(session?.signedIn && !session?.hasWorkerProfile);

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-[500] border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 pb-3 pt-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-100">
                {worker ? `Hello, ${worker.name.split(" ")[0]}` : "Find work"}
              </h1>
              <p className="text-[11px] text-slate-500">
                {loading ? "Loading jobs…" : `${total} job${total === 1 ? "" : "s"} available`}
              </p>
            </div>
            {worker && (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 py-1.5 pl-1.5 pr-2.5"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-base">
                  {worker.avatar}
                </span>
                <span className="text-[11px] font-semibold text-slate-300">
                  {worker.completion}%
                </span>
              </Link>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search electrician, waiter, driver…"
              className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
            />
            <button
              onClick={() => setFiltersOpen(true)}
              className={`relative shrink-0 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
                activeFilters
                  ? "border-lime-400 bg-lime-400/10 text-lime-300"
                  : "border-slate-800 bg-slate-900 text-slate-300"
              }`}
            >
              Filters
              {activeFilters > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-lime-400 text-[10px] font-black text-slate-950">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {/* Quick category chips */}
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setF({ ...f, category: "" })}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                !f.category
                  ? "bg-lime-400 text-slate-950"
                  : "bg-slate-900 text-slate-400"
              }`}
            >
              All
            </button>
            {CATEGORIES.slice(0, 12).map((c) => (
              <button
                key={c.key}
                onClick={() =>
                  setF({ ...f, category: f.category === c.key ? "" : c.key })
                }
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  f.category === c.key
                    ? "bg-lime-400 text-slate-950"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Profile nudge */}
        {needsProfile && (
          <Link
            href="/profile/worker"
            className="mb-3 block rounded-2xl border border-lime-400/40 bg-lime-400/10 p-4"
          >
            <div className="text-sm font-bold text-lime-300">
              Complete your worker profile
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Add your skills and rate to apply for work and get better matches.
            </p>
          </Link>
        )}
        {worker && worker.completion < 100 && (
          <Link
            href="/profile/worker"
            className="mb-3 block rounded-2xl border border-slate-800 bg-slate-900 p-3.5"
          >
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Profile strength</span>
              <span className="font-bold text-lime-300">{worker.completion}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-lime-400 transition-all"
                style={{ width: `${worker.completion}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Complete your profile to get better job matches →
            </p>
          </Link>
        )}

        {/* Skeletons */}
        {loading && jobs.length === 0 && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="h-4 w-2/3 rounded bg-slate-800" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-800" />
                <div className="mt-4 h-9 rounded-xl bg-slate-800" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && jobs.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-3xl">🔍</div>
            <h3 className="mt-2 text-sm font-bold text-slate-200">No jobs found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try changing your filters or searching for another skill or location.
            </p>
            {(activeFilters > 0 || q) && (
              <button
                onClick={() => {
                  clearFilters();
                  setQ("");
                }}
                className="mt-4 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Job cards */}
        <div className="space-y-3">
          {jobs.map((j) => {
            const cat = categoryByKey(j.trade);
            const skills = splitList(j.requiredSkills);
            return (
              <article
                key={j.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {j.urgency === "now" && (
                        <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">
                          Urgent
                        </span>
                      )}
                      {worker && j.match.score >= 70 && (
                        <span className="rounded bg-lime-400/15 px-1.5 py-0.5 text-[10px] font-bold text-lime-300">
                          {j.match.score}% match
                        </span>
                      )}
                      {j.distanceKm <= 2 && (
                        <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                          Nearby
                        </span>
                      )}
                    </div>
                    <h3 className="truncate text-[15px] font-bold text-slate-100">
                      {j.title || `${cat.label} needed`}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {cat.emoji} {cat.label} · {j.area} ·{" "}
                      {j.distanceKm.toFixed(1)} km
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSave(j)}
                    aria-label={j.saved ? "Remove bookmark" : "Save job"}
                    className={`shrink-0 rounded-lg p-1.5 text-lg transition ${
                      j.saved ? "text-lime-400" : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    {j.saved ? "★" : "☆"}
                  </button>
                </div>

                {j.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                    {j.description}
                  </p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span className="font-bold text-lime-400">
                    {currency} {j.offerPrice.toLocaleString("en-IN")}
                    <span className="ml-0.5 font-normal text-slate-500">
                      {PAY_LABEL[j.paymentType] ?? ""}
                    </span>
                  </span>
                  {j.startDate && <span>📅 {j.startDate}</span>}
                  {j.startTime && <span>🕐 {j.startTime}</span>}
                  {j.durationHours ? <span>⏱ {j.durationHours}h</span> : null}
                  {j.workersNeeded > 1 && <span>👥 {j.workersNeeded} needed</span>}
                </div>

                {skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {skills.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setDetail(j)}
                    className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300"
                  >
                    View details
                  </button>
                  {j.applied ? (
                    <span className="flex-1 rounded-xl bg-slate-800 py-2.5 text-center text-xs font-bold capitalize text-lime-300">
                      {j.applicationStatus ?? "Applied"}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setApplyFor(j);
                        setApplyPay(j.offerPrice);
                        setApplyErr("");
                      }}
                      className="flex-1 rounded-xl bg-lime-400 py-2.5 text-xs font-black text-slate-950"
                    >
                      Apply now
                    </button>
                  )}
                </div>
                <p className="mt-2 text-right text-[10px] text-slate-600">
                  Posted {timeAgo(j.createdAt)}
                </p>
              </article>
            );
          })}
        </div>

        {hasMore && (
          <button
            onClick={() => load(page + 1, true)}
            disabled={loading}
            className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900 py-3 text-xs font-semibold text-slate-300 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more jobs"}
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[1200] -translate-x-1/2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-xl">
          {toast}
        </div>
      )}

      {/* FILTER SHEET */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[1100] flex items-end">
          <button
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-slate-950 p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-lime-400"
              >
                Clear all
              </button>
            </div>

            <Group label="Sort by">
              {[
                { k: "match", l: "Best match" },
                { k: "newest", l: "Newest" },
                { k: "nearest", l: "Nearest" },
                { k: "pay", l: "Highest pay" },
              ].map((o) => (
                <Chip
                  key={o.k}
                  on={f.sort === o.k}
                  onClick={() => setF({ ...f, sort: o.k })}
                >
                  {o.l}
                </Chip>
              ))}
            </Group>

            <Group label="Category">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  on={f.category === c.key}
                  onClick={() =>
                    setF({ ...f, category: f.category === c.key ? "" : c.key })
                  }
                >
                  {c.emoji} {c.label}
                </Chip>
              ))}
            </Group>

            <Group label="Work type">
              {WORK_TYPES.map((w) => (
                <Chip
                  key={w.key}
                  on={f.workType === w.key}
                  onClick={() =>
                    setF({ ...f, workType: f.workType === w.key ? "" : w.key })
                  }
                >
                  {w.label}
                </Chip>
              ))}
            </Group>

            <Group label="Payment">
              {PAYMENT_TYPES.map((p) => (
                <Chip
                  key={p.key}
                  on={f.paymentType === p.key}
                  onClick={() =>
                    setF({
                      ...f,
                      paymentType: f.paymentType === p.key ? "" : p.key,
                    })
                  }
                >
                  {p.label}
                </Chip>
              ))}
            </Group>

            <div className="mb-4">
              <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Minimum pay</span>
                <span className="text-lime-400">
                  {f.minPay ? `${currency} ${f.minPay}` : "Any"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10000}
                step={250}
                value={f.minPay}
                onChange={(e) => setF({ ...f, minPay: Number(e.target.value) })}
                className="w-full accent-lime-400"
              />
            </div>

            <div className="mb-4">
              <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Distance</span>
                <span className="text-lime-400">
                  {f.maxKm ? `Within ${f.maxKm} km` : "Any"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={f.maxKm}
                onChange={(e) => setF({ ...f, maxKm: Number(e.target.value) })}
                className="w-full accent-lime-400"
              />
            </div>

            <Group label="When">
              {[
                { k: "today", l: "Today" },
                { k: "urgent", l: "Urgent only" },
              ].map((o) => (
                <Chip
                  key={o.k}
                  on={f.when === o.k}
                  onClick={() => setF({ ...f, when: f.when === o.k ? "" : o.k })}
                >
                  {o.l}
                </Chip>
              ))}
            </Group>

            <label className="mb-5 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 p-3">
              <input
                type="checkbox"
                checked={f.mySkills}
                onChange={(e) => setF({ ...f, mySkills: e.target.checked })}
                className="h-4 w-4 accent-lime-400"
              />
              <span className="text-xs font-semibold text-slate-200">
                Only jobs matching my skills
              </span>
            </label>

            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full rounded-xl bg-lime-400 py-3.5 text-sm font-black text-slate-950"
            >
              Show {total} job{total === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}

      {/* JOB DETAIL SHEET */}
      {detail && (
        <div className="fixed inset-0 z-[1100] flex items-end">
          <button
            aria-label="Close"
            onClick={() => setDetail(null)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-slate-950 p-5 pb-8">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {detail.title || categoryByKey(detail.trade).label}
                </h2>
                <p className="text-xs text-slate-500">
                  {categoryByKey(detail.trade).emoji}{" "}
                  {categoryByKey(detail.trade).label} · {detail.area} ·{" "}
                  {detail.distanceKm.toFixed(1)} km away
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-900"
              >
                ✕
              </button>
            </div>

            {session?.worker && (
              <div className="mb-3 rounded-xl border border-lime-400/30 bg-lime-400/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-lime-300">
                    {detail.match.label}
                  </span>
                  <span className="text-lg font-black text-lime-400">
                    {detail.match.score}%
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {detail.match.reasons.map((r) => (
                    <li key={r} className="text-[11px] text-slate-400">
                      • {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <Cell label="Payment">
                <span className="font-bold text-lime-400">
                  {currency} {detail.offerPrice.toLocaleString("en-IN")}{" "}
                  {PAY_LABEL[detail.paymentType]}
                </span>
              </Cell>
              <Cell label="Work type">{detail.workType}</Cell>
              <Cell label="Workers needed">{detail.workersNeeded}</Cell>
              <Cell label="Duration">
                {detail.durationHours ? `${detail.durationHours} hours` : "—"}
              </Cell>
              <Cell label="Date">{detail.startDate || "Flexible"}</Cell>
              <Cell label="Start time">{detail.startTime || "—"}</Cell>
            </dl>

            {detail.description && (
              <div className="mb-3">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  {detail.description}
                </p>
              </div>
            )}

            {splitList(detail.requiredSkills).length > 0 && (
              <div className="mb-4">
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Required skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {splitList(detail.requiredSkills).map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => toggleSave(detail)}
                className="rounded-xl border border-slate-800 px-4 py-3 text-lg"
              >
                {detail.saved ? "★" : "☆"}
              </button>
              {detail.applied ? (
                <span className="flex-1 rounded-xl bg-slate-800 py-3 text-center text-sm font-bold capitalize text-lime-300">
                  {detail.applicationStatus}
                </span>
              ) : (
                <button
                  onClick={() => {
                    setApplyFor(detail);
                    setApplyPay(detail.offerPrice);
                    setDetail(null);
                  }}
                  className="flex-1 rounded-xl bg-lime-400 py-3 text-sm font-black text-slate-950"
                >
                  Apply now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPLY SHEET */}
      {applyFor && (
        <div className="fixed inset-0 z-[1200] flex items-end">
          <button
            aria-label="Close"
            onClick={() => setApplyFor(null)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full rounded-t-3xl border-t border-slate-800 bg-slate-950 p-5 pb-8">
            <h2 className="text-base font-bold text-slate-100">Apply for this job</h2>
            <p className="mb-4 text-xs text-slate-500">
              {applyFor.title || categoryByKey(applyFor.trade).label} · {applyFor.area}
            </p>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Message to employer (optional)
              </span>
              <textarea
                rows={3}
                value={applyMsg}
                onChange={(e) => setApplyMsg(e.target.value)}
                placeholder="Tell them about your relevant experience…"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Your expected pay ({currency})
              </span>
              <input
                type="number"
                value={applyPay}
                onChange={(e) =>
                  setApplyPay(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none"
              />
            </label>

            {applyErr && (
              <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                {applyErr}
                {applyErr.includes("profile") && (
                  <Link
                    href="/profile/worker"
                    className="mt-2 block font-bold text-lime-400 underline"
                  >
                    Complete profile →
                  </Link>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setApplyFor(null)}
                className="flex-1 rounded-xl border border-slate-800 py-3 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={submitApply}
                disabled={applyBusy}
                className="flex-1 rounded-xl bg-lime-400 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {applyBusy ? "Sending…" : "Send application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!sessionLoading && <BottomNav mode="worker" />}
    </main>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        on ? "bg-lime-400 text-slate-950" : "bg-slate-900 text-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-900 p-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-200">{children}</dd>
    </div>
  );
}
