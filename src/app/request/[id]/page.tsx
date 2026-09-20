"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MapClient from "@/components/MapClient";
import type { MapProvider } from "@/components/MapView";
import Stars from "@/components/Stars";
import { tradeByKey } from "@/lib/trades";
import { useSettings } from "@/lib/useSettings";

type Bid = {
  id: number;
  price: number;
  etaMins: number;
  message: string;
  status: string;
  source: string;
  provider: MapProvider;
};

type JobRequest = {
  id: number;
  customerName: string;
  customerPhone: string;
  trade: string;
  description: string;
  offerPrice: number;
  lat: number;
  lng: number;
  area: string;
  address: string;
  urgency: string;
  status: string;
  acceptedOfferId: number | null;
  radiusKm?: number;
};

export default function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const settings = useSettings();
  const currency = settings?.currency ?? "Rs";
  const [request, setRequest] = useState<JobRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/requests/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setRequest(data.request);
    setBids(data.bids ?? []);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [load]);

  const accept = async (bidId: number) => {
    setBusy(true);
    await fetch(`/api/requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId }),
    });
    await load();
    setBusy(false);
  };

  const complete = async () => {
    setBusy(true);
    await fetch(`/api/requests/${id}`, { method: "PUT" });
    await load();
    setBusy(false);
  };

  const [editingArea, setEditingArea] = useState(false);
  const [pendingArea, setPendingArea] = useState<number | null>(null);
  const [areaBusy, setAreaBusy] = useState(false);

  const saveArea = async () => {
    if (pendingArea == null || !request) return;
    setAreaBusy(true);
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radiusKm: pendingArea }),
    });
    setAreaBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      setEditingArea(false);
      alert(data.error ?? "Could not update area");
      return;
    }
    const data = await res.json();
    setRequest(data.request);
    setEditingArea(false);
    setPendingArea(null);
    await load();
  };

  if (!request)
    return <main className="p-8 text-slate-400">Loading request…</main>;

  const t = tradeByKey(request.trade);
  const accepted = bids.find((b) => b.id === request.acceptedOfferId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="text-xs text-lime-400">
        ← Back to map
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">
        {t.emoji} {t.label} needed in {request.area || "Kathmandu"}
      </h1>
      <p className="text-sm text-slate-400">
        {request.description || "No description"} · You offered{" "}
        <span className="font-bold text-lime-400">
          {currency} {request.offerPrice}
        </span>
        {request.address ? ` · ${request.address}` : ""} ·{" "}
        {request.urgency === "now" ? "🔴 urgent" : request.urgency} · area{" "}
        <b className="text-sky-300">{(request.radiusKm ?? 1).toFixed(1)} km</b>
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-800">
          <MapClient
            center={{ lat: request.lat, lng: request.lng }}
            providers={bids.map((b) => b.provider)}
            radiusKm={request.radiusKm ?? 1}
            selectedId={accepted?.provider.id ?? null}
          />
        </div>

        <div className="space-y-3">
          {/* Editable work request area — only while the request is still open */}
          <div className="rounded-2xl border border-sky-400/40 bg-sky-400/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-sky-300">
                  Work request area
                </div>
                <div className="text-3xl font-black text-lime-400">
                  {(request.radiusKm ?? 1).toFixed(1)} km
                </div>
                <div className="text-[11px] text-slate-400">
                  Pros outside this radius can’t see or bid on this job.
                </div>
              </div>
              {request.status === "open" && !editingArea && (
                <button
                  onClick={() => {
                    setEditingArea(true);
                    setPendingArea(request.radiusKm ?? 1);
                  }}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-sky-300 ring-1 ring-sky-400/40 hover:bg-slate-800"
                >
                  ✏️ Update
                </button>
              )}
            </div>

            {editingArea && (
              <div className="mt-3 space-y-2 rounded-xl bg-slate-950/60 p-3">
                <input
                  type="range"
                  min={0.5}
                  max={15}
                  step={0.5}
                  value={pendingArea ?? 1}
                  onChange={(e) => setPendingArea(Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5].map((km) => (
                    <button
                      key={km}
                      onClick={() => setPendingArea(km)}
                      className={`flex-1 rounded-lg py-1 text-xs font-bold transition ${
                        pendingArea === km
                          ? "bg-sky-400 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveArea}
                    disabled={areaBusy}
                    className="flex-1 rounded-xl bg-lime-400 py-2 text-xs font-extrabold text-slate-950 disabled:opacity-50"
                  >
                    {areaBusy ? "Saving…" : "Save area"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingArea(false);
                      setPendingArea(null);
                    }}
                    className="flex-1 rounded-xl border border-slate-700 py-2 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {accepted && (
            <div className="rounded-2xl border border-lime-400 bg-lime-400/10 p-4">
              <div className="text-xs font-bold uppercase text-lime-400">
                {request.status === "completed" ? "Completed" : "Worker booked"}
              </div>
              <div className="text-lg font-extrabold">
                {accepted.provider.avatar} {accepted.provider.name} · {currency}{" "}
                {accepted.price}
              </div>
              <div className="text-sm text-slate-300">
                Arriving in ~{accepted.etaMins} min · 📞{" "}
                {accepted.provider.phone}
              </div>
              <div className="mt-2 flex gap-2">
                <Link
                  href={`/provider/${accepted.provider.id}`}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-lime-300"
                >
                  Rate this worker
                </Link>
                {request.status === "accepted" && (
                  <button
                    onClick={complete}
                    disabled={busy}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-50"
                  >
                    Mark completed
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="text-sm font-bold text-slate-300">
            {bids.length} offers received
            {request.status === "open" && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                (auto-refreshing)
              </span>
            )}
          </div>
          {bids.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
              No workers of this trade are available nearby yet. Try a wider
              radius or post again later.
            </div>
          )}
          {bids.map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl border p-4 ${
                b.status === "accepted"
                  ? "border-lime-400 bg-slate-900"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">
                    {b.provider.avatar} {b.provider.name}
                    {b.provider.verified && (
                      <span className="ml-1 text-[10px] font-bold text-sky-400">✔</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Stars value={b.provider.rating} />
                    {b.provider.rating.toFixed(1)} ({b.provider.ratingCount}) ·{" "}
                    {b.provider.experienceYears} yrs · {b.provider.area}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(b.provider.skills || "")
                      .split("|")
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((s) => (
                        <span
                          key={s}
                          className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                        >
                          {s}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-lime-400">
                    {currency} {b.price}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {b.etaMins} min away
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-300">“{b.message}”</p>
              {request.status === "open" ? (
                <button
                  onClick={() => accept(b.id)}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl bg-lime-400 py-2 text-sm font-extrabold text-slate-950 disabled:opacity-50"
                >
                  Accept {currency} {b.price}
                </button>
              ) : (
                <div className="mt-3 text-xs font-semibold uppercase text-slate-500">
                  {b.status}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
