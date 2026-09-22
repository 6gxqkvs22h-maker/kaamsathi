"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { authHeaders } from "@/lib/useSession";
import { CATEGORIES, DAYS, WORK_TYPES, splitList } from "@/lib/marketplace";
import { KTM_AREAS, tradeByKey } from "@/lib/trades";

const AVATARS = ["👨‍🔧", "👩‍🔧", "🧑‍🔧", "👷", "🛠️", "👨‍🌾", "👩‍🎨", "🧑‍🏭"];

export default function WorkerProfileSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [completion, setCompletion] = useState(0);
  const [isNew, setIsNew] = useState(true);

  const [f, setF] = useState({
    name: "",
    phone: "",
    email: "",
    avatar: "🛠️",
    trade: "",
    skills: [] as string[],
    bio: "",
    dob: "",
    gender: "",
    education: "",
    certifications: "",
    pastWork: "",
    languages: "Nepali, English",
    experienceYears: 0,
    baseRate: 1000,
    minRate: 0,
    priceUnit: "day",
    workTypes: [] as string[],
    availableDays: [] as string[],
    preferredHours: "",
    area: KTM_AREAS[0].name,
    serviceAreas: [] as string[],
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/worker/profile", { headers: authHeaders() });
        const d = await res.json();
        if (d.profile) {
          const p = d.profile;
          setIsNew(false);
          setCompletion(d.completion?.pct ?? 0);
          setF({
            name: p.name ?? "",
            phone: p.phone ?? "",
            email: p.email ?? "",
            avatar: p.avatar || "🛠️",
            trade: p.trade ?? "",
            skills: splitList(p.skills),
            bio: p.bio ?? "",
            dob: p.dob ?? "",
            gender: p.gender ?? "",
            education: p.education ?? "",
            certifications: p.certifications ?? "",
            pastWork: p.pastWork ?? "",
            languages: p.languages ?? "Nepali, English",
            experienceYears: p.experienceYears ?? 0,
            baseRate: p.baseRate ?? 1000,
            minRate: p.minRate ?? 0,
            priceUnit: p.priceUnit ?? "day",
            workTypes: splitList(p.workTypes),
            availableDays: splitList(p.availableDays),
            preferredHours: p.preferredHours ?? "",
            area: KTM_AREAS.some((a) => a.name === p.area)
              ? p.area
              : KTM_AREAS[0].name,
            serviceAreas: String(p.serviceAreas ?? "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const skillOptions = f.trade ? tradeByKey(f.trade).skills : [];
  const toggle = (key: "skills" | "workTypes" | "availableDays" | "serviceAreas", v: string) =>
    setF((p) => ({
      ...p,
      [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v],
    }));

  const save = async () => {
    setError("");
    setOk("");
    if (!f.name.trim() || !f.phone.trim())
      return setError("Name and phone number are required.");
    if (!f.trade) return setError("Choose your main skill category.");
    setBusy(true);
    try {
      const res = await fetch("/api/worker/profile", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(f),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Could not save your profile.");
        return;
      }
      setCompletion(d.completion?.pct ?? 0);
      setOk("Profile saved.");
      if (isNew) {
        setTimeout(() => router.push("/work"), 700);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-900" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-900" />
        </div>
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
          <div>
            <h1 className="text-base font-bold text-slate-100">
              {isNew ? "Complete your worker profile" : "Edit worker profile"}
            </h1>
            <p className="text-[11px] text-slate-500">
              {isNew
                ? "This helps us match you with the right work"
                : `${completion}% complete`}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-4">
        {/* Personal */}
        <Section title="Personal">
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
          <Row>
            <Fld label="Full name" required>
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />
            </Fld>
            <Fld label="Phone" required>
              <input
                value={f.phone}
                inputMode="numeric"
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                placeholder="98xxxxxxxx"
                className={inp}
              />
            </Fld>
          </Row>
          <Row>
            <Fld label="Email">
              <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inp} />
            </Fld>
            <Fld label="Date of birth">
              <input type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} className={inp} />
            </Fld>
          </Row>
          <Fld label="Current location">
            <select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} className={inp}>
              {KTM_AREAS.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </Fld>
          <div>
            <Label>Preferred work areas</Label>
            <div className="flex flex-wrap gap-1.5">
              {KTM_AREAS.map((a) => (
                <Chip
                  key={a.name}
                  on={f.serviceAreas.includes(a.name)}
                  onClick={() => toggle("serviceAreas", a.name)}
                >
                  {a.name}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        {/* Professional */}
        <Section title="Professional">
          <div>
            <Label>
              Main skill <span className="text-rose-400">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  on={f.trade === c.key}
                  onClick={() => setF({ ...f, trade: c.key, skills: [] })}
                >
                  {c.emoji} {c.label}
                </Chip>
              ))}
            </div>
          </div>
          {skillOptions.length > 0 && (
            <div>
              <Label>Additional skills</Label>
              <div className="flex flex-wrap gap-1.5">
                {skillOptions.map((s) => (
                  <Chip key={s} on={f.skills.includes(s)} onClick={() => toggle("skills", s)} sky>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          <Row>
            <Fld label="Years of experience">
              <input
                type="number"
                min={0}
                value={f.experienceYears}
                onChange={(e) => setF({ ...f, experienceYears: Number(e.target.value) })}
                className={inp}
              />
            </Fld>
            <Fld label="Languages">
              <input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} className={inp} />
            </Fld>
          </Row>
          <Fld label="Work description">
            <textarea
              rows={3}
              value={f.bio}
              onChange={(e) => setF({ ...f, bio: e.target.value })}
              placeholder="Describe your work, tools you own, certificates…"
              className={inp}
            />
          </Fld>
          <Fld label="Previous work experience">
            <textarea
              rows={2}
              value={f.pastWork}
              onChange={(e) => setF({ ...f, pastWork: e.target.value })}
              placeholder="Where have you worked before?"
              className={inp}
            />
          </Fld>
          <Row>
            <Fld label="Education (optional)">
              <input value={f.education} onChange={(e) => setF({ ...f, education: e.target.value })} className={inp} />
            </Fld>
            <Fld label="Certifications (optional)">
              <input
                value={f.certifications}
                onChange={(e) => setF({ ...f, certifications: e.target.value })}
                placeholder="CTEVT…"
                className={inp}
              />
            </Fld>
          </Row>
        </Section>

        {/* Preferences */}
        <Section title="Work preferences">
          <div>
            <Label>Types of work wanted</Label>
            <div className="flex flex-wrap gap-1.5">
              {WORK_TYPES.map((w) => (
                <Chip key={w.key} on={f.workTypes.includes(w.key)} onClick={() => toggle("workTypes", w.key)}>
                  {w.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Available days</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <Chip key={d} on={f.availableDays.includes(d)} onClick={() => toggle("availableDays", d)}>
                  {d}
                </Chip>
              ))}
            </div>
          </div>
          <Row>
            <Fld label="Preferred hours">
              <input
                value={f.preferredHours}
                onChange={(e) => setF({ ...f, preferredHours: e.target.value })}
                placeholder="9am – 6pm"
                className={inp}
              />
            </Fld>
            <Fld label="Rate unit">
              <select value={f.priceUnit} onChange={(e) => setF({ ...f, priceUnit: e.target.value })} className={inp}>
                <option value="day">Per day</option>
                <option value="hour">Per hour</option>
                <option value="visit">Per visit</option>
              </select>
            </Fld>
          </Row>
          <Row>
            <Fld label="Expected rate (Rs)">
              <input
                type="number"
                value={f.baseRate}
                onChange={(e) => setF({ ...f, baseRate: Number(e.target.value) })}
                className={inp}
              />
            </Fld>
            <Fld label="Minimum acceptable (Rs)">
              <input
                type="number"
                value={f.minRate}
                onChange={(e) => setF({ ...f, minRate: Number(e.target.value) })}
                className={inp}
              />
            </Fld>
          </Row>
        </Section>

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
          {busy ? "Saving…" : isNew ? "Save & find work" : "Save changes"}
        </button>
      </div>

      <BottomNav mode="worker" />
    </main>
  );
}

const inp =
  "w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none sm:text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
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
function Chip({
  on,
  onClick,
  children,
  sky,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sky?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        on
          ? sky
            ? "bg-sky-400 text-slate-950"
            : "bg-lime-400 text-slate-950"
          : "bg-slate-900 text-slate-400 ring-1 ring-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
