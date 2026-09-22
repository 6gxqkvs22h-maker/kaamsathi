"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { authHeaders } from "@/lib/useSession";
import { categoryByKey, timeAgo } from "@/lib/marketplace";

type Job = {
  id: number;
  title: string;
  trade: string;
  area: string;
  offerPrice: number;
  startDate: string;
  customerPhone: string;
  status: string;
};
type App = {
  id: number;
  jobId: number;
  status: string;
  message: string;
  expectedPay: number | null;
  matchScore: number;
  createdAt: string;
  job: Job;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  applied: { label: "Applied", cls: "bg-slate-800 text-slate-300" },
  viewed: { label: "Viewed", cls: "bg-sky-400/15 text-sky-300" },
  shortlisted: { label: "Shortlisted", cls: "bg-amber-400/15 text-amber-300" },
  selected: { label: "Selected 🎉", cls: "bg-lime-400/15 text-lime-300" },
  rejected: { label: "Not selected", cls: "bg-rose-500/15 text-rose-300" },
  cancelled: { label: "Withdrawn", cls: "bg-slate-800 text-slate-500" },
  completed: { label: "Completed", cls: "bg-lime-400/15 text-lime-300" },
};

export default function ApplicationsPage() {
  const [tab, setTab] = useState<"applications" | "saved">("applications");
  const [apps, setApps] = useState<App[]>([]);
  const [saved, setSaved] = useState<Job[]>([]);
  const [currency, setCurrency] = useState("Rs");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications", { headers: authHeaders() });
      const d = await res.json();
      setApps(d.applications ?? []);
      setSaved(d.saved ?? []);
      setCurrency(d.currency ?? "Rs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const withdraw = async (jobId: number) => {
    await fetch(`/api/jobs/${jobId}/apply`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await load();
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <div className="sticky top-0 z-[500] border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-3 text-lg font-bold text-slate-100">My work</h1>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-900 p-1.5">
            {(["applications", "saved"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-xs font-bold capitalize transition ${
                  tab === t ? "bg-lime-400 text-slate-950" : "text-slate-400"
                }`}
              >
                {t === "applications"
                  ? `Applications (${apps.length})`
                  : `Saved (${saved.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        {loading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
              />
            ))}
          </div>
        )}

        {!loading && tab === "applications" && apps.length === 0 && (
          <Empty
            icon="📋"
            title="No applications yet"
            body="You haven't applied to any work yet."
            cta="Find work"
            href="/work"
          />
        )}
        {!loading && tab === "saved" && saved.length === 0 && (
          <Empty
            icon="★"
            title="No saved jobs"
            body="Bookmark jobs from the feed to review them later."
            cta="Browse jobs"
            href="/work"
          />
        )}

        {tab === "applications" &&
          apps.map((a) => {
            const s = STATUS[a.status] ?? STATUS.applied;
            const cat = categoryByKey(a.job.trade);
            return (
              <article
                key={a.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-100">
                      {a.job.title || cat.label}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {cat.emoji} {cat.label} · {a.job.area}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${s.cls}`}
                  >
                    {s.label}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                  <span className="font-bold text-lime-400">
                    {currency} {(a.expectedPay ?? a.job.offerPrice).toLocaleString("en-IN")}
                  </span>
                  <span>{a.matchScore}% match</span>
                  <span>Applied {timeAgo(a.createdAt)}</span>
                </div>

                {(a.status === "selected" || a.status === "completed") &&
                  a.job.customerPhone && (
                    <a
                      href={`tel:${a.job.customerPhone.replace(/\s/g, "")}`}
                      className="mt-3 block rounded-xl bg-lime-400 py-2.5 text-center text-xs font-black text-slate-950"
                    >
                      📞 Call employer · {a.job.customerPhone}
                    </a>
                  )}

                {["applied", "viewed", "shortlisted"].includes(a.status) && (
                  <button
                    onClick={() => withdraw(a.jobId)}
                    className="mt-3 w-full rounded-xl border border-slate-800 py-2 text-[11px] font-semibold text-slate-400"
                  >
                    Withdraw application
                  </button>
                )}
              </article>
            );
          })}

        {tab === "saved" &&
          saved.map((j) => {
            const cat = categoryByKey(j.trade);
            return (
              <article
                key={j.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <h3 className="text-sm font-bold text-slate-100">
                  {j.title || cat.label}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {cat.emoji} {cat.label} · {j.area}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-lime-400">
                    {currency} {j.offerPrice.toLocaleString("en-IN")}
                  </span>
                  <Link
                    href="/work"
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-lime-300"
                  >
                    View in feed
                  </Link>
                </div>
              </article>
            );
          })}
      </div>

      <BottomNav mode="worker" />
    </main>
  );
}

function Empty({
  icon,
  title,
  body,
  cta,
  href,
}: {
  icon: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-2 text-sm font-bold text-slate-200">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-block rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950"
      >
        {cta}
      </Link>
    </div>
  );
}
