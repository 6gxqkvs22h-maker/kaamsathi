"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KTM_AREAS } from "@/lib/trades";
import {
  adminHeaders,
  clearAdminToken,
  clearCustomerToken,
  clearWorkerToken,
  customerHeaders,
  getCustomerToken,
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

type CustomerMini = {
  id: number;
  name: string;
  username: string;
  phone: string;
  area: string;
  avatar: string;
};

/* ------------------------------- icons ---------------------------------- */
function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    map: "M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z",
    clipboard: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z",
    briefcase: "M20.25 14.15v4.073a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a9.797 9.797 0 0 1-5.396 0l-1.32-.377a2.25 2.25 0 0 1-1.632-2.163V14.15M3.75 8.25v6.443M20.25 8.25v6.443M12 12.75h.008v.008H12v-.008ZM3.75 8.25l7.5-4.286a1.5 1.5 0 0 1 1.5 0l7.5 4.286-8.25 4.714L3.75 8.25Z",
    shield: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
    lifebuoy: "M16.712 4.33a9.027 9.027 0 0 1 1.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 0 0-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 0 1 0 9.424m-4.138-5.976a3.736 3.736 0 0 0-.88-1.388 3.737 3.737 0 0 0-1.388-.88m2.268 2.268a3.765 3.765 0 0 1 0 2.528m-2.268-4.796a3.765 3.765 0 0 0-2.528 0m4.796 4.796-3.448 4.138m3.448-4.138a3.736 3.736 0 0 1-.88 1.388 3.737 3.737 0 0 1-1.388.88m0 0-4.138-3.448",
    logout: "M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75",
    user: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    pencil: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125",
    close: "M6 18 18 6M6 6l12 12",
    menu: "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5",
    grid: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    plus: "M12 4.5v15m7.5-7.5h-15",
  };
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [worker, setWorker] = useState<WorkerMini | null>(null);
  const [customer, setCustomer] = useState<CustomerMini | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  // Profile editor
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [editErr, setEditErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    area: "",
    avatar: "",
    currentPassword: "",
    newPassword: "",
  });

  const [appSettings, setAppSettings] = useState<{
    appName?: string;
    appTagline?: string;
    socialLinks?: Record<string, string>;
    emergencyHotlines?: Record<string, string>;
  } | null>(null);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  /* --------------------------- session detection -------------------------- */
  useEffect(() => {
    let cancelled = false;

    if (getWorkerToken()) {
      void fetch("/api/worker/me", { headers: workerHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled) return;
          setWorker(
            d?.provider
              ? {
                  id: d.provider.id,
                  name: d.provider.name,
                  trade: d.provider.trade,
                  avatar: d.provider.avatar,
                  online: d.provider.online,
                  area: d.provider.area,
                }
              : null,
          );
        })
        .catch(() => !cancelled && setWorker(null));
    }

    if (getCustomerToken()) {
      void fetch("/api/auth/customer/me", { headers: customerHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && setCustomer(d?.customer ?? null))
        .catch(() => !cancelled && setCustomer(null));
    }

    void fetch("/api/admin/session", { headers: adminHeaders() })
      .then((r) => r.json())
      .then((d) => !cancelled && setIsAdmin(Boolean(d?.admin)))
      .catch(() => !cancelled && setIsAdmin(false));

    return () => {
      cancelled = true;
    };
  }, [pathname]);

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
        setEditOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* -------------------------------- derived ------------------------------- */
  const signedIn = Boolean(customer || worker || isAdmin);
  const displayName = customer?.name ?? worker?.name ?? (isAdmin ? "Administrator" : "");
  const displayAvatar = customer?.avatar ?? worker?.avatar ?? "🛡️";
  const roleLabel = customer ? "Customer" : worker ? "Worker" : isAdmin ? "Admin" : "";
  const workerMode =
    (pathname?.startsWith("/worker") || pathname?.startsWith("/work")) ?? false;
  const brand = appSettings?.appName || "KaamSathi";

  /* -------------------------------- actions ------------------------------- */
  const openEditor = () => {
    setEditErr("");
    setEditMsg("");
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone,
        area: customer.area,
        avatar: customer.avatar,
        currentPassword: "",
        newPassword: "",
      });
    } else if (worker) {
      setForm({
        name: worker.name,
        phone: "",
        area: worker.area,
        avatar: worker.avatar,
        currentPassword: "",
        newPassword: "",
      });
    }
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setEditBusy(true);
    setEditErr("");
    setEditMsg("");
    try {
      if (customer) {
        const res = await fetch("/api/auth/customer/me", {
          method: "PATCH",
          headers: customerHeaders(),
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setEditErr(data.error ?? "Could not save your profile.");
          return;
        }
        setCustomer(data.customer);
        setEditMsg("Profile updated.");
        setForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
      } else if (worker) {
        const res = await fetch("/api/worker/me", {
          method: "PATCH",
          headers: workerHeaders(),
          body: JSON.stringify({
            name: form.name,
            area: form.area,
            avatar: form.avatar,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setEditErr(data.error ?? "Could not save your profile.");
          return;
        }
        if (data.provider) {
          setWorker({
            id: data.provider.id,
            name: data.provider.name,
            trade: data.provider.trade,
            avatar: data.provider.avatar,
            online: data.provider.online,
            area: data.provider.area,
          });
        }
        setEditMsg("Profile updated.");
      }
    } catch {
      setEditErr("Network problem — please try again.");
    } finally {
      setEditBusy(false);
    }
  };

  const signOut = async () => {
    clearCustomerToken();
    clearWorkerToken();
    clearAdminToken();
    try {
      await Promise.all([
        fetch("/api/auth/login", { method: "DELETE" }),
        fetch("/api/worker/session", { method: "DELETE" }),
        fetch("/api/admin/session", { method: "DELETE" }),
      ]);
    } catch {
      // ignore
    }
    setCustomer(null);
    setWorker(null);
    setIsAdmin(false);
    setDrawerOpen(false);
    router.push("/");
  };

  /* --------------------------------- nav ---------------------------------- */
  const navItem = (
    href: string,
    icon: string,
    label: string,
    caption?: string,
    badge?: string,
  ) => {
    const active = pathname === href;
    return (
      <Link
        key={href + label}
        href={href}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
          active
            ? "bg-lime-400/10 text-lime-300 ring-1 ring-lime-400/30"
            : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
        }`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            active ? "bg-lime-400/15 text-lime-300" : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200"
          }`}
        >
          <Icon name={icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{label}</span>
          {caption && (
            <span className="block truncate text-[11px] text-slate-500">{caption}</span>
          )}
        </span>
        {badge && (
          <span className="rounded-md bg-lime-400/15 px-1.5 py-0.5 text-[10px] font-bold text-lime-300">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* ============================== HEADER ============================== */}
      <header className="sticky top-0 z-[1000] border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:border-slate-600 hover:text-slate-100 active:scale-95"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>

            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400 text-base font-black text-slate-950">
                K
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-bold tracking-tight text-slate-100">
                  {brand}
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:block">
                  Kathmandu Valley
                </span>
              </span>
            </Link>
          </div>

          {/* ONE account entry point — no separate Login button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 py-1.5 pl-1.5 pr-3 text-left transition hover:border-slate-600 active:scale-95"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-base">
              {signedIn ? displayAvatar : "🙏"}
            </span>
            <span className="leading-tight">
              <span className="block max-w-[110px] truncate text-xs font-semibold text-slate-100">
                {signedIn ? displayName.split(" ")[0] : "Namaste"}
              </span>
              <span className="block text-[10px] text-slate-500">
                {signedIn ? roleLabel : "Sign in"}
              </span>
            </span>
            {signedIn && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  worker ? (worker.online ? "bg-lime-400" : "bg-slate-500") : "bg-sky-400"
                }`}
              />
            )}
          </button>
        </div>
      </header>

      {/* ============================== DRAWER ============================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[2000] flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          <aside className="relative z-10 flex h-full w-[330px] max-w-[86vw] flex-col border-r border-slate-800 bg-slate-950">
            {/* --- account --- */}
            <div className="border-b border-slate-800 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Account
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-900 hover:text-slate-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              {signedIn ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-2xl ring-1 ring-slate-800">
                      {displayAvatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold text-slate-100">
                        {displayName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            customer
                              ? "bg-sky-400/15 text-sky-300"
                              : worker
                                ? "bg-lime-400/15 text-lime-300"
                                : "bg-amber-400/15 text-amber-300"
                          }`}
                        >
                          {roleLabel}
                        </span>
                        <span className="truncate text-[11px] text-slate-500">
                          {worker
                            ? `${worker.trade} · ${worker.online ? "Online" : "Offline"}`
                            : customer?.area || "Kathmandu"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(customer || worker) && (
                    <button
                      onClick={openEditor}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-lime-400/50 hover:text-lime-300"
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                      Edit profile
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-2xl ring-1 ring-slate-800">
                      🙏
                    </span>
                    <div>
                      <div className="text-[15px] font-bold text-slate-100">
                        Namaste
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Sign in to book or start earning
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/login"
                    className="mt-3 block w-full rounded-xl bg-lime-400 py-2.5 text-center text-sm font-bold text-slate-950 transition hover:bg-lime-300"
                  >
                    Sign in or create account
                  </Link>
                </>
              )}
            </div>

            {/* --- body --- */}
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {/* mode switch */}
              <section>
                <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  I want to
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/hire"
                    className={`rounded-xl border p-3 text-center transition ${
                      !workerMode
                        ? "border-lime-400 bg-lime-400/10"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <span className="block text-xl">🧑‍💼</span>
                    <span
                      className={`mt-1 block text-xs font-bold ${
                        !workerMode ? "text-lime-300" : "text-slate-300"
                      }`}
                    >
                      Hire a pro
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Service needed
                    </span>
                  </Link>
                  <Link
                    href="/work"
                    className={`rounded-xl border p-3 text-center transition ${
                      workerMode
                        ? "border-lime-400 bg-lime-400/10"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <span className="block text-xl">🛠️</span>
                    <span
                      className={`mt-1 block text-xs font-bold ${
                        workerMode ? "text-lime-300" : "text-slate-300"
                      }`}
                    >
                      Work & earn
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Worker mode
                    </span>
                  </Link>
                </div>
              </section>

              {/* navigation */}
              <section>
                <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {workerMode ? "Worker" : "Services"}
                </h3>
                <nav className="space-y-1">
                  {workerMode
                    ? [
                        navItem("/work", "briefcase", "Job feed", "Find & apply for work"),
                        navItem("/work/applications", "clipboard", "My applications", "Track your applications"),
                        navItem("/profile", "user", "My profile", "Skills, rate & availability"),
                        navItem("/", "map", "Map view", "See work near you"),
                      ]
                    : [
                        navItem("/hire", "grid", "Dashboard", "Your posted work"),
                        navItem("/hire/post", "plus", "Post work", "Hire a worker"),
                        navItem("/requests", "clipboard", "My bookings", "Map requests & offers"),
                        navItem("/", "map", "Find pros", "Live map of nearby workers"),
                      ]}
                </nav>
              </section>

              {/* admin — only surfaced for admins */}
              {isAdmin && (
                <section>
                  <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Management
                  </h3>
                  <nav className="space-y-1">
                    {navItem("/admin", "shield", "Control room", "Workers, rates & payouts", "Admin")}
                  </nav>
                </section>
              )}

              {/* support */}
              <section>
                <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Support
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSafetyOpen(true)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-rose-300">
                      <Icon name="lifebuoy" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">Emergency help</span>
                      <span className="block text-[11px] text-slate-500">
                        Police, ambulance & helplines
                      </span>
                    </span>
                  </button>

                  {appSettings?.socialLinks?.supportPhone && (
                    <a
                      href={`tel:${appSettings.socialLinks.supportPhone.replace(/\s/g, "")}`}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-lime-300">
                        <Icon name="user" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">Customer care</span>
                        <span className="block truncate font-mono text-[11px] text-lime-400">
                          {appSettings.socialLinks.supportPhone}
                        </span>
                      </span>
                    </a>
                  )}
                </div>
              </section>

              {/* social */}
              <section>
                <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Follow
                </h3>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {[
                    { k: "facebook", l: "Facebook", u: appSettings?.socialLinks?.facebook },
                    { k: "instagram", l: "Instagram", u: appSettings?.socialLinks?.instagram },
                    { k: "tiktok", l: "TikTok", u: appSettings?.socialLinks?.tiktok },
                    { k: "youtube", l: "YouTube", u: appSettings?.socialLinks?.youtube },
                  ]
                    .filter((s) => s.u)
                    .map((s) => (
                      <a
                        key={s.k}
                        href={s.u}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                      >
                        {s.l}
                      </a>
                    ))}
                </div>
              </section>
            </div>

            {/* --- footer --- */}
            <div className="border-t border-slate-800 p-3">
              {signedIn ? (
                <button
                  onClick={signOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-semibold text-rose-300 transition hover:border-rose-400/40 hover:bg-rose-400/10"
                >
                  <Icon name="logout" className="h-4 w-4" />
                  Sign out
                </button>
              ) : null}
              <p className="mt-2 text-center text-[10px] text-slate-600">
                {brand} · Kathmandu Valley
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ========================= EMERGENCY MODAL ========================= */}
      {safetyOpen && (
        <div className="fixed inset-0 z-[2500] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSafetyOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Emergency help</h3>
              <button
                onClick={() => setSafetyOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-900 hover:text-slate-200"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Verified Kathmandu Valley emergency numbers. Tap to call.
            </p>
            <div className="space-y-1.5">
              {[
                { n: "Police", v: appSettings?.emergencyHotlines?.police || "100" },
                { n: "Ambulance", v: appSettings?.emergencyHotlines?.ambulance || "102" },
                { n: "Traffic police", v: appSettings?.emergencyHotlines?.traffic || "103" },
                { n: "Fire brigade", v: appSettings?.emergencyHotlines?.fire || "101" },
                { n: "Women helpline", v: appSettings?.emergencyHotlines?.womenHelp || "1145" },
                { n: "Child helpline", v: appSettings?.emergencyHotlines?.childHelp || "1098" },
              ].map((h) => (
                <a
                  key={h.n}
                  href={`tel:${h.v}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-rose-400/40"
                >
                  <span>{h.n}</span>
                  <span className="font-mono font-bold text-rose-300">{h.v}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================== PROFILE EDITOR ========================= */}
      {editOpen && (customer || worker) && (
        <div className="fixed inset-0 z-[3000] grid place-items-center p-3">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setEditOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Edit profile</h3>
                <p className="text-[11px] text-slate-500">{roleLabel} account</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-900 hover:text-slate-200"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              <div>
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Picture
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(customer
                    ? ["🙋", "🙋‍♂️", "🧑", "👩", "👨", "🧕", "👵", "👴"]
                    : ["👨‍🔧", "👩‍🔧", "🧑‍🔧", "👷", "🛠️", "👨‍🌾", "👩‍🎨", "🧑‍🏭"]
                  ).map((a) => (
                    <button
                      key={a}
                      onClick={() => setForm({ ...form, avatar: a })}
                      className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${
                        form.avatar === a
                          ? "bg-lime-400 ring-2 ring-lime-300"
                          : "bg-slate-900 ring-1 ring-slate-800 hover:ring-slate-600"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Full name
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                />
              </label>

              {customer && (
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Mobile number
                  </span>
                  <input
                    value={form.phone}
                    inputMode="numeric"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="98xxxxxxxx"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                  />
                  <span className="mt-1.5 block text-[10px] text-slate-500">
                    Shared with a worker only after they accept your job.
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Area
                </span>
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                >
                  <option value="">Select area…</option>
                  {KTM_AREAS.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              {customer && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Change password
                  </span>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                    placeholder="Current password"
                    className="mb-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                  />
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    placeholder="New password"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-base text-slate-100 focus:border-lime-400 focus:outline-none sm:text-sm"
                  />
                </div>
              )}

              {worker && (
                <Link
                  href="/worker"
                  onClick={() => {
                    setEditOpen(false);
                    setDrawerOpen(false);
                  }}
                  className="block rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-center text-xs font-semibold text-lime-300 transition hover:border-lime-400/50"
                >
                  Manage skills, rate & service areas
                </Link>
              )}

              {editErr && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                  {editErr}
                </div>
              )}
              {editMsg && (
                <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-3 text-xs font-medium text-lime-300">
                  {editMsg}
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-800 p-4">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 rounded-xl border border-slate-800 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={editBusy}
                className="flex-1 rounded-xl bg-lime-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-lime-300 disabled:opacity-50"
              >
                {editBusy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
