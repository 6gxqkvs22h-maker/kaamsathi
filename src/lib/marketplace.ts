import { TRADES, distanceKm } from "./trades";

/** Work categories shown in filters + job posting. Admin-extendable later. */
export const CATEGORIES = [
  { key: "construction", label: "Construction", emoji: "🏗️" },
  { key: "cleaner", label: "Cleaning", emoji: "🧹" },
  { key: "cooking", label: "Cooking", emoji: "🍳" },
  { key: "delivery", label: "Delivery", emoji: "🛵" },
  { key: "driving", label: "Driving", emoji: "🚗" },
  { key: "electrician", label: "Electrician", emoji: "⚡" },
  { key: "plumber", label: "Plumbing", emoji: "🚰" },
  { key: "beauty", label: "Beauty", emoji: "💇" },
  { key: "security", label: "Security", emoji: "🛡️" },
  { key: "hospitality", label: "Hospitality", emoji: "🏨" },
  { key: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { key: "office", label: "Office", emoji: "🏢" },
  { key: "freelance", label: "Freelance", emoji: "💻" },
  ...TRADES.filter(
    (t) =>
      !["cleaner", "electrician", "plumber"].includes(t.key),
  ).map((t) => ({ key: t.key, label: t.label, emoji: t.emoji })),
  { key: "other", label: "Other", emoji: "🧰" },
].filter(
  (c, i, arr) => arr.findIndex((x) => x.key === c.key) === i,
);

export const categoryByKey = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? {
    key,
    label: key || "Other",
    emoji: "🧰",
  };

export const WORK_TYPES = [
  { key: "full-time", label: "Full-time" },
  { key: "part-time", label: "Part-time" },
  { key: "temporary", label: "Temporary" },
  { key: "contract", label: "Contract" },
  { key: "freelance", label: "Freelance" },
  { key: "one-day", label: "One-day" },
  { key: "urgent", label: "Urgent" },
];

export const PAYMENT_TYPES = [
  { key: "fixed", label: "Fixed price" },
  { key: "daily", label: "Per day" },
  { key: "hourly", label: "Per hour" },
  { key: "negotiable", label: "Negotiable" },
];

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const splitList = (v?: string | null) =>
  String(v ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

export const joinList = (v: string[]) => v.filter(Boolean).join("|");

/* ------------------------------------------------------------------ */
/* Transparent match scoring — workers can always see WHY they matched */
/* ------------------------------------------------------------------ */

export type MatchInput = {
  worker: {
    trade: string;
    skills: string;
    lat: number;
    lng: number;
    workTypes?: string | null;
    availableDays?: string | null;
    minRate?: number | null;
    experienceYears?: number | null;
  };
  job: {
    trade: string;
    requiredSkills?: string | null;
    lat: number;
    lng: number;
    offerPrice: number;
    workType?: string | null;
    startDate?: string | null;
  };
};

export type MatchResult = {
  score: number;
  label: string;
  reasons: string[];
};

/**
 * Score = category(35) + skills(25) + distance(20) + pay(12) + workType(8).
 * Deliberately explainable: every point maps to a human-readable reason.
 */
export function matchScore({ worker, job }: MatchInput): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // Category
  if (worker.trade && job.trade && worker.trade === job.trade) {
    score += 35;
    reasons.push("Your main category matches");
  } else {
    score += 8;
  }

  // Skills overlap
  const ws = splitList(worker.skills).map((s) => s.toLowerCase());
  const js = splitList(job.requiredSkills).map((s) => s.toLowerCase());
  if (js.length && ws.length) {
    const hit = js.filter((s) => ws.includes(s));
    if (hit.length) {
      score += Math.min(25, Math.round((hit.length / js.length) * 25));
      reasons.push(
        `${hit.length} of ${js.length} required skill${js.length > 1 ? "s" : ""} matched`,
      );
    }
  } else {
    score += 12;
  }

  // Distance
  const d = distanceKm(
    { lat: worker.lat, lng: worker.lng },
    { lat: job.lat, lng: job.lng },
  );
  if (d <= 2) {
    score += 20;
    reasons.push(`Very close — ${d.toFixed(1)} km away`);
  } else if (d <= 5) {
    score += 14;
    reasons.push(`${d.toFixed(1)} km away`);
  } else if (d <= 10) {
    score += 8;
    reasons.push(`${d.toFixed(1)} km away`);
  } else {
    score += 2;
  }

  // Pay vs the worker's minimum
  const min = Number(worker.minRate ?? 0);
  if (!min || job.offerPrice >= min) {
    score += 12;
    if (min) reasons.push("Pay meets your minimum rate");
  } else if (job.offerPrice >= min * 0.8) {
    score += 6;
    reasons.push("Pay is slightly below your minimum");
  }

  // Work type preference
  const prefs = splitList(worker.workTypes);
  if (!prefs.length || (job.workType && prefs.includes(job.workType))) {
    score += 8;
    if (prefs.length && job.workType)
      reasons.push(`Matches your "${job.workType}" preference`);
  }

  // Experience nudge
  if ((worker.experienceYears ?? 0) >= 3) score = Math.min(100, score + 2);

  score = Math.max(0, Math.min(100, score));
  const label =
    score >= 85
      ? "Excellent match"
      : score >= 70
        ? "Strong match"
        : score >= 50
          ? "Good match"
          : "Possible match";

  return { score, label, reasons };
}

/** Worker profile completeness — drives the "Complete your profile" prompt. */
export function workerCompletion(p: Record<string, unknown>) {
  const checks: { key: string; label: string; ok: boolean }[] = [
    { key: "name", label: "Full name", ok: Boolean(p.name) },
    { key: "phone", label: "Phone number", ok: Boolean(p.phone) },
    { key: "trade", label: "Main skill", ok: Boolean(p.trade) },
    { key: "skills", label: "Additional skills", ok: splitList(p.skills as string).length > 0 },
    { key: "area", label: "Current location", ok: Boolean(p.area) },
    { key: "bio", label: "Work description", ok: Boolean(p.bio) },
    {
      key: "experienceYears",
      label: "Years of experience",
      ok: Number(p.experienceYears ?? 0) > 0,
    },
    { key: "baseRate", label: "Expected rate", ok: Number(p.baseRate ?? 0) > 0 },
    {
      key: "workTypes",
      label: "Types of work wanted",
      ok: splitList(p.workTypes as string).length > 0,
    },
    {
      key: "availableDays",
      label: "Available days",
      ok: splitList(p.availableDays as string).length > 0,
    },
  ];
  const done = checks.filter((c) => c.ok).length;
  const pct = Math.round((done / checks.length) * 100);
  // Only these block applying — everything else is encouraged, not enforced.
  const required = ["name", "phone", "trade", "area"];
  const canApply = checks
    .filter((c) => required.includes(c.key))
    .every((c) => c.ok);
  return { pct, checks, missing: checks.filter((c) => !c.ok), canApply };
}

/** Relative "posted 5m ago" helper. */
export function timeAgo(date: string | Date) {
  const t = new Date(date).getTime();
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
