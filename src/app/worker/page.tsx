"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Stars from "@/components/Stars";
import { KTM_AREAS, TRADES, tradeByKey } from "@/lib/trades";
import { useSettings } from "@/lib/useSettings";
import {
  setWorkerToken,
  workerHeaders,
} from "@/lib/clientAuth";

type WorkerProfile = {
  id: number;
  name: string;
  trade: string;
  skills: string;
  bio: string;
  phone: string;
  whatsapp: string;
  avatar: string;
  area: string;
  serviceAreas: string;
  languages: string;
  rating: number;
  ratingCount: number;
  jobsDone: number;
  baseRate: number;
  priceUnit: string;
  experienceYears: number;
  online: boolean;
  etaMins: number;
  verified: boolean;
  status: string;
  lat: number;
  lng: number;
};

type MyBid = {
  id: number;
  price: number;
  etaMins: number;
  status: string;
  request: {
    id: number;
    trade: string;
    description: string;
    offerPrice: number;
    area: string;
    urgency: string;
    status: string;
    customerName: string;
    customerPhone: string;
    address: string;
  };
};

type Job = {
  id: number;
  trade: string;
  description: string;
  offerPrice: number;
  area: string;
  address: string;
  urgency: string;
  customerName: string;
  distanceKm: number;
  // Precise pin used for directions (kept until the job is closed).
  lat: number;
  lng: number;
  pinLat?: number | null;
  pinLng?: number | null;
  myBid: { id: number; price: number; status: string } | null;
};

const AVATARS = ["👨‍🔧", "👩‍🔧", "🧑‍🔧", "👨‍🌾", "👩‍🎨", "🧑‍🏭", "👨‍🏭", "👩‍🌾", "🧑‍🦱", "👷"];

export default function WorkerPage() {
  const settings = useSettings();
  const currency = settings?.currency ?? "Rs";
  const trades = useMemo(
    () =>
      TRADES.filter(
        (t) => !(settings?.disabledTrades ?? "").split(",").map((d) => d.trim()).includes(t.key),
      ),
    [settings?.disabledTrades],
  );

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [bids, setBids] = useState<MyBid[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"jobs" | "bids" | "wallet" | "profile">("jobs");
  const [toast, setToast] = useState("");

  // onboarding / login form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    trade: "electrician",
    area: "Thamel",
    serviceAreas: ["Thamel"] as string[],
    skills: [] as string[],
    experienceYears: 3,
    baseRate: 700,
    priceUnit: "visit",
    languages: "Nepali, English",
    bio: "",
    avatar: "👨‍🔧",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Wallet state
  const [wallet, setWallet] = useState<{
    balance: number;
    leadFee: number;
    minTopup: number;
    walletRequired: boolean;
    currency: string;
    canBid: boolean;
    transactions: {
      id: number;
      type: string;
      amount: number;
      method: string;
      reference: string;
      note: string;
      status: string;
      createdAt: string;
    }[];
  } | null>(null);
  const [topupAmount, setTopupAmount] = useState(500);
  const [topupMethod, setTopupMethod] = useState("esewa");
  const [topupRef, setTopupRef] = useState("");

  const loadMe = useCallback(async () => {
    setLoading(true);
    // Accept a token handed over in the URL (?t=...) — survives page loads even
    // when the browser blocks cookies and localStorage in iframes.
    try {
      const url = new URL(window.location.href);
      const urlToken = url.searchParams.get("t");
      if (urlToken) {
        setWorkerToken(urlToken);
        url.searchParams.delete("t");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""),
        );
      }
    } catch {
      // ignore
    }
    const res = await fetch("/api/worker/me", { headers: workerHeaders() });
    const data = await res.json();
    setProfile(data.provider ?? null);
    setBids(data.bids ?? []);
    if (data.provider) {
      const jr = await fetch("/api/worker/me", {
        method: "PUT",
        headers: workerHeaders(),
      });
      const jd = await jr.json();
      setJobs(jd.jobs ?? []);
      const wr = await fetch("/api/worker/wallet", { headers: workerHeaders() });
      if (wr.ok) setWallet(await wr.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!profile) return;
    // Hydrate the edit form from the saved worker profile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({
      ...f,
      name: profile.name,
      phone: profile.phone,
      whatsapp: profile.whatsapp || profile.phone,
      trade: profile.trade,
      area: KTM_AREAS.some((a) => a.name === profile.area) ? profile.area : "Thamel",
      serviceAreas: (profile.serviceAreas || profile.area)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      skills: (profile.skills || "").split("|").filter(Boolean),
      experienceYears: profile.experienceYears,
      baseRate: profile.baseRate,
      priceUnit: profile.priceUnit,
      languages: profile.languages,
      bio: profile.bio,
      avatar: profile.avatar,
    }));
  }, [profile]);

  const register = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/worker/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not register");
      return;
    }
    if (data.token) {
      setWorkerToken(data.token);
      try {
        if (typeof window !== "undefined")
          window.location.href = `/worker?t=${encodeURIComponent(data.token)}`;
      } catch {
        // ignore
      }
      return;
    }
    setToast(
      data.provider.status === "pending"
        ? "Profile submitted — waiting for admin approval. You got Rs 200 free credit!"
        : "You're live! Jobs will appear here. You got Rs 200 free credit!",
    );
    await loadMe();
  };

  const saveProfile = async () => {
    setBusy(true);
    await fetch("/api/worker/me", {
      method: "PATCH",
      headers: workerHeaders(),
      body: JSON.stringify({ ...form, online: profile?.online }),
    });
    setBusy(false);
    setToast("Profile updated.");
    await loadMe();
  };

  const toggleOnline = async () => {
    await fetch("/api/worker/me", { method: "POST", headers: workerHeaders() });
    await loadMe();
  };

  const [bidDraft, setBidDraft] = useState<
    Record<number, { price: number; etaMins: number; message: string }>
  >({});
  const [incomingJob, setIncomingJob] = useState<Job | null>(null);
  const [incomingBusy, setIncomingBusy] = useState(false);
  const [incomingError, setIncomingError] = useState("");
  // Pin of the customer once accepted — used to draw directions on the map.
  const [acceptedRoute, setAcceptedRoute] = useState<{
    job: Job;
    customerName: string;
    customerPhone: string;
    address: string;
    price: number;
    etaMins: number;
  } | null>(null);

  const bid = async (job: Job, price: number, etaMins: number, message: string) => {
    const res = await fetch("/api/worker/bids", {
      method: "POST",
      headers: workerHeaders(),
      body: JSON.stringify({ requestId: job.id, price, etaMins, message }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error ?? "Could not send offer");
      if (data.needTopup) setTab("wallet");
    } else setToast("Offer sent!");
    await loadMe();
  };

  const openIncoming = (job: Job) => {
    setIncomingError("");
    setIncomingJob(job);
    setBidDraft((d) => ({
      ...d,
      [job.id]: d[job.id] ?? {
        price: Math.max(job.offerPrice, profile?.baseRate ?? 700),
        etaMins: profile?.etaMins ?? 20,
        message: "I can take this job.",
      },
    }));
  };

  const submitRespond = async (action: "accept" | "decline") => {
    if (!incomingJob) return;
    setIncomingBusy(true);
    setIncomingError("");
    const draft = bidDraft[incomingJob.id] ?? {
      price: incomingJob.offerPrice,
      etaMins: 20,
      message: "",
    };
    const res = await fetch(`/api/worker/respond/${incomingJob.id}`, {
      method: "POST",
      headers: workerHeaders(),
      body: JSON.stringify({
        action,
        price: draft.price,
        etaMins: draft.etaMins,
        message: draft.message,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setIncomingBusy(false);
    if (!res.ok) {
      setIncomingError(data.error ?? "Action failed");
      if (data.needTopup) setTab("wallet");
      return;
    }
    if (action === "accept") {
      try {
        const detail = await fetch(`/api/requests/${incomingJob.id}`).then((r) => r.json());
        const req = detail.request ?? {};
        setAcceptedRoute({
          job: incomingJob,
          customerName: req.customerName || incomingJob.customerName,
          customerPhone: req.customerPhone || "",
          address: req.address || "",
          price: draft.price,
          etaMins: draft.etaMins,
        });
      } catch {
        setAcceptedRoute({
          job: incomingJob,
          customerName: incomingJob.customerName,
          customerPhone: "",
          address: "",
          price: draft.price,
          etaMins: draft.etaMins,
        });
      }
      setToast("🎉 Accepted! Directions to the customer are ready.");
    } else {
      setToast("Declined. We won't show this request again.");
    }
    setIncomingJob(null);
    await loadMe();
  };

  const submitTopup = async () => {
    setBusy(true);
    const res = await fetch("/api/worker/wallet", {
      method: "POST",
      headers: workerHeaders(),
      body: JSON.stringify({
        amount: topupAmount,
        method: topupMethod,
        reference: topupRef,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setToast(data.error ?? "Top-up failed");
      return;
    }
    setTopupRef("");
    setToast(data.message ?? "Top-up submitted for admin approval!");
    await loadMe();
  };

  if (loading) return <main className="p-8 text-slate-400">Loading worker mode…</main>;

  /* ------------------------------ onboarding ------------------------------ */
  if (!profile) {
    const tradeDef = tradeByKey(form.trade);
    const skillOptions = tradeDef.skills;
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">
          🛠️ Worker mode — publish your real skills
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Create your worker profile for Kathmandu Valley. Customers see your
          skills, experience, rates and rating on the map, and can book you
          directly.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Mobile (98xxxxxxxx)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.trade}
                onChange={(e) => setForm({ ...form, trade: e.target.value, skills: [] })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                {trades.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="WhatsApp / Viber"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-slate-300">
                Your actual skills — pick what you truly do
              </div>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((s) => {
                  const on = form.skills.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() =>
                        setForm({
                          ...form,
                          skills: on ? form.skills.filter((x) => x !== s) : [...form.skills, s],
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        on
                          ? "border-lime-400 bg-lime-400 text-slate-950"
                          : "border-slate-700 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-slate-400">
                Experience (years)
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.experienceYears}
                  onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-400">
                Rate ({currency})
                <input
                  type="number"
                  min={100}
                  value={form.baseRate}
                  onChange={(e) => setForm({ ...form, baseRate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-400">
                Per
                <select
                  value={form.priceUnit}
                  onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="visit">visit</option>
                  <option value="hour">hour</option>
                  <option value="day">day</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">
                Base area (where you are)
                <select
                  value={form.area}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      area: e.target.value,
                      serviceAreas: Array.from(new Set([...form.serviceAreas, e.target.value])),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  {KTM_AREAS.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Languages
                <input
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold text-slate-300">
                Areas you will travel to
              </div>
              <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                {KTM_AREAS.map((a) => {
                  const on = form.serviceAreas.includes(a.name);
                  return (
                    <button
                      key={a.name}
                      onClick={() =>
                        setForm({
                          ...form,
                          serviceAreas: on
                            ? form.serviceAreas.filter((x) => x !== a.name)
                            : [...form.serviceAreas, a.name],
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        on ? "bg-sky-500 text-slate-950" : "bg-slate-950 text-slate-400 ring-1 ring-slate-700"
                      }`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              placeholder="Describe your work: tools you own, jobs you have done, certificates (CTEVT etc.)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />

            <div>
              <div className="mb-1 text-xs text-slate-400">Choose your avatar</div>
              <div className="flex flex-wrap gap-1">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setForm({ ...form, avatar: a })}
                    className={`grid h-9 w-9 place-items-center rounded-lg text-lg ${
                      form.avatar === a ? "bg-lime-400" : "bg-slate-950 ring-1 ring-slate-700"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}
            <button
              onClick={register}
              disabled={busy}
              className="w-full rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50"
            >
              {busy ? "Creating profile…" : "Publish my worker profile"}
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-lime-400/40 bg-lime-400/5 p-4">
              <h2 className="text-sm font-bold">Already registered?</h2>
              <p className="mb-3 text-xs text-slate-400">
                Everyone signs in on one page — use the mobile number you
                registered with.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-lime-400 py-2.5 text-center text-sm font-black text-slate-950 transition hover:bg-lime-300"
              >
                Go to login
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">
              <div className="mb-1 font-bold text-slate-200">How it works</div>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Publish skills, rate and service areas.</li>
                <li>Admin verifies your profile (usually same day).</li>
                <li>Go online and see live jobs near you.</li>
                <li>Send your price offer — customer accepts, you work.</li>
                <li>Platform commission {settings?.commissionPct ?? 12}% per job.</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* -------------------------------- dashboard ------------------------------ */
  const t = tradeByKey(profile.trade);
  const skillList = (profile.skills || "").split("|").filter(Boolean);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {toast && (
        <div className="mb-3 rounded-xl bg-lime-400/10 px-3 py-2 text-xs font-semibold text-lime-300 ring-1 ring-lime-400/30">
          {toast}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-3xl">
            {profile.avatar}
          </span>
          <div>
            <div className="text-lg font-extrabold">
              {profile.name}{" "}
              {profile.verified && (
                <span className="text-xs font-bold text-sky-400">✔ verified</span>
              )}
            </div>
            <div className="text-xs text-slate-400">
              {t.emoji} {t.label} · {profile.area} · {profile.experienceYears} yrs ·{" "}
              {currency} {profile.baseRate}/{profile.priceUnit}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <Stars value={profile.rating} /> {profile.rating.toFixed(1)} (
              {profile.ratingCount}) · {profile.jobsDone} jobs · status:{" "}
              <span
                className={
                  profile.status === "approved"
                    ? "font-bold text-lime-400"
                    : "font-bold text-amber-400"
                }
              >
                {profile.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleOnline}
            className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
              profile.online ? "bg-lime-400 text-slate-950" : "bg-slate-800 text-slate-300"
            }`}
          >
            {profile.online ? "🟢 Online — accepting jobs" : "⚪ Offline"}
          </button>
        </div>
      </div>

      {profile.status === "pending" && (
        <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Your profile is pending admin approval. You can complete your details but
          offers will unlock after approval.
        </div>
      )}

      {wallet && wallet.walletRequired && !wallet.canBid && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
          <span>
            ⚠️ Balance too low ({wallet.currency} {wallet.balance}). You need at
            least {wallet.currency} {wallet.leadFee} to send offers.
          </span>
          <button
            onClick={() => setTab("wallet")}
            className="rounded-lg bg-rose-400 px-3 py-1 font-extrabold text-slate-950"
          >
            💳 Top up now
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
        {(["jobs", "bids", "wallet", "profile"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 ${
              tab === k ? "bg-lime-400 text-slate-950" : "bg-slate-900 text-slate-300"
            }`}
          >
            {k === "jobs"
              ? `Live jobs (${jobs.length})`
              : k === "bids"
                ? `My offers (${bids.length})`
                : k === "wallet"
                  ? `💳 Wallet (${wallet ? `${wallet.currency} ${wallet.balance}` : "…"})`
                  : "Edit profile & skills"}
          </button>
        ))}
      </div>

      {tab === "wallet" && wallet && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Balance + Top-up */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-lime-400/40 bg-slate-900 p-5">
              <div className="text-xs font-bold uppercase text-slate-400">
                My wallet balance
              </div>
              <div className="mt-1 text-4xl font-black text-lime-400">
                {wallet.currency} {wallet.balance}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Each accepted job costs{" "}
                <b className="text-slate-200">
                  {wallet.currency} {wallet.leadFee}
                </b>{" "}
                lead fee. That means you can win about{" "}
                <b className="text-lime-300">
                  {Math.floor(wallet.balance / Math.max(1, wallet.leadFee))} more jobs
                </b>{" "}
                with this balance.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-1 text-sm font-extrabold">💳 Top up balance</h3>
              <p className="mb-3 text-xs text-slate-400">
                1) Send money to KaamSathi. 2) Enter the amount & transaction ID.
                3) Admin verifies & your balance is added.
              </p>
              <div className="mb-2 grid grid-cols-4 gap-1.5">
                {[300, 500, 1000, 2000].map((a) => (
                  <button
                    key={a}
                    onClick={() => setTopupAmount(a)}
                    className={`rounded-lg py-2 text-xs font-extrabold ${
                      topupAmount === a
                        ? "bg-lime-400 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-400">
                  Amount ({wallet.currency})
                  <input
                    type="number"
                    min={wallet.minTopup}
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Paid via
                  <select
                    value={topupMethod}
                    onChange={(e) => setTopupMethod(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="esewa">eSewa</option>
                    <option value="khalti">Khalti</option>
                    <option value="bank">Bank transfer</option>
                    <option value="cash">Cash at office</option>
                  </select>
                </label>
              </div>
              <input
                value={topupRef}
                onChange={(e) => setTopupRef(e.target.value)}
                placeholder="Transaction ID / reference (e.g. 0AB12CD34)"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <button
                onClick={submitTopup}
                disabled={busy}
                className="mt-3 w-full rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50"
              >
                {busy ? "Submitting…" : `Submit top-up ${wallet.currency} ${topupAmount}`}
              </button>
              <p className="mt-2 text-[10px] text-slate-500">
                Minimum top-up {wallet.currency} {wallet.minTopup}. Admin approves
                within minutes during work hours.
              </p>
            </div>
          </div>

          {/* Transaction history */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-2 text-sm font-extrabold">📒 Transaction history</h3>
            <div className="space-y-2">
              {wallet.transactions.length === 0 && (
                <p className="text-xs text-slate-500">No transactions yet.</p>
              )}
              {wallet.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-slate-950 p-2.5 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-200">
                      {tx.type === "topup"
                        ? "💳 Top-up"
                        : tx.type === "lead_fee"
                          ? "🧾 Job lead fee"
                          : tx.type === "refund"
                            ? "↩️ Refund"
                            : "⚙️ Admin adjustment"}
                      <span className="ml-1 text-slate-500">({tx.method})</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tx.note || tx.reference} ·{" "}
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-extrabold ${
                        tx.amount >= 0 ? "text-lime-400" : "text-rose-400"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase ${
                        tx.status === "approved"
                          ? "text-lime-500"
                          : tx.status === "pending"
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {jobs.length === 0 && (
            <p className="text-sm text-slate-400">
              No open {t.label.toLowerCase()} jobs right now. Stay online — new
              requests appear here instantly.
            </p>
          )}
          {jobs.map((j) => {
            const draft =
              bidDraft[j.id] ?? {
                price: Math.max(j.offerPrice, profile.baseRate),
                etaMins: profile.etaMins,
                message: "I can do this job, aaudai chhu.",
              };
            return (
              <div key={j.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">
                      {j.description || "Job request"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {j.area} · {j.distanceKm.toFixed(1)} km ·{" "}
                      {j.urgency === "now" ? "🔴 Urgent" : j.urgency} ·{" "}
                      {j.customerName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Customer offers</div>
                    <div className="font-extrabold text-lime-400">
                      {currency} {j.offerPrice}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-950 p-3 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">
                      Status:{" "}
                      <span className="font-bold text-slate-200">
                        {j.myBid ? j.myBid.status : "open — tap to respond"}
                      </span>
                    </div>
                    {j.myBid && (
                      <div className="text-[11px] text-slate-400">
                        Your price: {currency} {j.myBid.price}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openIncoming(j)}
                    className="rounded-xl bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-lime-300 hover:bg-slate-700"
                  >
                    {j.myBid?.status === "accepted" ? "Open directions" : "Open"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "bids" && (
        <div className="mt-4 space-y-3">
          {bids.length === 0 && (
            <p className="text-sm text-slate-400">You have not sent any offers yet.</p>
          )}
          {bids.map((b) => (
            <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold">{b.request.description || "Job"}</div>
                <div className="font-extrabold text-lime-400">
                  {currency} {b.price}
                </div>
              </div>
              <div className="text-xs text-slate-400">
                {tradeByKey(b.request.trade).label} · {b.request.area} ·{" "}
                {b.request.customerName} · job status {b.request.status}
              </div>
              <div className="mt-2 text-xs">
                Your offer is{" "}
                <span
                  className={
                    b.status === "accepted"
                      ? "font-bold text-lime-400"
                      : b.status === "rejected"
                        ? "font-bold text-rose-400"
                        : "font-bold text-amber-400"
                  }
                >
                  {b.status}
                </span>
              </div>
              {b.status === "accepted" && (
                <div className="mt-2 rounded-lg bg-slate-950 p-2 text-xs text-slate-200">
                  📞 {b.request.customerPhone || "Phone hidden"} ·{" "}
                  {b.request.address || b.request.area}
                </div>
              )}
              <Link href={`/request/${b.request.id}`} className="mt-2 inline-block text-xs text-lime-300">
                Open job page →
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === "profile" && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-bold">Profile & skills</h2>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Name"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="WhatsApp"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                value={form.languages}
                onChange={(e) => setForm({ ...form, languages: e.target.value })}
                placeholder="Languages"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-slate-400">
                Experience
                <input
                  type="number"
                  value={form.experienceYears}
                  onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-400">
                Rate ({currency})
                <input
                  type="number"
                  value={form.baseRate}
                  onChange={(e) => setForm({ ...form, baseRate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-400">
                Per
                <select
                  value={form.priceUnit}
                  onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="visit">visit</option>
                  <option value="hour">hour</option>
                  <option value="day">day</option>
                </select>
              </label>
            </div>
            <label className="text-xs text-slate-400">
              Main service category
              <select
                value={form.trade}
                onChange={(e) => setForm({ ...form, trade: e.target.value, skills: [] })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                {trades.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.emoji} {x.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Base area
              <select
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                {KTM_AREAS.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="About your work"
            />
            <button
              onClick={saveProfile}
              disabled={busy}
              className="w-full rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-1 text-sm font-bold">Skills offered</div>
              <div className="flex flex-wrap gap-2">
                {tradeByKey(form.trade).skills.map((s) => {
                  const on = form.skills.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() =>
                        setForm({
                          ...form,
                          skills: on ? form.skills.filter((x) => x !== s) : [...form.skills, s],
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        on
                          ? "border-lime-400 bg-lime-400 text-slate-950"
                          : "border-slate-700 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-1 text-sm font-bold">Service areas</div>
              <div className="flex flex-wrap gap-1">
                {KTM_AREAS.map((a) => {
                  const on = form.serviceAreas.includes(a.name);
                  return (
                    <button
                      key={a.name}
                      onClick={() =>
                        setForm({
                          ...form,
                          serviceAreas: on
                            ? form.serviceAreas.filter((x) => x !== a.name)
                            : [...form.serviceAreas, a.name],
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        on ? "bg-sky-500 text-slate-950" : "bg-slate-950 text-slate-400 ring-1 ring-slate-700"
                      }`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-2 text-sm font-bold">Live public preview</div>
              <div className="rounded-xl bg-slate-950 p-3 text-xs text-slate-300">
                <div className="text-base font-bold text-slate-100">
                  {form.avatar} {form.name || "Your name"}
                </div>
                <div className="text-slate-400">
                  {t.emoji} {tradeByKey(form.trade).label} · {form.area} ·{" "}
                  {form.experienceYears} yrs
                </div>
                <div className="mt-1 text-lime-400">
                  {currency} {form.baseRate}/{form.priceUnit}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {skillList.map((s) => (
                    <span key={s} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/provider/${profile.id}`}
                className="mt-2 inline-block text-xs text-lime-300"
              >
                Open my public profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ============================ Worker job pop-up ====================== */}
      {incomingJob && (
        <JobPopUp
          job={incomingJob}
          draft={bidDraft[incomingJob.id] ?? { price: incomingJob.offerPrice, etaMins: 20, message: "" }}
          setDraft={(d) =>
            setBidDraft((m) => ({ ...m, [incomingJob.id]: d }))
          }
          busy={incomingBusy}
          error={incomingError}
          currency={currency}
          onAccept={() => submitRespond("accept")}
          onDecline={() => submitRespond("decline")}
          onClose={() => {
            setIncomingJob(null);
            setIncomingError("");
          }}
        />
      )}

      {/* ============================ Accepted route map ===================== */}
      {acceptedRoute && (
        <AcceptedRouteCard
          route={acceptedRoute}
          currency={currency}
          workerLat={profile.lat}
          workerLng={profile.lng}
          onClose={() => setAcceptedRoute(null)}
        />
      )}
    </main>
  );
}

/* ----------------------------- Worker pop-up ------------------------------ */
function JobPopUp({
  job,
  draft,
  setDraft,
  busy,
  error,
  currency,
  onAccept,
  onDecline,
  onClose,
}: {
  job: Job;
  draft: { price: number; etaMins: number; message: string };
  setDraft: (d: { price: number; etaMins: number; message: string }) => void;
  busy: boolean;
  error: string;
  currency: string;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3">
      <button
        type="button"
        aria-label="Close job details"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-lime-400 bg-slate-950 shadow-2xl shadow-lime-400/20">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <div className="text-base font-black text-lime-400">
              🛠️ New service request
            </div>
            <div className="text-[11px] text-slate-400">
              Customer needs {tradeByKey(job.trade).label} in {job.area}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-4 space-y-3 text-xs">
          <div className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-3">
            <div className="text-[11px] font-bold uppercase text-sky-300">
              Customer request
            </div>
            <div className="mt-1 text-sm font-bold text-slate-100">
              {tradeByKey(job.trade).emoji} {tradeByKey(job.trade).label} ·{" "}
              {currency} {job.offerPrice}
            </div>
            <div className="text-[11px] text-slate-400">
              {job.customerName} · {job.area} · {job.distanceKm.toFixed(1)} km
              from you ·{" "}
              {job.urgency === "now" ? "🔴 Urgent" : job.urgency}
            </div>
            {job.description && (
              <p className="mt-2 rounded-lg bg-slate-950 p-2 text-slate-200">
                “{job.description}”
              </p>
            )}
            <p className="mt-2 text-[10px] text-amber-300">
              🔒 The customer&rsquo;s phone is hidden. You&rsquo;ll only see it after you
              accept.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-slate-300">
              <span className="mb-1 block text-[11px] font-bold">
                Your price ({currency})
              </span>
              <input
                type="number"
                value={draft.price}
                onChange={(e) =>
                  setDraft({ ...draft, price: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
              />
            </label>
            <label className="block text-slate-300">
              <span className="mb-1 block text-[11px] font-bold">
                ETA (min)
              </span>
              <input
                type="number"
                value={draft.etaMins}
                onChange={(e) =>
                  setDraft({ ...draft, etaMins: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
              />
            </label>
          </div>

          <label className="block text-slate-300">
            <span className="mb-1 block text-[11px] font-bold">
              Message to customer
            </span>
            <textarea
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              rows={2}
              placeholder="Confirming your ETA, materials needed…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-lime-400 focus:outline-none"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onDecline}
              disabled={busy}
              className="rounded-2xl border border-slate-600 bg-slate-900 py-3 text-sm font-extrabold text-slate-200 disabled:opacity-50"
            >
              {busy ? "…" : "✕ Decline"}
            </button>
            <button
              onClick={onAccept}
              disabled={busy}
              className="rounded-2xl bg-lime-400 py-3 text-sm font-black text-slate-950 shadow-md shadow-lime-400/30 disabled:opacity-50"
            >
              {busy ? "Sending…" : "✓ Accept & go"}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-500">
            Accepting deducts a small lead fee from your wallet and reveals the
            customer&rsquo;s phone + map pin.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Accepted route card ----------------------------- */
function AcceptedRouteCard({
  route,
  currency,
  workerLat,
  workerLng,
  onClose,
}: {
  route: {
    job: Job;
    customerName: string;
    customerPhone: string;
    address: string;
    price: number;
    etaMins: number;
  };
  currency: string;
  workerLat: number;
  workerLng: number;
  onClose: () => void;
}) {
  const job = route.job;
  const lat = job.pinLat ?? job.lat;
  const lng = job.pinLng ?? job.lng;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${workerLat},${workerLng}&destination=${lat},${lng}&travelmode=driving`;

  return (
    <div className="fixed inset-x-2 bottom-3 z-[3500] mx-auto flex max-w-2xl justify-center sm:inset-x-4">
      <div className="pointer-events-auto w-full rounded-2xl border-2 border-lime-400 bg-slate-950/95 p-4 shadow-2xl shadow-lime-400/30 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-lime-400">
              🎉 You&rsquo;re hired!
            </div>
            <div className="text-base font-extrabold text-slate-100">
              📍 {route.customerName} · {currency} {route.price}
            </div>
            <div className="text-xs text-slate-400">
              {route.address || job.area} · ETA {route.etaMins} min
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={`tel:${route.customerPhone.replace(/[^0-9+]/g, "")}`}
            className="rounded-xl bg-sky-500/15 px-3 py-2.5 text-center text-sm font-bold text-sky-300 ring-1 ring-sky-400/30 hover:bg-sky-500/25"
          >
            📞 Call {route.customerPhone || "customer"}
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-lime-400 px-3 py-2.5 text-center text-sm font-black text-slate-950 shadow-md shadow-lime-400/30 hover:bg-lime-300"
          >
            🧭 Get directions
          </a>
        </div>

        <RouteMapPreview
          fromLat={workerLat}
          fromLng={workerLng}
          toLat={lat}
          toLng={lng}
          customerName={route.customerName}
          workerName="You"
        />

        <p className="mt-2 text-center text-[10px] text-slate-500">
          Map shows a straight-line preview. Tap “Get directions” for live
          navigation in Google Maps.
        </p>
      </div>
    </div>
  );
}

function RouteMapPreview({
  fromLat,
  fromLng,
  toLat,
  toLng,
  customerName,
  workerName,
}: {
  fromLat: number;
  fromLng: number;
  toLng: number;
  toLat: number;
  customerName: string;
  workerName: string;
}) {
  // Simple SVG mini-map with two pins and a poly-line between them.
  const dx = fromLng < toLng ? -1 : 1;
  const dy = fromLat < toLat ? -1 : 1;
  const span = Math.max(
    Math.abs(toLng - fromLng),
    Math.abs(toLat - fromLat),
    0.005,
  );
  const minLng = Math.min(fromLng, toLng) - span * 0.2;
  const maxLng = Math.max(fromLng, toLng) + span * 0.2;
  const minLat = Math.min(fromLat, toLat) - span * 0.2;
  const maxLat = Math.max(fromLat, toLat) + span * 0.2;
  const proj = (lat: number, lng: number) => ({
    x: ((lng - minLng) / (maxLng - minLng || 1)) * 100,
    y: 100 - ((lat - minLat) / (maxLat - minLat || 1)) * 100,
  });
  const a = proj(fromLat, fromLng);
  const b = proj(toLat, toLng);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <svg viewBox="0 0 100 100" className="h-44 w-full">
        <rect width="100" height="100" fill="#020617" />
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="#a3e635"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <circle cx={a.x} cy={a.y} r="4" fill="#0ea5e9" />
        <text
          x={a.x + 2}
          y={a.y - 2}
          fontSize="4"
          fill="#e2e8f0"
          fontFamily="sans-serif"
        >
          {workerName}
        </text>
        <circle cx={b.x} cy={b.y} r="4" fill="#a3e635" />
        <text
          x={b.x + 2}
          y={b.y - 2}
          fontSize="4"
          fill="#e2e8f0"
          fontFamily="sans-serif"
        >
          {customerName}
        </text>
      </svg>
    </div>
  );
}
