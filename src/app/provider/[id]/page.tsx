"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MapClient from "@/components/MapClient";
import type { MapProvider } from "@/components/MapView";
import Stars from "@/components/Stars";
import { tradeByKey } from "@/lib/trades";
import { getCustomerToken } from "@/lib/clientAuth";

type Provider = MapProvider;
type Review = {
  id: number;
  stars: number;
  comment: string;
  author: string;
  createdAt: string;
};

export default function ProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [revealPhone, setRevealPhone] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currency, setCurrency] = useState("Rs");
  const [fee, setFee] = useState(0);
  const [commission, setCommission] = useState(0);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(getCustomerToken());
  });
  useEffect(() => {
    // Re-check after mount in case the user just logged in elsewhere.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoggedIn(Boolean(getCustomerToken()));
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/providers/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setProvider(data.provider);
    setRevealPhone(Boolean(data.revealPhone));
    setReviews(data.reviews ?? []);
    setCurrency(data.settings?.currency ?? "Rs");
    setFee(data.settings?.serviceFee ?? 0);
    setCommission(data.settings?.commissionPct ?? 0);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: Number(id),
        stars,
        comment,
        author: author || "Customer",
      }),
    });
    setComment("");
    setAuthor("");
    await load();
    setSaving(false);
  };

  if (!provider)
    return <main className="p-8 text-slate-400">Loading profile…</main>;
  const t = tradeByKey(provider.trade);
  const skills = (provider.skills || "").split("|").filter(Boolean);
  const areas = (provider.serviceAreas || provider.area || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/" className="text-xs text-lime-400">
        ← Back to map
      </Link>
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-800 text-3xl">
                {provider.avatar}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">
                  {provider.name}
                  {provider.verified && (
                    <span className="ml-2 align-middle text-xs font-bold text-sky-400">
                      ✔ ID verified
                    </span>
                  )}
                  {provider.featured && (
                    <span className="ml-2 align-middle text-xs font-bold text-amber-400">
                      ★ top pro
                    </span>
                  )}
                </h1>
                <div className="text-sm text-slate-400">
                  {t.emoji} {t.label} · {provider.area} · {provider.experienceYears} yrs
                  experience ·{" "}
                  {provider.online ? (
                    <span className="text-lime-400">Online now</span>
                  ) : (
                    "Offline"
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Stars value={provider.rating} />
                  <span className="font-bold">{provider.rating.toFixed(1)}</span>
                  <span className="text-slate-500">
                    ({provider.ratingCount} ratings · {provider.jobsDone} jobs)
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">{provider.bio}</p>

            {skills.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Skills & services
                </div>
                <div className="flex flex-wrap gap-1">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {areas.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Serves these areas
                </div>
                <div className="flex flex-wrap gap-1">
                  {areas.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 text-xs text-slate-400">
              🗣️ {provider.languages}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                [`${currency} ${provider.baseRate}`, `base per ${provider.priceUnit ?? "visit"}`],
                [`${provider.etaMins} min`, "typical ETA"],
                [`${currency} ${fee}`, `+ service fee (${commission}% commission)`],
              ].map(([a, b]) => (
                <div key={b} className="rounded-xl bg-slate-950 p-3">
                  <div className="font-extrabold text-lime-400">{a}</div>
                  <div className="text-[11px] text-slate-500">{b}</div>
                </div>
              ))}
            </div>

            {/* Phone / WhatsApp are private — only revealed after the worker accepts a job. */}
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
              <div className="font-bold text-slate-300">📞 Contact</div>
              {revealPhone ? (
                <div className="mt-1 text-slate-200">
                  {provider.phone}
                  {provider.whatsapp && provider.whatsapp !== provider.phone
                    ? ` · WhatsApp ${provider.whatsapp}`
                    : ""}
                </div>
              ) : (
                <div className="mt-1 text-slate-500">
                  Hidden to keep the worker&rsquo;s number private.
                  <br />
                  Send a request — when this pro accepts, you can call and see
                  their full profile.
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {revealPhone ? (
                  <a
                    href={`tel:${provider.phone.replace(/\s/g, "")}`}
                    className="rounded-xl bg-sky-500/15 px-3 py-2 text-[11px] font-bold text-sky-300 ring-1 ring-sky-400/30 hover:bg-sky-500/25"
                  >
                    📞 Call {provider.phone}
                  </a>
                ) : (
                  <Link
                    href={loggedIn ? `/?tpro=${provider.id}` : "/login"}
                    className="rounded-xl bg-lime-400 px-3 py-2 text-[11px] font-extrabold text-slate-950"
                  >
                    {loggedIn
                      ? "📩 Send a request to reveal phone"
                      : "🔐 Login & send a request to reveal phone"}
                  </Link>
                )}
                <Link
                  href="/"
                  className="rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-200"
                >
                  Back to map
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 font-extrabold">
              Ratings & reviews ({reviews.length})
            </h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl bg-slate-950 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Stars value={r.stars} />
                    <span className="font-semibold text-slate-200">{r.author}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{r.comment}</p>
                </div>
              ))}
              {reviews.length === 0 && (
                <p className="text-sm text-slate-500">No reviews yet.</p>
              )}
            </div>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-sm font-bold">Rate this worker</h3>
              <div className="mb-2 flex gap-1 text-2xl">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStars(s)}
                    className={s <= stars ? "text-amber-400" : "text-slate-700"}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="How was the service?"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <button
                onClick={submit}
                disabled={saving}
                className="mt-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-lime-300 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Submit rating"}
              </button>
            </div>
          </div>
        </div>

        <div className="h-[320px] overflow-hidden rounded-2xl border border-slate-800 md:sticky md:top-24">
          <MapClient
            center={{ lat: provider.lat, lng: provider.lng }}
            providers={[provider]}
            radiusKm={1}
            selectedId={provider.id}
          />
        </div>
      </div>
    </main>
  );
}
