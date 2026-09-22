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
  status: string;
  createdAt: string;
  workersNeeded: number;
  applicationCount: number;
  shortlistedCount: number;
  selectedCount: number;
  newCount: number;
};

export default function HireDashboard() {
  const [data, setData] = useState<{
    name: string;
    currency: string;
    stats: {
      activeJobs: number;
      applications: number;
      selected: number;
      completed: number;
    };
    jobs: Job[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/hire", { headers: authHeaders() });
        if (res.status === 401) {
          setAuthed(false);
          return;
        }
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!authed) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16">
        <div className="mx-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <div className="text-3xl">💼</div>
          <h1 className="mt-2 text-lg font-bold text-slate-100">Hire Pro</h1>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to post work and manage applications.
          </p>
          <Link
            href="/login"
            className="mt-4 block rounded-xl bg-lime-400 py-3 text-sm font-black text-slate-950"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const greet = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <div className="border-b border-slate-800 bg-slate-950 px-4 pb-4 pt-5">
        <div className="mx-auto max-w-lg">
          <p className="text-xs text-slate-500">{greet()},</p>
          <h1 className="text-xl font-bold text-slate-100">
            {data?.name || "there"}
          </h1>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["Active", data?.stats.activeJobs ?? 0],
              ["Applicants", data?.stats.applications ?? 0],
              ["Selected", data?.stats.selected ?? 0],
              ["Done", data?.stats.completed ?? 0],
            ].map(([l, v]) => (
              <div
                key={String(l)}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-center"
              >
                <div className="text-lg font-black text-lime-400">{v}</div>
                <div className="text-[10px] text-slate-500">{l}</div>
              </div>
            ))}
          </div>

          <Link
            href="/hire/post"
            className="mt-3 block rounded-xl bg-lime-400 py-3.5 text-center text-sm font-black text-slate-950"
          >
            + Post work
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        <h2 className="mb-3 text-sm font-bold text-slate-200">My posted work</h2>

        {loading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
              />
            ))}
          </div>
        )}

        {!loading && !data?.jobs.length && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-3xl">📋</div>
            <h3 className="mt-2 text-sm font-bold text-slate-200">
              You haven&rsquo;t posted any work yet
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Post a job and nearby workers will apply.
            </p>
            <Link
              href="/hire/post"
              className="mt-4 inline-block rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950"
            >
              Post your first work
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {data?.jobs.map((j) => {
            const cat = categoryByKey(j.trade);
            return (
              <Link
                key={j.id}
                href={`/hire/jobs/${j.id}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-100">
                      {j.title || cat.label}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {cat.emoji} {cat.label} · {j.area} · {timeAgo(j.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold capitalize ${
                      j.status === "open"
                        ? "bg-lime-400/15 text-lime-300"
                        : j.status === "completed"
                          ? "bg-sky-400/15 text-sky-300"
                          : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {j.status === "accepted" ? "In progress" : j.status}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="font-bold text-lime-400">
                    {data.currency} {j.offerPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-slate-400">
                    {j.applicationCount} applicant
                    {j.applicationCount === 1 ? "" : "s"}
                  </span>
                  {j.newCount > 0 && (
                    <span className="rounded bg-lime-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                      {j.newCount} new
                    </span>
                  )}
                  {j.shortlistedCount > 0 && (
                    <span className="text-amber-300">
                      {j.shortlistedCount} shortlisted
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <BottomNav mode="hire" />
    </main>
  );
}
