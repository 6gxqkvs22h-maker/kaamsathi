"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Stars from "@/components/Stars";
import { authHeaders } from "@/lib/useSession";
import { categoryByKey, splitList, timeAgo } from "@/lib/marketplace";

type Worker = {
  id: number;
  name: string;
  avatar: string;
  trade: string;
  skills: string;
  area: string;
  rating: number;
  ratingCount: number;
  jobsDone: number;
  experienceYears: number;
  verified: boolean;
  baseRate: number;
  priceUnit: string;
  bio: string;
  phone: string;
};
type Applicant = {
  id: number;
  status: string;
  message: string;
  expectedPay: number | null;
  matchScore: number;
  createdAt: string;
  worker: Worker;
};

const TABS = ["all", "shortlisted", "selected"] as const;

export default function JobApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<{
    id: number;
    title: string;
    trade: string;
    area: string;
    offerPrice: number;
    status: string;
    workersNeeded: number;
  } | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);
  const [detail, setDetail] = useState<Applicant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}/applicants`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const d = await res.json();
      setJob(d.job);
      setApplicants(d.applicants ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (applicationId: number, action: string) => {
    setBusy(applicationId);
    await fetch(`/api/jobs/${id}/applicants`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ applicationId, action }),
    });
    setBusy(0);
    setDetail(null);
    await load();
  };

  const shown = applicants.filter((a) =>
    tab === "all"
      ? true
      : tab === "shortlisted"
        ? a.status === "shortlisted"
        : a.status === "selected",
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <div className="sticky top-0 z-[500] border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <Link
              href="/hire"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-800 text-slate-400"
            >
              ←
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-100">
                {job?.title || "Job"}
              </h1>
              <p className="text-[11px] text-slate-500">
                {applicants.length} applicant{applicants.length === 1 ? "" : "s"}
                {job ? ` · ${job.area}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-900 p-1.5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-xs font-bold capitalize transition ${
                  tab === t ? "bg-lime-400 text-slate-950" : "text-slate-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        {loading &&
          [0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
            />
          ))}

        {!loading && shown.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-3xl">👷</div>
            <h3 className="mt-2 text-sm font-bold text-slate-200">
              No {tab === "all" ? "applicants" : tab + " workers"} yet
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Workers nearby will see your job in their feed.
            </p>
          </div>
        )}

        {shown.map((a) => (
          <article
            key={a.id}
            className={`rounded-2xl border p-4 ${
              a.status === "selected"
                ? "border-lime-400 bg-lime-400/5"
                : "border-slate-800 bg-slate-900"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-2xl">
                {a.worker.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-bold text-slate-100">
                    {a.worker.name}
                  </h3>
                  {a.worker.verified && (
                    <span className="text-[10px] font-bold text-sky-400">✓</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {categoryByKey(a.worker.trade).label} · {a.worker.area} ·{" "}
                  {a.worker.experienceYears} yrs
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Stars value={a.worker.rating} size="text-[11px]" />
                  <span>{a.worker.rating.toFixed(1)}</span>
                  <span>· {a.worker.jobsDone} jobs</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-black text-lime-400">
                  {a.matchScore}%
                </div>
                <div className="text-[10px] text-slate-500">match</div>
              </div>
            </div>

            {a.message && (
              <p className="mt-2.5 rounded-xl bg-slate-950/60 p-2.5 text-xs text-slate-300">
                “{a.message}”
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
              {a.expectedPay ? (
                <span>
                  Asking{" "}
                  <b className="text-lime-400">
                    Rs {a.expectedPay.toLocaleString("en-IN")}
                  </b>
                </span>
              ) : null}
              <span>Applied {timeAgo(a.createdAt)}</span>
              <span className="capitalize text-slate-500">{a.status}</span>
            </div>

            {a.status === "selected" && a.worker.phone && (
              <a
                href={`tel:${a.worker.phone.replace(/\s/g, "")}`}
                className="mt-3 block rounded-xl bg-lime-400 py-2.5 text-center text-xs font-black text-slate-950"
              >
                📞 Call {a.worker.phone}
              </a>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setDetail(a)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300"
              >
                View profile
              </button>
              {a.status !== "selected" && a.status !== "rejected" && (
                <>
                  {a.status !== "shortlisted" && (
                    <button
                      disabled={busy === a.id}
                      onClick={() => act(a.id, "shortlisted")}
                      className="flex-1 rounded-xl border border-amber-400/40 bg-amber-400/10 py-2.5 text-xs font-bold text-amber-300 disabled:opacity-50"
                    >
                      Shortlist
                    </button>
                  )}
                  <button
                    disabled={busy === a.id}
                    onClick={() => act(a.id, "selected")}
                    className="flex-1 rounded-xl bg-lime-400 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"
                  >
                    Select
                  </button>
                </>
              )}
              {a.status === "selected" && (
                <button
                  disabled={busy === a.id}
                  onClick={() => act(a.id, "completed")}
                  className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-bold text-slate-200 disabled:opacity-50"
                >
                  Mark complete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Worker profile sheet */}
      {detail && (
        <div className="fixed inset-0 z-[1100] flex items-end">
          <button
            aria-label="Close"
            onClick={() => setDetail(null)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-slate-950 p-5 pb-8">
            <div className="flex items-start gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-3xl">
                {detail.worker.avatar}
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {detail.worker.name}{" "}
                  {detail.worker.verified && (
                    <span className="text-xs text-sky-400">✓ Verified</span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  {categoryByKey(detail.worker.trade).label} · {detail.worker.area}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <Stars value={detail.worker.rating} />
                  <span className="font-bold text-slate-200">
                    {detail.worker.rating.toFixed(1)}
                  </span>
                  <span>({detail.worker.ratingCount})</span>
                </div>
              </div>
            </div>

            {detail.worker.bio && (
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                {detail.worker.bio}
              </p>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                [`${detail.worker.experienceYears} yrs`, "Experience"],
                [String(detail.worker.jobsDone), "Jobs done"],
                [`Rs ${detail.worker.baseRate}`, `Per ${detail.worker.priceUnit}`],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-slate-900 p-2.5">
                  <div className="text-sm font-bold text-lime-400">{v}</div>
                  <div className="text-[10px] text-slate-500">{l}</div>
                </div>
              ))}
            </div>

            {splitList(detail.worker.skills).length > 0 && (
              <div className="mt-3">
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {splitList(detail.worker.skills).map((s) => (
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

            <p className="mt-3 text-[10px] text-slate-500">
              Phone number is shared once you select this worker.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => act(detail.id, "rejected")}
                className="flex-1 rounded-xl border border-slate-800 py-3 text-sm font-semibold text-slate-400"
              >
                Reject
              </button>
              <button
                onClick={() => act(detail.id, "selected")}
                className="flex-1 rounded-xl bg-lime-400 py-3 text-sm font-black text-slate-950"
              >
                Select worker
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav mode="hire" />
    </main>
  );
}
