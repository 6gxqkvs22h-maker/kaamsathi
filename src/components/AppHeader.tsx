"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  adminHeaders,
  clearAdminToken,
  clearWorkerToken,
  getWorkerToken,
  workerHeaders,
} from "@/lib/clientAuth";

type WorkerMini = {
  id: number;
  name: string;
  trade: string;
  avatar: string;
  online: boolean;
  area: string;
};

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [worker, setWorker] = useState<WorkerMini | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (drawerOpen) {
      setDrawerOpen(false);
    }
  }

  // Check auth sessions on mount / path change.
  // NOTE: /api/worker/session has no GET handler, so the worker session is
  // verified directly against /api/worker/me with the saved token header.
  useEffect(() => {
    let cancelled = false;
    const token = getWorkerToken();
    // No token → keep worker as null (initial value); no sync setState here.
    if (token) {
      void fetch("/api/worker/me", { headers: workerHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled) return;
          if (d?.provider) {
            setWorker({
              id: d.provider.id,
              name: d.provider.name,
              trade: d.provider.trade,
              avatar: d.provider.avatar,
              online: d.provider.online,
              area: d.provider.area,
            });
          } else {
            setWorker(null);
          }
        })
        .catch(() => {
          if (!cancelled) setWorker(null);
        });
    }

    void fetch("/api/admin/session", { headers: adminHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setIsAdmin(Boolean(d?.admin));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Load public app settings & social links
  const [appSettings, setAppSettings] = useState<{
    appName?: string;
    appTagline?: string;
    socialLinks?: Record<string, string>;
    emergencyHotlines?: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setAppSettings(d.settings ?? null))
      .catch(() => setAppSettings(null));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setSafetyOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logoutWorker = async () => {
    clearWorkerToken();
    try {
      await fetch("/api/worker/session", { method: "DELETE" });
    } catch {
      // ignore
    }
    setWorker(null);
    setDrawerOpen(false);
    router.push("/");
  };

  const logoutAdmin = async () => {
    clearAdminToken();
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } catch {
      // ignore
    }
    setIsAdmin(false);
    setDrawerOpen(false);
    router.push("/");
  };

  return (
    <>
      <header className="sticky top-0 z-[1000] border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Left: Hamburger menu button + Logo */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open side menu"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 transition hover:border-lime-400 hover:bg-slate-800 hover:text-lime-400 active:scale-95"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              </svg>
            </button>

            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400 text-lg font-black text-slate-950 shadow-sm shadow-lime-400/20">
                K
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-extrabold tracking-tight">
                  Kaam<span className="text-lime-400">Sathi</span>
                </span>
                <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:block">
                  Kathmandu Valley · Nepal
                </span>
              </span>
            </Link>
          </div>

          {/* Right quick actions */}
          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link
              href="/requests"
              className="hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-lime-400 sm:block"
            >
              My Bookings
            </Link>

            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-lg border border-lime-400/40 bg-lime-400/10 px-2.5 py-1.5 text-xs font-bold text-lime-300 hover:bg-lime-400/20"
              >
                🛡️ Admin
              </Link>
            ) : worker ? (
              <Link
                href="/worker"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-200 hover:border-lime-400"
              >
                <span>{worker.avatar}</span>
                <span className="hidden md:inline">{worker.name.split(" ")[0]}</span>
                <span className="h-2 w-2 rounded-full bg-lime-400"></span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-lime-400 hover:text-lime-300"
              >
                Login
              </Link>
            )}
          </nav>
        </div>

      </header>

      {/* ========================================================================= */}
      {/* Side Menu Drawer (Left slide-in) */}
      {/* ========================================================================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[2000] flex">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer container */}
          <aside
            className="relative z-10 flex h-full w-[330px] max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl transition-transform"
            aria-label="Side navigation"
          >
            {/* Drawer Header */}
            <div className="border-b border-slate-800 bg-slate-950/90 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-400 text-sm font-black text-slate-950">
                    K
                  </span>
                  <div className="leading-tight">
                    <span className="text-base font-extrabold tracking-tight">
                      Kaam<span className="text-lime-400">Sathi</span>
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Local Pros Marketplace
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {/* User profile summary in drawer */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
                {worker ? (
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-xl">
                      {worker.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-100">
                        {worker.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="capitalize">{worker.trade}</span>
                        <span>·</span>
                        <span>{worker.area}</span>
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            worker.online ? "bg-lime-400" : "bg-slate-500"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ) : isAdmin ? (
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <div className="text-sm font-bold text-lime-400">
                        Admin Control Active
                      </div>
                      <div className="text-xs text-slate-400">
                        Full platform & API access
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      Namaste! 🙏
                    </div>
                    <div className="text-xs text-slate-400">
                      Need a pro? Or want to work and earn?
                    </div>
                    <Link
                      href="/login"
                      className="mt-2 block w-full rounded-lg bg-lime-400 py-1.5 text-center text-xs font-bold text-slate-950"
                    >
                      Worker Login / Register
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
              {/* MODE SWITCH — the only place to change mode */}
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Choose Mode
              </div>
              <div className="grid gap-1.5">
                <Link
                  href="/"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    !pathname?.startsWith("/worker")
                      ? "border-lime-400 bg-lime-400/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">🧑‍💼</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-extrabold ${
                        !pathname?.startsWith("/worker") ? "text-lime-300" : "text-slate-200"
                      }`}
                    >
                      Service Needed
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      Find & book nearby pros
                    </span>
                  </span>
                  {!pathname?.startsWith("/worker") && (
                    <span className="rounded bg-lime-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                      ON
                    </span>
                  )}
                </Link>

                <Link
                  href="/worker"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                    pathname?.startsWith("/worker")
                      ? "border-lime-400 bg-lime-400/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">🛠️</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-extrabold ${
                        pathname?.startsWith("/worker") ? "text-lime-300" : "text-slate-200"
                      }`}
                    >
                      Worker Mode
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      See jobs & send offers
                    </span>
                  </span>
                  {pathname?.startsWith("/worker") && (
                    <span className="rounded bg-lime-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                      ON
                    </span>
                  )}
                </Link>
              </div>

              <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Services & Bookings
              </div>

              <Link
                href="/"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
                  pathname === "/"
                    ? "bg-lime-400/10 font-bold text-lime-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <span className="text-lg">🗺️</span>
                <span>Find Pros on Map</span>
              </Link>

              <Link
                href="/requests"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
                  pathname === "/requests"
                    ? "bg-lime-400/10 font-bold text-lime-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <span className="text-lg">📋</span>
                <span>My Bookings & Offers</span>
              </Link>

              <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Account & Admin
              </div>

              <Link
                href="/login"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
                  pathname === "/login"
                    ? "bg-lime-400/10 font-bold text-lime-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <span className="text-lg">🔐</span>
                <span>Login (everyone)</span>
              </Link>

              <Link
                href="/admin"
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 font-medium transition ${
                  pathname === "/admin"
                    ? "bg-lime-400/10 font-bold text-lime-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛡️</span>
                  <span>Admin Control Room</span>
                </div>
                {isAdmin && (
                  <span className="rounded bg-lime-400/20 px-1.5 py-0.5 text-[10px] font-bold text-lime-300">
                    Active
                  </span>
                )}
              </Link>

              <Link
                href="/admin?tab=api"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-lime-300"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔑</span>
                  <span>API Keys & Integrations</span>
                </div>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                  Settings
                </span>
              </Link>

              {/* Social Media Links & Community */}
              <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Follow & Connect
              </div>
              <div className="flex flex-wrap gap-1 px-3 py-1">
                {[
                  { key: "facebook", label: "FB", icon: "📘", url: appSettings?.socialLinks?.facebook || "https://facebook.com/kaamsathinpl" },
                  { key: "instagram", label: "Insta", icon: "📸", url: appSettings?.socialLinks?.instagram || "https://instagram.com/kaamsathi.np" },
                  { key: "tiktok", label: "TikTok", icon: "🎵", url: appSettings?.socialLinks?.tiktok || "https://tiktok.com/@kaamsathi" },
                  { key: "whatsapp", label: "WhatsApp", icon: "💬", url: appSettings?.socialLinks?.whatsapp || "https://wa.me/9779801234567" },
                  { key: "youtube", label: "YouTube", icon: "▶️", url: appSettings?.socialLinks?.youtube || "https://youtube.com/@kaamsathi" },
                ].map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-lime-400 hover:text-lime-300"
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </a>
                ))}
              </div>

              {/* Support Helpline Quick Call */}
              {appSettings?.socialLinks?.supportPhone && (
                <div className="px-3 pt-1">
                  <a
                    href={`tel:${appSettings.socialLinks.supportPhone.replace(/\s/g, "")}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-300 hover:border-lime-400"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>📞</span>
                      <span>Support Help:</span>
                    </span>
                    <span className="font-bold text-lime-400 font-mono">
                      {appSettings.socialLinks.supportPhone}
                    </span>
                  </a>
                </div>
              )}

              <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Trust & Emergency
              </div>

              <button
                onClick={() => setSafetyOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-rose-300"
              >
                <span className="text-lg">🚨</span>
                <span>Emergency & Safety Hotline</span>
              </button>

              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3 text-xs text-slate-400">
                <div className="mb-1 font-bold text-slate-200">
                  📍 Kathmandu Valley Live
                </div>
                Thamel, Lazimpat, Baneshwor, Lalitpur, Bhaktapur & 15+ areas.
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-800 bg-slate-950/80 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{appSettings?.appName || "KaamSathi"} v2.5</span>
                {worker ? (
                  <button
                    onClick={logoutWorker}
                    className="font-bold text-rose-400 hover:underline"
                  >
                    Worker Logout
                  </button>
                ) : isAdmin ? (
                  <button
                    onClick={logoutAdmin}
                    className="font-bold text-rose-400 hover:underline"
                  >
                    Admin Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="font-bold text-lime-400 hover:underline"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Safety & Emergency Modal */}
      {safetyOpen && (
        <div className="fixed inset-0 z-[2500] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚨</span>
                <h3 className="text-base font-extrabold text-slate-100">
                  Safety & Emergency Hotlines
                </h3>
              </div>
              <button
                onClick={() => setSafetyOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Your safety is first. Save these verified Kathmandu Valley emergency numbers:
            </p>

            <div className="mt-4 space-y-2 text-sm">
              {[
                { name: "👮 Nepal Police Emergency", num: appSettings?.emergencyHotlines?.police || "100" },
                { name: "🚑 Kathmandu Ambulance", num: appSettings?.emergencyHotlines?.ambulance || "102" },
                { name: "🚦 Valley Traffic Police", num: appSettings?.emergencyHotlines?.traffic || "103" },
                { name: "🚒 Fire Brigade", num: appSettings?.emergencyHotlines?.fire || "101" },
                { name: "👩 Women Helpline", num: appSettings?.emergencyHotlines?.womenHelp || "1145" },
                { name: "🧒 Child Helpline", num: appSettings?.emergencyHotlines?.childHelp || "1098" },
              ].map((h) => (
                <a
                  key={h.num + h.name}
                  href={`tel:${h.num}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 font-bold text-slate-200 hover:border-lime-400"
                >
                  <span>{h.name}</span>
                  <span className="font-mono text-lime-400">{h.num}</span>
                </a>
              ))}
            </div>

            <button
              onClick={() => setSafetyOpen(false)}
              className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
