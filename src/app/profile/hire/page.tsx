"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { customerHeaders } from "@/lib/clientAuth";
import { KTM_AREAS } from "@/lib/trades";

const AVATARS = ["🙋", "🙋‍♂️", "🧑", "👩", "👨", "🧕", "🏢", "🏪"];

export default function HireProfilePage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [f, setF] = useState({
    name: "",
    phone: "",
    email: "",
    avatar: "🙋",
    area: "",
    businessName: "",
    businessDesc: "",
    serviceArea: "",
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/customer/me", {
          headers: customerHeaders(),
        });
        if (res.ok) {
          const d = await res.json();
          const c = d.customer;
          setF((p) => ({
            ...p,
            name: c.name ?? "",
            phone: c.phone ?? "",
            email: c.email ?? "",
            avatar: c.avatar || "🙋",
            area: c.area ?? "",
            businessName: c.businessName ?? "",
            businessDesc: c.businessDesc ?? "",
            serviceArea: c.serviceArea ?? "",
          }));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setError("");
    setOk("");
    if (!f.name.trim()) return setError("Your name is required.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/customer/me", {
        method: "PATCH",
        headers: customerHeaders(),
        body: JSON.stringify(f),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Could not save.");
        return;
      }
      setOk("Profile saved.");
      setF((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="mx-auto h-64 max-w-lg animate-pulse rounded-2xl bg-slate-900" />
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-950 pb-28">
      <div className="sticky top-0 z-[500] border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/profile"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800 text-slate-400"
          >
            ←
          </Link>
          <h1 className="text-base font-bold text-slate-100">Edit Hire Pro profile</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div>
            <Label>Photo</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setF({ ...f, avatar: a })}
                  className={`grid h-11 w-11 place-items-center rounded-xl text-xl transition ${
                    f.avatar === a
                      ? "bg-lime-400 ring-2 ring-lime-300"
                      : "bg-slate-900 ring-1 ring-slate-800"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <Fld label="Full name" required>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />
          </Fld>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Phone">
              <input
                value={f.phone}
                inputMode="numeric"
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                className={inp}
              />
            </Fld>
            <Fld label="Email">
              <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inp} />
            </Fld>
          </div>
          <Fld label="Location">
            <select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} className={inp}>
              <option value="">Select area…</option>
              {KTM_AREAS.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </Fld>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Business (optional)
          </h2>
          <Fld label="Business / company name">
            <input
              value={f.businessName}
              onChange={(e) => setF({ ...f, businessName: e.target.value })}
              placeholder="e.g. Everest Restaurant"
              className={inp}
            />
          </Fld>
          <Fld label="About your business">
            <textarea
              rows={3}
              value={f.businessDesc}
              onChange={(e) => setF({ ...f, businessDesc: e.target.value })}
              className={inp}
            />
          </Fld>
          <Fld label="Preferred service area">
            <input
              value={f.serviceArea}
              onChange={(e) => setF({ ...f, serviceArea: e.target.value })}
              placeholder="Lalitpur, Bhaktapur…"
              className={inp}
            />
          </Fld>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Change password
          </h2>
          <input
            type="password"
            value={f.currentPassword}
            onChange={(e) => setF({ ...f, currentPassword: e.target.value })}
            placeholder="Current password"
            className={inp}
          />
          <input
            type="password"
            value={f.newPassword}
            onChange={(e) => setF({ ...f, newPassword: e.target.value })}
            placeholder="New password"
            className={inp}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
            {error}
          </div>
        )}
        {ok && (
          <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-3 text-xs font-medium text-lime-300">
            {ok}
          </div>
        )}

        <button
          onClick={save}
          disabled={busy}
          className="w-full rounded-2xl bg-lime-400 py-4 text-sm font-black text-slate-950 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>

      <BottomNav mode="hire" />
    </main>
  );
}

const inp =
  "w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
}
function Fld({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <Label>
        {label} {required && <span className="text-rose-400">*</span>}
      </Label>
      {children}
    </label>
  );
}
