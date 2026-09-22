"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type Role = "worker" | "customer" | "admin" | null;

type WorkerProfile = {
  id: number;
  name: string;
  trade: string;
  avatar: string;
  phone: string;
  whatsapp: string;
  area: string;
  online: boolean;
  rating: number;
  jobsDone: number;
};

type CustomerProfile = {
  id: number;
  name: string;
  username: string;
  phone: string;
  area: string;
  avatar: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      // Check admin first
      try {
        const r = await fetch("/api/admin/session", { headers: adminHeaders() });
        const d = await r.json();
        if (d?.admin) {
          setRole("admin");
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }

      // Check worker
      const wToken = getWorkerToken();
      if (wToken) {
        try {
          const r = await fetch("/api/worker/me", { headers: workerHeaders() });
          const d = await r.json();
          if (d?.provider) {
            setRole("worker");
            setWorker(d.provider);
            setName(d.provider.name ?? "");
            setPhone(d.provider.whatsapp ?? "");
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      // Check customer
      const cToken = getCustomerToken();
      if (cToken) {
        try {
          const r = await fetch("/api/auth/customer/me", { headers: customerHeaders() });
          const d = await r.json();
          if (d?.customer) {
            setRole("customer");
            setCustomer(d.customer);
            setName(d.customer.name ?? "");
            setPhone(d.customer.phone ?? "");
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      setRole(null);
      setLoading(false);
    };
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      if (role === "worker") {
        const r = await fetch("/api/worker/me", {
          method: "PATCH",
          headers: workerHeaders(),
          body: JSON.stringify({ name, whatsapp: phone }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not save.");
        setWorker(d.provider);
      } else if (role === "customer") {
        const r = await fetch("/api/auth/customer/me", {
          method: "PATCH",
          headers: customerHeaders(),
          body: JSON.stringify({ name, phone }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not save.");
        setCustomer(d.customer);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    if (role === "worker") {
      clearWorkerToken();
      try {
        await fetch("/api/worker/session", { method: "DELETE" });
      } catch {
        // ignore
      }
    } else if (role === "admin") {
      clearAdminToken();
      try {
        await fetch("/api/admin/session", { method: "DELETE" });
      } catch {
        // ignore
      }
    } else if (role === "customer") {
      clearCustomerToken();
    }
    router.push("/");
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-400">
        Loading profile…
      </main>
    );
  }

  if (!role) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-lg font-bold text-slate-100">You're not signed in</div>
        <p className="mt-1 text-sm text-slate-400">
          Log in to see and edit your profile.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-extrabold text-slate-950"
        >
          Go to Login
        </Link>
      </main>
    );
  }

  if (role === "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center">
        <span className="text-3xl">🛡️</span>
        <h1 className="mt-2 text-xl font-black text-slate-100">Admin Account</h1>
        <p className="mt-1 text-sm text-slate-400">
          You're signed in with full admin access.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/admin"
            className="rounded-xl bg-lime-400 py-2.5 text-sm font-extrabold text-slate-950"
          >
            Go to Admin Control Room
          </Link>
          <button
            onClick={logout}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-sm font-bold text-rose-300"
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  const avatar = role === "worker" ? worker?.avatar : customer?.avatar;
  const roleLabel = role === "worker" ? "Worker" : "Customer";

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="text-center">
        <span className="inline-grid h-16 w-16 place-items-center rounded-2xl bg-slate-800 text-3xl">
          {avatar || "🙋"}
        </span>
        <h1 className="mt-2 text-xl font-black text-slate-100">{name || "Your Profile"}</h1>
        <p className="text-xs uppercase tracking-wide text-lime-400">{roleLabel} account</p>
        {role === "worker" && worker && (
          <p className="mt-1 text-xs text-slate-400">
            ⭐ {worker.rating?.toFixed?.(1) ?? "—"} · {worker.jobsDone ?? 0} jobs done ·{" "}
            {worker.area}
          </p>
        )}
        {role === "customer" && customer && (
          <p className="mt-1 text-xs text-slate-400">@{customer.username}</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-lime-400 focus:outline-none"
        />

        <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {role === "worker" ? "WhatsApp / Phone" : "Phone"}
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-lime-400 focus:outline-none"
        />

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-300">
            {error}
          </div>
        )}
        {saved && (
          <div className="mt-3 rounded-lg border border-lime-400/40 bg-lime-400/10 p-2 text-xs text-lime-300">
            Saved ✓
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-lime-400 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {role === "worker" && (
          <Link
            href="/worker"
            className="rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-center text-sm font-bold text-slate-200"
          >
            Go to Worker Dashboard
          </Link>
        )}
        {role === "customer" && (
          <Link
            href="/requests"
            className="rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-center text-sm font-bold text-slate-200"
          >
            My Bookings
          </Link>
        )}
        <button
          onClick={logout}
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-sm font-bold text-rose-300"
        >
          Log out
        </button>
      </div>
    </main>
  );
}
