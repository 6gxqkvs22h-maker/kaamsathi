"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MapClient from "@/components/MapClient";
import type { MapProvider } from "@/components/MapView";
import Stars from "@/components/Stars";
import {
  DEFAULT_CENTER,
  KTM_AREAS,
  nearestArea,
  TRADES,
  tradeByKey,
} from "@/lib/trades";
import { useSettings } from "@/lib/useSettings";
import {
  clearCustomerToken,
  customerHeaders,
  getCustomerToken,
  setCustomerToken,
} from "@/lib/clientAuth";

type Customer = {
  id: number;
  name: string;
  username: string;
  phone: string;
  area: string;
  avatar: string;
};

export default function HomePage() {
  const router = useRouter();
  const settings = useSettings();
  const currency = settings?.currency ?? "Rs";
  const disabled = (settings?.disabledTrades ?? "").split(",").map((d) => d.trim());
  const trades = TRADES.filter((t) => !disabled.includes(t.key));

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [trade, setTrade] = useState("");
  const [radius, setRadius] = useState(6);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("distance");
  const [area, setArea] = useState("");
  const [q, setQ] = useState("");
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickMode, setPickMode] = useState(false);

  const [hudFilterOpen, setHudFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Customer login + GPS state — required before opening the request form.
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [gpsMessage, setGpsMessage] = useState("");

  // Trigger the browser's precise GPS. Promise resolves when done.
  const runGps = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus("error");
        setGpsMessage("Geolocation is unavailable in this browser. Try again.");
        resolve();
        return;
      }
      setGpsMessage("Getting your precise GPS location…");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPinLat(pos.coords.latitude);
          setPinLng(pos.coords.longitude);
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setArea(nearestArea(pos.coords.latitude, pos.coords.longitude));
          setGpsStatus("ok");
          setGpsMessage(
            `📍 pin set at ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          );
          resolve();
        },
        (err) => {
          setGpsStatus("error");
          setGpsMessage(
            err.message ||
              "Could not read your location. Allow GPS in browser settings.",
          );
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  }, []);

  // Auto-center the map on the user's GPS as soon as the page loads,
  // instead of requiring a tap on "Share GPS" first.
  useEffect(() => {
    void runGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reuse header "openForm" intent: gate on login + GPS.
  const openForm = async () => {
    if (!customer) {
      setShowLoginPanel(true);
      return;
    }
    if (!pinLat || !pinLng) {
      setGpsStatus("loading");
      setGpsMessage("Getting your GPS location…");
      await runGps();
      if (!pinLat || !pinLng) return;
    }
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(700);
  const [address, setAddress] = useState("");
  const [urgency, setUrgency] = useState("now");
  const [posting, setPosting] = useState(false);
  // Direct request to one specific worker
  const [targetPro, setTargetPro] = useState<MapProvider | null>(null);
  // Work request area — the radius sent to the API and shown on the map.
  // 1 km default: only pros inside this area can see the request.
  const [requestAreaKm, setRequestAreaKm] = useState(1);

  const selectTrade = (t: string) => {
    setTrade(t);
    if (t && settings?.tradeRates?.[t]) {
      setPrice(settings.tradeRates[t]);
    }
  };

  const [initializedRadius, setInitializedRadius] = useState(false);
  if (settings && !initializedRadius) {
    setInitializedRadius(true);
    setRadius(settings.defaultRadiusKm);
    if (trade && settings.tradeRates?.[trade]) {
      setPrice(settings.tradeRates[trade]);
    }
  }
  // Map circle follows the work-request area while the user is composing.
  // Map circle follows the work-request area while the modal is open, else the
  // general search radius — so users see exactly what the form will publish.
  const displayRadius = formOpen ? requestAreaKm : radius;

  // Try to restore an existing customer session, and handle the deep links
  // /?ct=<token> (login redirect) and /?tpro=<id> (open a request modal for that pro).
  useEffect(() => {
    let cancelled = false;
    try {
      const url = new URL(window.location.href);
      const urlToken = url.searchParams.get("ct");
      if (urlToken) {
        setCustomerToken(urlToken);
        url.searchParams.delete("ct");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""),
        );
      }
      const tproId = Number(url.searchParams.get("tpro"));
      if (tproId) {
        url.searchParams.delete("tpro");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""),
        );
        void fetch(`/api/providers/${tproId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (!cancelled && d?.provider) {
              const safe: MapProvider = { ...d.provider };
              setTrade(safe.trade);
              setPrice(safe.baseRate);
              setTargetPro(safe);
            }
          })
          .catch(() => {
            // ignore
          });
      }
    } catch {
      // ignore
    }
    const token = getCustomerToken();
    if (!token) return;
    void fetch("/api/auth/customer/me", { headers: customerHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d?.customer) setCustomer(d.customer);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      trade,
      q,
      area,
      lat: String(center.lat),
      lng: String(center.lng),
      radius: String(radius),
      minRating: String(minRating),
      sort,
      online: onlineOnly ? "1" : "0",
      verified: verifiedOnly ? "1" : "0",
    });
    const res = await fetch(`/api/providers?${params}`);
    const data = await res.json();
    setProviders(data.providers ?? []);
    setLoading(false);
  }, [trade, q, area, center, radius, minRating, sort, onlineOnly, verifiedOnly]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const useMyLocation = () => {
    void runGps();
  };

  const customerLogout = () => {
    clearCustomerToken();
    setCustomer(null);
    setFormOpen(false);
  };

  const avgPrice = useMemo(() => {
    if (!providers.length) return 0;
    return Math.round(providers.reduce((s, p) => s + p.baseRate, 0) / providers.length);
  }, [providers]);

  const selectedProvider = useMemo(() => {
    if (!selected) return null;
    return providers.find((p) => p.id === selected) ?? null;
  }, [providers, selected]);

  const postJob = async () => {
    if (!trade) {
      alert("Pick a service category first");
      return;
    }
    if (!phone.trim()) {
      alert("Add your phone number so workers can reach you");
      return;
    }
    setPosting(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: customerHeaders(),
      body: JSON.stringify({
        customerName: customer?.name ?? name,
        customerPhone: customer?.phone ?? phone,
        trade,
        description: desc,
        offerPrice: price,
        lat: center.lat,
        lng: center.lng,
        pinLat: pinLat ?? center.lat,
        pinLng: pinLng ?? center.lng,
        area: area || nearestArea(center.lat, center.lng),
        address,
        urgency,
        targetProviderId: targetPro?.id ?? null,
        radiusKm: requestAreaKm,
      }),
    });
    const data = await res.json();
    setPosting(false);
    // Redirect straight to the individual request page with live offers
    if (data.request) {
      setFormOpen(false);
      router.push(`/request/${data.request.id}`);
    } else alert(data.error ?? "Could not post the job");
  };

  // Esc closes the modal
  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  return (
    <main className="relative h-[calc(100vh-62px)] w-full overflow-hidden bg-slate-950">
      {/* ========================================================================= */}
      {/* 1. Full-Bleed map                                                            */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0">
        <MapClient
          center={center}
          providers={providers}
          radiusKm={displayRadius}
          selectedId={selected}
          currency={currency}
          showPrices
          onSelect={(id) => {
            setSelected(id);
          }}
          onPick={
            pickMode
              ? (lat, lng) => {
                  setCenter({ lat, lng });
                  setArea(nearestArea(lat, lng));
                  setPickMode(false);
                }
              : undefined
          }
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. Top Compact Category Ribbon (Floating, horizontally scrollable)        */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute inset-x-2 top-2 z-[400] flex justify-center sm:inset-x-4 sm:top-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full border border-slate-800/90 bg-slate-950/85 px-2 py-1.5 shadow-2xl backdrop-blur-md scrollbar-none">
          <button
            onClick={() => selectTrade("")}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold transition active:scale-95 ${
              trade === ""
                ? "bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <span>All Pros</span>
          </button>

          {trades.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTrade(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
                trade === t.key
                  ? "bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20"
                  : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <span className="text-sm">{t.emoji}</span>
              <span>{t.label}</span>
              <span className="text-[10px] opacity-75">
                {currency} {settings?.tradeRates?.[t.key] ?? t.defaultRate}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* The "Find a worker" pill and "Browse pros" pill are gone — the only
          call-to-action to send a request is the giant REQUEST A WORKER button
          at the bottom. That button gates on customer login + GPS first. */}

      {/* ========================================================================= */}
      {/* 4. Bottom stack: selected worker card + worker finder rail + HUD          */}
      {/* ========================================================================= */}
      {selectedProvider && (
        <div className="pointer-events-none absolute inset-x-2 bottom-3 z-[600] flex justify-center sm:inset-x-4 sm:bottom-4">
          <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-lime-400/50 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-800 text-2xl shadow-inner">
                  {selectedProvider.avatar}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 font-black text-slate-100 text-sm sm:text-base">
                    <span>{selectedProvider.name}</span>
                    {selectedProvider.verified && (
                      <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold text-sky-400">
                        ✔ Verified
                      </span>
                    )}
                    {selectedProvider.featured && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                        ★ Top
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400">
                    {tradeByKey(selectedProvider.trade).label} · {selectedProvider.area} ·{" "}
                    {selectedProvider.distanceKm?.toFixed(1) ?? "—"} km away
                  </div>

                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <Stars value={selectedProvider.rating} />
                    <span className="font-bold text-slate-200">
                      {selectedProvider.rating.toFixed(1)}
                    </span>
                    <span>({selectedProvider.ratingCount} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-400 hover:text-slate-100 text-xs p-1"
                >
                  ✕
                </button>
                <div className="text-base font-black text-lime-400">
                  {currency} {selectedProvider.baseRate}
                </div>
                <div className="text-[10px] text-slate-500">
                  /{selectedProvider.priceUnit ?? "visit"} · ETA {selectedProvider.etaMins}m
                </div>
              </div>
            </div>

            {/* Quick Skills strip */}
            {selectedProvider.skills && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedProvider.skills
                  .split("|")
                  .filter(Boolean)
                  .slice(0, 4)
                  .map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex gap-2">
              <a
                href={`tel:${selectedProvider.phone.replace(/\s/g, "")}`}
                className="flex-1 rounded-xl bg-lime-400 py-2.5 text-center text-xs font-black text-slate-950 transition hover:bg-lime-300 active:scale-[0.99]"
              >
                📞 Direct Call
              </a>
              <button
                onClick={() => {
                  setTrade(selectedProvider.trade);
                  setPrice(selectedProvider.baseRate);
                  setTargetPro(selectedProvider);
                  setFormOpen(true);
                }}
                className="flex-1 rounded-xl border border-lime-400/60 bg-lime-400/10 py-2.5 text-xs font-bold text-lime-300 hover:bg-lime-400/20"
              >
                📩 Book This Pro {currency} {selectedProvider.baseRate}
              </button>
              <Link
                href={`/provider/${selectedProvider.id}`}
                className="grid place-items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:text-lime-300"
                title="Full profile & reviews"
              >
                Profile ↗
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Floating Map HUD Controls (Bottom Right / Top Right)                   */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute right-2 top-14 z-[400] flex flex-col items-end gap-2 sm:right-4 sm:top-14">
        {/* Filter Pill Button */}
        <button
          onClick={() => setHudFilterOpen((v) => !v)}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs font-bold text-slate-200 shadow-xl backdrop-blur-md hover:border-lime-400"
        >
          <span>🔍 Filters</span>
          <span className="rounded bg-lime-400/20 px-1.5 py-0.2 text-[10px] text-lime-300">
            {radius}km
          </span>
        </button>

        {/* Floating Filters Popover */}
        {hudFilterOpen && (
          <div className="pointer-events-auto w-64 rounded-2xl border border-slate-800 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span>Map Search & Radius</span>
              <button
                onClick={() => setHudFilterOpen(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skill, name, work…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-lime-400 focus:outline-none"
            />

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Radius</span>
                <span className="font-bold text-lime-400">{radius} km</span>
              </div>
              <input
                type="range"
                min={1}
                max={settings?.maxRadiusKm ?? 15}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-lime-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  className="rounded accent-lime-400"
                />
                <span>Online only</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded accent-lime-400"
                />
                <span>Verified ✔</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bottom area: big CTA + login/gps status + map HUD controls */}
      {!selectedProvider && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex flex-col gap-2 pb-3">
          {/* Massive call-to-action that gates on login + GPS */}
          <div className="flex justify-center px-3 sm:px-4">
            <button
              onClick={openForm}
              className="pointer-events-auto group flex w-full max-w-3xl items-center justify-between gap-3 rounded-3xl border-2 border-lime-400 bg-lime-400 px-5 py-4 text-left font-black text-slate-950 shadow-2xl shadow-lime-400/30 transition active:scale-[0.98] sm:px-7 sm:py-5"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-2xl text-lime-400 sm:h-14 sm:w-14 sm:text-3xl">
                  🛠️
                </span>
                <div>
                  <div className="text-xl leading-none sm:text-3xl">REQUEST A WORKER</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-900/70 sm:text-xs">
                    {customer
                      ? pinLat && pinLng
                        ? `Logged in · pin ${pinLat.toFixed(2)}, ${pinLng.toFixed(2)}`
                        : "Tap to share your exact GPS location"
                      : "Tap to log in & share your location"}
                  </div>
                </div>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-950 text-lime-400 transition group-hover:translate-x-1 sm:h-12 sm:w-12">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="3"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-slate-800/80 bg-slate-950/85 px-3 py-2 text-xs font-bold text-slate-300 shadow-xl backdrop-blur-md">
                🟢 {providers.filter((p) => p.online).length} pros online · {area || "Kathmandu Valley"}
              </span>
              {customer && (
                <span className="rounded-xl border border-slate-800/80 bg-slate-950/85 px-3 py-2 text-xs font-bold text-lime-300 shadow-xl backdrop-blur-md">
                  Hi, {customer.name.split(" ")[0]} 👋
                </span>
              )}
              {gpsStatus === "error" && (
                <span className="rounded-xl border border-rose-400/50 bg-rose-400/10 px-3 py-2 text-[11px] font-bold text-rose-200 shadow-xl backdrop-blur-md">
                  📍 {gpsMessage}
                </span>
              )}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={useMyLocation}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-xl backdrop-blur-md active:scale-95 ${
                  pinLat && pinLng
                    ? "border-lime-400/60 bg-lime-400/15 text-lime-300"
                    : "border-slate-800 bg-slate-950/90 text-lime-300 hover:border-lime-400"
                }`}
              >
                <span>{pinLat && pinLng ? "📍 Pin shared" : "📍 Share GPS"}</span>
              </button>

              <button
                onClick={() => setPickMode((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-xl backdrop-blur-md active:scale-95 ${
                  pickMode
                    ? "bg-lime-400 text-slate-950"
                    : "border border-slate-800 bg-slate-950/90 text-slate-200 hover:border-lime-400"
                }`}
              >
                <span>{pickMode ? "🎯 Tap map to set pin…" : "🎯 Set Pin"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7a. Not-signed-in prompt → everyone logs in on the single /login page    */}
      {/* ========================================================================= */}
      {showLoginPanel && (
        <div className="fixed inset-0 z-[2900] flex items-center justify-center p-3">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setShowLoginPanel(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border-2 border-lime-400 bg-slate-950 p-5 text-center shadow-2xl shadow-lime-400/20">
            <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-lime-400 text-2xl font-black text-slate-950">
              🔐
            </span>
            <div className="mt-3 text-lg font-black text-lime-400">
              Login to send a request
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Your number stays private until a worker accepts your job.
            </p>
            <Link
              href="/login"
              className="mt-4 block w-full rounded-2xl bg-lime-400 py-3 text-sm font-black text-slate-950 transition hover:bg-lime-300"
            >
              Go to login
            </Link>
            <button
              onClick={() => setShowLoginPanel(false)}
              className="mt-2 w-full rounded-2xl border border-slate-700 py-2.5 text-xs font-bold text-slate-300"
            >
              Keep browsing the map
            </button>
            <p className="mt-3 text-[10px] text-slate-500">
              Demo customer: <span className="font-mono text-slate-400">customer / customer123</span>
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. Request a worker — centered modal pop-up (always tappable)               */}
      {/* ========================================================================= */}
      {formOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 sm:p-4">
          {/* Backdrop — clicking it closes the form */}
          <button
            type="button"
            aria-label="Close request form"
            onClick={closeForm}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <div className="relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border-2 border-lime-400 bg-slate-950 shadow-2xl shadow-lime-400/20 sm:max-w-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3 sm:px-6">
              <div>
                <div className="text-lg font-black text-lime-400 sm:text-xl">
                  🛠️ Find a worker
                </div>
                <div className="text-[11px] text-slate-400">
                  Fill this form — only pros in your chosen area will see it.
                </div>
              </div>
              <button
                onClick={closeForm}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="max-h-[80vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-3 text-xs">
              {/* Step header */}
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-2 text-center text-[10px] text-slate-400">
                <div>
                  <div className="text-sm">1️⃣</div>
                  Fill name & phone
                </div>
                <div>
                  <div className="text-sm">2️⃣</div>
                  Pick area & price
                </div>
                <div>
                  <div className="text-sm">3️⃣</div>
                  Send → nearby pros respond
                </div>
              </div>

              {targetPro && (
                <div className="flex items-center justify-between rounded-xl border border-sky-400/40 bg-sky-400/10 px-3 py-2">
                  <div className="text-[11px] text-sky-200">
                    📩 Direct request to{" "}
                    <b>
                      {targetPro.avatar} {targetPro.name}
                    </b>{" "}
                    only
                  </div>
                  <button
                    onClick={() => setTargetPro(null)}
                    className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-sky-300 hover:text-sky-100"
                  >
                    ✕ Send to all
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-slate-300">
                  <span className="mb-1 block text-[11px] font-bold">
                    Your name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sita"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-lime-400 focus:outline-none sm:text-sm"
                  />
                </label>
                <label className="block text-slate-300">
                  <span className="mb-1 block text-[11px] font-bold">
                    Mobile number <span className="text-rose-400">*</span>
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="numeric"
                    placeholder="98xxxxxxxx"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-lime-400 focus:outline-none sm:text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-slate-300">
                  <span className="mb-1 block text-[11px] font-bold">
                    Service category <span className="text-rose-400">*</span>
                  </span>
                  <select
                    value={trade}
                    onChange={(e) => selectTrade(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                  >
                    <option value="">Select Category…</option>
                    {trades.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.emoji} {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-slate-300">
                  <span className="mb-1 block text-[11px] font-bold">
                    Urgency
                  </span>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                  >
                    <option value="now">🔴 Urgent (Immediate)</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </label>
              </div>

              <label className="block text-slate-300">
                <span className="mb-1 block text-[11px] font-bold">
                  What needs service?
                </span>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={2}
                  placeholder="e.g. bathroom tap leaking since morning"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-lime-400 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-slate-300">
                  <span className="mb-1 block text-[11px] font-bold">
                    Kathmandu area
                  </span>
                  <select
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      const a = KTM_AREAS.find((x) => x.name === e.target.value);
                      if (a) setCenter({ lat: a.lat, lng: a.lng });
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                  >
                    <option value="">Auto from map pin</option>
                    {KTM_AREAS.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-slate-300">
                  <span className="mb-1 block text-[11px] font-bold">
                    Address / landmark
                  </span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="near Chabahil Chowk"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-lime-400 focus:outline-none sm:text-sm"
                  />
                </label>
              </div>

              {/* Editable work request area */}
              <div className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-sky-300">
                      Work request area
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Only pros inside this circle see your job
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-lime-400">
                      {requestAreaKm.toFixed(1)} km
                    </div>
                    <div className="text-[10px] text-slate-500">map radius</div>
                  </div>
                </div>

                <input
                  type="range"
                  min={0.5}
                  max={settings?.maxRadiusKm ?? 15}
                  step={0.5}
                  value={requestAreaKm}
                  onChange={(e) => setRequestAreaKm(Number(e.target.value))}
                  className="mt-2 w-full accent-sky-400"
                />

                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5].map((km) => (
                    <button
                      key={km}
                      onClick={() => setRequestAreaKm(km)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition active:scale-95 ${
                        requestAreaKm === km
                          ? "bg-sky-400 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Price box */}
              <div className="rounded-xl border border-lime-400/30 bg-slate-900/90 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Your Offer Price
                  </span>
                  <span className="text-xl font-black text-lime-400">
                    {currency} {price}
                  </span>
                </div>

                <input
                  type="range"
                  min={settings?.minOffer ?? 200}
                  max={settings?.maxOffer ?? 50000}
                  step={50}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full accent-lime-400"
                />

                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[-100, -50, 50, 100].map((delta) => (
                    <button
                      key={delta}
                      onClick={() =>
                        setPrice((v) =>
                          Math.max(settings?.minOffer ?? 200, v + delta),
                        )
                      }
                      className="rounded-lg bg-slate-800 py-1 font-bold text-slate-200 transition hover:bg-slate-700 active:scale-95"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                  <button
                    onClick={() => setPrice(settings?.tradeRates?.[trade] ?? 700)}
                    className="rounded-lg bg-slate-800 py-1 text-[11px] font-bold text-lime-300 transition hover:bg-slate-700 active:scale-95"
                  >
                    Default
                  </button>
                </div>
              </div>

              <button
                onClick={postJob}
                disabled={posting}
                className="w-full rounded-2xl bg-lime-400 py-3.5 text-base font-black text-slate-950 shadow-lg shadow-lime-400/30 transition hover:bg-lime-300 active:scale-[0.99] disabled:opacity-50 sm:text-lg"
              >
                {posting
                  ? "Broadcasting to nearby pros…"
                  : `⚡ Send request to pros within ${requestAreaKm.toFixed(1)} km`}
              </button>

              <div className="text-center text-[10px] text-slate-500">
                Pin: {center.lat.toFixed(4)}, {center.lng.toFixed(4)} ·{" "}
                {area || nearestArea(center.lat, center.lng)} · Form closes after
                you tap send.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
