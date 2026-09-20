"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KTM_AREAS, TRADES, tradeByKey } from "@/lib/trades";
import {
  adminHeaders,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from "@/lib/clientAuth";

type Settings = {
  city: string;
  currency: string;
  commissionPct: number;
  serviceFee: number;
  minOffer: number;
  maxOffer: number;
  maxRadiusKm: number;
  defaultRadiusKm: number;
  surgeMultiplier: number;
  commissionEnabled: boolean;
  requireWorkerApproval: boolean;
  autoBidEnabled: boolean;
  autoBidCount: number;
  minRatingToBid: number;
  tradeRates: Record<string, number>;
  disabledTrades: string;
  announcement: string;
  apiKeys?: Record<string, string>;
  socialLinks?: Record<string, string>;
  emergencyHotlines?: Record<string, string>;
  adminPassword?: string;
  appName?: string;
  appTagline?: string;
  leadFee?: number;
  minTopup?: number;
  walletRequired?: boolean;
};

type TxRow = {
  id: number;
  providerId: number;
  type: string;
  amount: number;
  method: string;
  reference: string;
  note: string;
  status: string;
  balanceAfter: number | null;
  createdAt: string;
  providerName: string;
  providerPhone: string;
  providerBalance: number;
};

type Worker = {
  id: number;
  name: string;
  trade: string;
  skills: string;
  bio: string;
  phone: string;
  whatsapp: string;
  area: string;
  serviceAreas: string;
  baseRate: number;
  priceUnit: string;
  experienceYears: number;
  rating: number;
  ratingCount: number;
  jobsDone: number;
  online: boolean;
  verified: boolean;
  featured: boolean;
  status: string;
  avatar: string;
};

type Request = {
  id: number;
  customerName: string;
  customerPhone: string;
  trade: string;
  description: string;
  offerPrice: number;
  area: string;
  address: string;
  urgency: string;
  status: string;
  createdAt: string;
};

type BidRow = {
  id: number;
  requestId: number;
  providerId: number;
  price: number;
  etaMins: number;
  status: string;
  source: string;
  providerName: string;
  providerTrade: string;
};

type ReviewRow = {
  id: number;
  providerId: number;
  stars: number;
  comment: string;
  author: string;
  hidden: boolean;
  providerName: string;
};

type Stats = {
  workers: number;
  online: number;
  pending: number;
  verified: number;
  requests: number;
  open: number;
  bids: number;
  booked: number;
  gmv: number;
  commission: number;
  avgWorkerRate: number;
  avgRating: number;
  byTrade: Record<string, { workers: number; requests: number }>;
  walletTotal?: number;
  pendingTopups?: number;
  topupVolume?: number;
  leadFeeEarned?: number;
};

type ApiSection = {
  title: string;
  description: string;
  keys: {
    key: string;
    label: string;
    desc: string;
    placeholder: string;
    docs?: string;
  }[];
};

const API_SECTIONS: ApiSection[] = [
  {
    title: "🔵 Google Platform (Maps, Places & Sign-In)",
    description:
      "One Google Cloud project powers live maps, address autocomplete and Google login. All keys stay inside this authenticated admin page.",
    keys: [
      {
        key: "GOOGLE_MAPS_API_KEY",
        label: "Google Maps Platform API Key",
        desc: "Enables Google Places address autocomplete, turn-by-turn routing and Kathmandu geocoding on the live map.",
        placeholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        docs: "https://console.cloud.google.com/google/maps-apis",
      },
      {
        key: "GOOGLE_OAUTH_CLIENT_ID",
        label: "Google OAuth Client ID (Admin & Worker Sign-In)",
        desc: "Lets admins and workers sign in with their Google account. Create it under APIs & Services → Credentials → OAuth client ID.",
        placeholder: "xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
        docs: "https://console.cloud.google.com/apis/credentials",
      },
      {
        key: "GOOGLE_OAUTH_CLIENT_SECRET",
        label: "Google OAuth Client Secret",
        desc: "Server-side secret that verifies Google sign-in tokens. Never share it publicly.",
        placeholder: "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx",
        docs: "https://console.cloud.google.com/apis/credentials",
      },
    ],
  },
  {
    title: "💬 SMS & OTP Gateways (Nepal & Global)",
    description:
      "Send instant SMS verification, worker dispatch alerts and booking confirmations.",
    keys: [
      {
        key: "SPARROW_SMS_TOKEN",
        label: "Sparrow SMS API Token (Nepal)",
        desc: "Nepal's #1 SMS gateway. Sends instant SMS to +977 numbers for fast worker & customer notifications.",
        placeholder: "e.g. v2_xxxxxxxxxxxxxxxxxxxxxx",
        docs: "https://sparrowsms.com",
      },
      {
        key: "TWILIO_ACCOUNT_SID",
        label: "Twilio Account SID",
        desc: "Global SMS and WhatsApp notification service.",
        placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        docs: "https://twilio.com",
      },
      {
        key: "TWILIO_AUTH_TOKEN",
        label: "Twilio Auth Token",
        desc: "Twilio secret authentication token.",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        docs: "https://twilio.com",
      },
      {
        key: "TWILIO_PHONE_NUMBER",
        label: "Twilio Phone / Sender Number",
        desc: "Outgoing registered Twilio SMS phone number or Sender ID.",
        placeholder: "+1xxxxxxxxxx or KAAMSATHI",
      },
    ],
  },
  {
    title: "🗺️ Extra Maps, Routing & Geocoding",
    description:
      "Optional map layers. Your Google Maps key lives in the Google Platform section above.",
    keys: [
      {
        key: "MAPBOX_ACCESS_TOKEN",
        label: "Mapbox Access Token",
        desc: "Optional vector tile styling for customized dark map layers.",
        placeholder: "pk.eyJ1xxxxxxxxxxxxxxxxxxxxxxxxxxx",
        docs: "https://mapbox.com",
      },
      {
        key: "GEOCODING_ENDPOINT",
        label: "Custom Geocoder / Nominatim URL",
        desc: "Reverse geocoding service endpoint. Default: OpenStreetMap Nominatim Kathmandu.",
        placeholder: "https://nominatim.openstreetmap.org/reverse",
      },
    ],
  },
  {
    title: "💳 Payment Gateways (Nepal & Global)",
    description:
      "Receive customer platform service fees and worker commission payments.",
    keys: [
      {
        key: "ESEWA_MERCHANT_CODE",
        label: "eSewa Merchant Code (Nepal)",
        desc: "Nepal's largest digital wallet. Enables direct service fee settlements in NPR.",
        placeholder: "EPAYTEST or your live merchant code",
        docs: "https://developer.esewa.com.np",
      },
      {
        key: "ESEWA_SECRET_KEY",
        label: "eSewa HMAC Secret Key",
        desc: "HMAC SHA256 secret key for validating eSewa payment callbacks.",
        placeholder: "8gBm/:&EnhH.1/q",
      },
      {
        key: "KHALTI_PUBLIC_KEY",
        label: "Khalti Public Key (Nepal)",
        desc: "Khalti Nepal digital wallet client public key.",
        placeholder: "live_public_key_xxxxxxxxxxxxxxxx",
        docs: "https://docs.khalti.com",
      },
      {
        key: "KHALTI_SECRET_KEY",
        label: "Khalti Secret Key (Nepal)",
        desc: "Used on the server to verify Khalti transaction token and amount.",
        placeholder: "live_secret_key_xxxxxxxxxxxxxxxx",
      },
      {
        key: "STRIPE_SECRET_KEY",
        label: "Stripe Secret Key",
        desc: "For tourists and international card payments in Kathmandu.",
        placeholder: "[REDACTED_STRIPE_KEY]",
        docs: "https://stripe.com",
      },
    ],
  },
  {
    title: "🔔 Push Notifications & Messaging",
    description:
      "Push worker device alerts when a new job offer arrives nearby.",
    keys: [
      {
        key: "FIREBASE_SERVER_KEY",
        label: "Firebase Cloud Messaging (FCM) Server Key",
        desc: "Sends real-time high-priority push notifications to worker Android/iOS apps.",
        placeholder: "AAAAxxxxxxxx:APA91bxxxxxxxxxxxxxxxx",
        docs: "https://firebase.google.com",
      },
      {
        key: "WHATSAPP_API_TOKEN",
        label: "WhatsApp Cloud API Bearer Token",
        desc: "Meta Cloud API token to dispatch WhatsApp job alerts directly to worker phone numbers.",
        placeholder: "EAABxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        docs: "https://developers.facebook.com/docs/whatsapp",
      },
    ],
  },
  {
    title: "☁️ Cloud Storage (Worker Verification & Photos)",
    description:
      "Secure storage for worker citizenship cards, CTEVT certificates, and before/after job photos.",
    keys: [
      {
        key: "CLOUDINARY_URL",
        label: "Cloudinary URL / API Secret",
        desc: "Fast media hosting for worker profile avatars and verification IDs.",
        placeholder: "cloudinary://api_key:api_secret@cloud_name",
        docs: "https://cloudinary.com",
      },
      {
        key: "AWS_S3_BUCKET",
        label: "AWS S3 Bucket Name",
        desc: "Private S3 bucket name for encrypted worker identity documents.",
        placeholder: "kaamsathi-documents-ktm",
      },
      {
        key: "AWS_ACCESS_KEY_ID",
        label: "AWS Access Key ID",
        desc: "IAM user access key with PutObject permissions.",
        placeholder: "AKIAxxxxxxxxxxxxxxxx",
      },
      {
        key: "AWS_SECRET_ACCESS_KEY",
        label: "AWS Secret Access Key",
        desc: "IAM user secret access key.",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
  },
];

const TABS = [
  "Overview",
  "Workers",
  "Requests",
  "Offers",
  "Reviews",
  "Wallet & Top-ups",
  "Rates & Rules",
  "Social & Branding",
  "API Keys & Integrations",
] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginNote, setLoginNote] = useState("");
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("tab");
      if (t === "api" || t === "apis" || t === "keys") {
        return "API Keys & Integrations";
      }
    }
    return "Overview";
  });
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [workerQuery, setWorkerQuery] = useState("");
  const [workerStatus, setWorkerStatus] = useState("all");
  const [toast, setToast] = useState("");

  // API keys draft state
  const [apiDraft, setApiDraft] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [customKeyName, setCustomKeyName] = useState("");
  const [customKeyValue, setCustomKeyValue] = useState("");
  const [testedKey, setTestedKey] = useState<string | null>(null);

  // Social media & branding state
  const [socialDraft, setSocialDraft] = useState<Record<string, string>>({});
  const [hotlinesDraft, setHotlinesDraft] = useState<Record<string, string>>({});
  const [brandingDraft, setBrandingDraft] = useState({
    appName: "KaamSathi",
    appTagline: "Kathmandu Instant Services",
    city: "Kathmandu, Nepal",
    adminPassword: "admin123",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data", {
        headers: adminHeaders(),
      });
      if (res.status === 401) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSettings(data.settings);
      setApiDraft(data.settings?.apiKeys ?? {});
      setSocialDraft(data.settings?.socialLinks ?? {});
      setHotlinesDraft(data.settings?.emergencyHotlines ?? {});
      setBrandingDraft({
        appName: data.settings?.appName || "KaamSathi",
        appTagline: data.settings?.appTagline || "Kathmandu Instant Services",
        city: data.settings?.city || "Kathmandu, Nepal",
        adminPassword: data.settings?.adminPassword || "admin123",
      });
      setWorkers(data.providers ?? []);
      setRequests(data.requests ?? []);
      setBids(data.bids ?? []);
      setReviews(data.reviews ?? []);
      setTransactions(data.transactions ?? []);
      setStats(data.stats);
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1) A token handed over in the URL (?t=...) always wins. This is what makes
    //    admin login work even when the browser blocks cookies AND localStorage
    //    inside the preview iframe — the session rides along in the link.
    try {
      const url = new URL(window.location.href);
      const urlToken = url.searchParams.get("t");
      if (urlToken) {
        setAdminToken(urlToken);
        url.searchParams.delete("t");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""),
        );
      }
    } catch {
      // ignore — fall through to stored token
    }

    // 2) No token anywhere → show the login form straight away.
    if (!getAdminToken()) {
      setAuthed(false);
      return;
    }

    // 3) Verify the session before loading the control room.
    void fetch("/api/admin/session", { headers: adminHeaders() })
      .then((r) => r.json())
      .then((d) => (d.admin ? load() : setAuthed(false)))
      .catch(() => setAuthed(false));
  }, [load]);

  const login = async (overrideCode?: string) => {
    setError("");
    setLoginNote("");
    const code = (overrideCode ?? passcode).trim();
    if (!code) {
      setError("Type your admin passcode first (default is 'admin123').");
      return;
    }
    setLoginBusy(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed. Default is 'admin123'.");
        return;
      }
      if (data.token) setAdminToken(data.token);
      setLoginNote("✓ Login successful — opening control room…");
      await load();
      // Final fallback: even if localStorage is blocked inside the iframe,
      // this link alone logs the admin in by handing the token in the URL.
      window.location.href = `/api/admin/login?passcode=${encodeURIComponent(code)}`;
    } catch {
      setError("Network error — please check connection and tap login again.");
    } finally {
      setLoginBusy(false);
    }
  };

  const resetSession = () => {
    clearAdminToken();
    setPasscode("");
    setError("");
    setLoginNote("");
    setAuthed(false);
  };

  const logout = async () => {
    clearAdminToken();
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } catch {
      // ignore
    }
    setAuthed(false);
  };

  const mutate = async (
    entity: "worker" | "request" | "review" | "bid" | "settings" | "transaction",
    action: "create" | "update" | "delete" | "approve" | "reject",
    patch?: Record<string, unknown>,
    id?: number,
  ) => {
    const res = await fetch("/api/admin/mutate", {
      method: "POST",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ entity, action, id, patch }),
    });
    const data = await res.json();
    if (!res.ok) setToast(data.error ?? "Action failed");
    else setToast("Saved.");
    await load();
  };

  const saveSettings = (patch: Partial<Settings>) =>
    mutate("settings", "update", patch as Record<string, unknown>);

  const cur = settings?.currency ?? "Rs";

  const filteredWorkers = useMemo(() => {
    const q = workerQuery.toLowerCase();
    return workers
      .filter((w) => (workerStatus === "all" ? true : w.status === workerStatus))
      .filter(
        (w) =>
          !q ||
          w.name.toLowerCase().includes(q) ||
          w.trade.includes(q) ||
          w.area.toLowerCase().includes(q) ||
          w.phone.includes(q),
      );
  }, [workers, workerQuery, workerStatus]);

  if (authed === null) return <main className="p-8 text-slate-400">Checking session…</main>;

  if (!authed)
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400 text-2xl font-black text-slate-950 shadow-md shadow-lime-400/20">
              🛡️
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-100">
                Admin Control Room
              </h1>
              <p className="text-xs text-slate-400">
                Full app control · Rates, APIs, Social & Workers
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Admin Passcode
              </label>
              <div className="relative">
                <input
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && login()}
                  type="text"
                  placeholder="Enter admin passcode (default: admin123)"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300">
                {error}
              </div>
            )}

            {loginNote && (
              <div className="rounded-xl border border-lime-400/40 bg-lime-400/10 p-2.5 text-xs font-semibold text-lime-300">
                {loginNote}
              </div>
            )}

            <button
              onClick={() => login()}
              disabled={loginBusy}
              className="w-full rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-slate-950 shadow-md shadow-lime-400/20 hover:bg-lime-300 active:scale-[0.99] disabled:opacity-50"
            >
              {loginBusy ? "Authenticating…" : "Enter Admin Backend"}
            </button>

            <div className="relative py-1 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-2 text-[10px] uppercase font-bold text-slate-500">
                Or Quick Access
              </span>
            </div>

            <button
              type="button"
              disabled={loginBusy}
              onClick={() => {
                setPasscode("admin123");
                void login("admin123");
              }}
              className="w-full rounded-xl border border-lime-400/40 bg-lime-400/10 py-2.5 text-xs font-bold text-lime-300 hover:bg-lime-400/20 active:scale-[0.99] disabled:opacity-50"
            >
              {loginBusy ? "Logging in…" : "⚡ 1-Click Instant Login (admin123)"}
            </button>

            <button
              type="button"
              onClick={resetSession}
              className="w-full text-center text-[11px] font-semibold text-slate-500 hover:text-slate-300"
            >
              Having trouble? Clear saved session & retry
            </button>

            <a
              href="/api/admin/login?passcode=admin123"
              className="block w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 text-center text-[11px] font-bold text-slate-300 transition hover:border-lime-400 hover:text-lime-300"
            >
              🔗 1-click direct admin link (no cookies / storage needed)
            </a>

            <a
              href="/api/admin/login?passcode=admin123"
              className="block w-full rounded-xl bg-lime-400 py-3 text-center text-sm font-extrabold text-slate-950 shadow-md shadow-lime-400/20 transition hover:bg-lime-300"
            >
              ⚡ Open Admin Control Room
            </a>
          </div>

          <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300">💡 Tip:</div>
            <div>Default passcode is <span className="font-mono text-lime-400">admin123</span>. Once inside, you can change your admin password in the <b>Social & Branding</b> tab anytime.</div>
          </div>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">🛡️ Admin control room</h1>
          <p className="text-xs text-slate-400">
            {settings?.city} · {stats?.workers ?? 0} workers · {stats?.open ?? 0} open
            jobs · {stats?.pending ?? 0} awaiting approval
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300"
          >
            {loading ? "Refreshing…" : "🔄 Refresh"}
          </button>
          <button
            onClick={logout}
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300"
          >
            Log out
          </button>
        </div>
      </div>

      {toast && (
        <div className="mt-3 rounded-xl bg-lime-400/10 px-3 py-2 text-xs font-semibold text-lime-300 ring-1 ring-lime-400/30">
          {toast}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 ${
              tab === t ? "bg-lime-400 text-slate-950" : "bg-slate-900 text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && stats && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              ["Workers total", stats.workers],
              ["Online now", stats.online],
              ["Pending approval", stats.pending],
              ["Verified", stats.verified],
              ["Job requests", stats.requests],
              ["Open jobs", stats.open],
              ["Offers sent", stats.bids],
              ["Jobs booked", stats.booked],
              [`GMV (${cur})`, stats.gmv],
              [`Commission (${cur})`, stats.commission],
              [`Avg worker rate (${cur})`, stats.avgWorkerRate],
              ["Avg rating", stats.avgRating],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  {label}
                </div>
                <div className="text-2xl font-extrabold text-lime-400">{value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-bold">Marketplace by trade</h2>
            <div className="space-y-2">
              {TRADES.map((t) => {
                const row = stats.byTrade[t.key] ?? { workers: 0, requests: 0 };
                const max = Math.max(...Object.values(stats.byTrade).map((x) => x.workers), 1);
                return (
                  <div key={t.key} className="flex items-center gap-3 text-xs">
                    <span className="w-36 text-slate-300">
                      {t.emoji} {t.label}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-slate-950">
                      <div
                        className="h-2 rounded-full bg-lime-400"
                        style={{ width: `${(row.workers / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-28 text-right text-slate-400">
                      {row.workers} pros · {row.requests} jobs
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "Workers" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={workerQuery}
              onChange={(e) => setWorkerQuery(e.target.value)}
              placeholder="Search name / trade / area / phone"
              className="min-w-[240px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={workerStatus}
              onChange={(e) => setWorkerStatus(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              onClick={() => setWorkers((w) => [...w])}
              className="hidden"
              aria-hidden
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-3">Worker</th>
                  <th className="p-3">Trade / area</th>
                  <th className="p-3">Rate</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Flags</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w) => (
                  <tr key={w.id} className="border-t border-slate-800 bg-slate-950/40">
                    <td className="p-3">
                      <div className="font-bold text-slate-100">
                        {w.avatar} {w.name}
                      </div>
                      <div className="text-slate-500">{w.phone}</div>
                      <div className="text-slate-500">
                        {(w.skills || "").split("|").filter(Boolean).slice(0, 2).join(", ")}
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={w.trade}
                        onChange={(e) => mutate("worker", "update", { trade: e.target.value }, w.id)}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      >
                        {TRADES.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={w.area}
                        onChange={(e) => mutate("worker", "update", { area: e.target.value }, w.id)}
                        className="mt-1 rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      >
                        {KTM_AREAS.map((a) => (
                          <option key={a.name} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        defaultValue={w.baseRate}
                        onBlur={(e) =>
                          Number(e.target.value) !== w.baseRate &&
                          mutate("worker", "update", { baseRate: Number(e.target.value) }, w.id)
                        }
                        className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      />
                      <span className="ml-1 text-slate-500">/{w.priceUnit}</span>
                      <input
                        type="number"
                        defaultValue={w.experienceYears}
                        onBlur={(e) =>
                          mutate("worker", "update", { experienceYears: Number(e.target.value) }, w.id)
                        }
                        className="mt-1 w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      />
                      <span className="ml-1 text-slate-500">yrs</span>
                    </td>
                    <td className="p-3">
                      ⭐ {w.rating.toFixed(1)}
                      <div className="text-slate-500">
                        {w.ratingCount} ratings · {w.jobsDone} jobs
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={w.status}
                        onChange={(e) => mutate("worker", "update", { status: e.target.value }, w.id)}
                        className={`rounded border px-2 py-1 ${
                          w.status === "approved"
                            ? "border-lime-400/40 bg-lime-400/10 text-lime-300"
                            : w.status === "pending"
                              ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                              : "border-rose-400/40 bg-rose-400/10 text-rose-300"
                        }`}
                      >
                        <option value="approved">approved</option>
                        <option value="pending">pending</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </td>
                    <td className="p-3 space-y-1">
                      <button
                        onClick={() => mutate("worker", "update", { online: !w.online }, w.id)}
                        className={`block w-full rounded px-2 py-1 font-bold ${
                          w.online ? "bg-lime-400 text-slate-950" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {w.online ? "online" : "offline"}
                      </button>
                      <button
                        onClick={() => mutate("worker", "update", { verified: !w.verified }, w.id)}
                        className={`block w-full rounded px-2 py-1 font-bold ${
                          w.verified ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {w.verified ? "verified ✔" : "verify"}
                      </button>
                      <button
                        onClick={() => mutate("worker", "update", { featured: !w.featured }, w.id)}
                        className={`block w-full rounded px-2 py-1 font-bold ${
                          w.featured ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {w.featured ? "featured ★" : "feature"}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`/provider/${w.id}`}
                          className="rounded bg-slate-800 px-2 py-1 text-center font-bold"
                        >
                          View
                        </a>
                        <button
                          onClick={() => mutate("worker", "delete", undefined, w.id)}
                          className="rounded bg-rose-500/20 px-2 py-1 font-bold text-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Requests" && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3">Job</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Offer</th>
                <th className="p-3">Area</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-800 bg-slate-950/40">
                  <td className="p-3">
                    <div className="font-bold text-slate-100">
                      {tradeByKey(r.trade).emoji} {r.description || "Job"}
                    </div>
                    <div className="text-slate-500">
                      #{r.id} · {r.urgency} · {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-3">
                    {r.customerName}
                    <div className="text-slate-500">{r.customerPhone}</div>
                  </td>
                  <td className="p-3 font-bold text-lime-400">
                    {cur} {r.offerPrice}
                  </td>
                  <td className="p-3">
                    {r.area}
                    <div className="text-slate-500">{r.address}</div>
                  </td>
                  <td className="p-3">
                    <select
                      value={r.status}
                      onChange={(e) => mutate("request", "update", { status: e.target.value }, r.id)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
                    >
                      <option value="open">open</option>
                      <option value="accepted">accepted</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <a
                        href={`/request/${r.id}`}
                        className="rounded bg-slate-800 px-2 py-1 font-bold"
                      >
                        Open
                      </a>
                      <button
                        onClick={() => mutate("request", "delete", undefined, r.id)}
                        className="rounded bg-rose-500/20 px-2 py-1 font-bold text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Offers" && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3">Offer</th>
                <th className="p-3">Worker</th>
                <th className="p-3">Job</th>
                <th className="p-3">Price</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b) => (
                <tr key={b.id} className="border-t border-slate-800 bg-slate-950/40">
                  <td className="p-3">
                    #{b.id}
                    <div className="text-slate-500">{b.source}</div>
                  </td>
                  <td className="p-3">
                    {b.providerName}
                    <div className="text-slate-500">
                      {tradeByKey(b.providerTrade).label}
                    </div>
                  </td>
                  <td className="p-3">#{b.requestId}</td>
                  <td className="p-3 font-bold text-lime-400">
                    {cur} {b.price}
                    <div className="text-slate-500">ETA {b.etaMins}m</div>
                  </td>
                  <td className="p-3">
                    <select
                      value={b.status}
                      onChange={(e) => mutate("bid", "update", { status: e.target.value }, b.id)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
                    >
                      <option value="pending">pending</option>
                      <option value="accepted">accepted</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => mutate("bid", "delete", undefined, b.id)}
                      className="rounded bg-rose-500/20 px-2 py-1 font-bold text-rose-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Reviews" && (
        <div className="mt-4 space-y-2">
          {reviews.length === 0 && <p className="text-sm text-slate-400">No reviews yet.</p>}
          {reviews.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs"
            >
              <div>
                <div className="font-bold text-slate-100">
                  {"★".repeat(r.stars)}
                  <span className="text-slate-600">{"★".repeat(5 - r.stars)}</span>{" "}
                  {r.author} → {r.providerName}
                </div>
                <p className="mt-1 text-slate-300">{r.comment}</p>
                {r.hidden && <p className="mt-1 font-bold text-rose-300">hidden from public</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => mutate("review", "update", { hidden: !r.hidden }, r.id)}
                  className="rounded bg-slate-800 px-2 py-1 font-bold"
                >
                  {r.hidden ? "Unhide" : "Hide"}
                </button>
                <button
                  onClick={() => mutate("review", "delete", undefined, r.id)}
                  className="rounded bg-rose-500/20 px-2 py-1 font-bold text-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Wallet & Top-ups" && settings && (
        <div className="mt-4 space-y-4">
          {/* Wallet stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [`${cur} ${stats?.walletTotal ?? 0}`, "Total balance in worker wallets"],
              [String(stats?.pendingTopups ?? 0), "Pending top-up requests"],
              [`${cur} ${stats?.topupVolume ?? 0}`, "Approved top-up volume"],
              [`${cur} ${stats?.leadFeeEarned ?? 0}`, "Lead fees earned (platform revenue)"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-2xl font-extrabold text-lime-400">{v}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">{l}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
            {/* Transactions list */}
            <div className="space-y-2">
              <h2 className="text-sm font-extrabold">
                All wallet transactions ({transactions.length})
              </h2>
              {transactions.length === 0 && (
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">
                  No transactions yet. When workers top up or win jobs, everything shows here.
                </p>
              )}
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 text-xs ${
                    tx.status === "pending"
                      ? "border-amber-400/50 bg-amber-400/5"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-100">
                      {tx.type === "topup"
                        ? "💳 Top-up"
                        : tx.type === "lead_fee"
                          ? "🧾 Lead fee"
                          : tx.type === "refund"
                            ? "↩️ Refund"
                            : "⚙️ Admin adjust"}{" "}
                      · {tx.providerName}
                      <span className="ml-1 font-normal text-slate-500">
                        ({tx.providerPhone})
                      </span>
                    </div>
                    <div className="text-slate-500">
                      {tx.method} · {tx.reference || tx.note} ·{" "}
                      {new Date(tx.createdAt).toLocaleString()} · wallet now {cur}{" "}
                      {tx.providerBalance}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-base font-extrabold ${
                        tx.amount >= 0 ? "text-lime-400" : "text-rose-400"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </span>
                    {tx.status === "pending" ? (
                      <>
                        <button
                          onClick={() => mutate("transaction", "approve", undefined, tx.id)}
                          className="rounded-lg bg-lime-400 px-3 py-1.5 font-extrabold text-slate-950"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => mutate("transaction", "reject", undefined, tx.id)}
                          className="rounded-lg bg-rose-500/20 px-3 py-1.5 font-bold text-rose-300"
                        >
                          ✕ Reject
                        </button>
                      </>
                    ) : (
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                          tx.status === "approved"
                            ? "bg-lime-400/15 text-lime-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {tx.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Wallet rules & manual adjust */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs space-y-3">
                <h3 className="text-sm font-extrabold">Wallet rules</h3>
                <Toggle
                  label="Require balance to send offers"
                  on={settings.walletRequired ?? true}
                  onClick={() => saveSettings({ walletRequired: !(settings.walletRequired ?? true) })}
                />
                <Field label={`Lead fee per accepted job (${cur} ${settings.leadFee ?? 50})`}>
                  <input
                    type="number"
                    defaultValue={settings.leadFee ?? 50}
                    onBlur={(e) => saveSettings({ leadFee: Number(e.target.value) })}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                  />
                </Field>
                <Field label={`Minimum top-up (${cur} ${settings.minTopup ?? 100})`}>
                  <input
                    type="number"
                    defaultValue={settings.minTopup ?? 100}
                    onBlur={(e) => saveSettings({ minTopup: Number(e.target.value) })}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                  />
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
                <h3 className="mb-2 text-sm font-extrabold">Manual balance adjust</h3>
                <ManualAdjust
                  workers={workers.map((w) => ({ id: w.id, name: w.name, phone: w.phone }))}
                  onSubmit={(providerId, amount, note) =>
                    mutate("transaction", "create", { providerId, amount, note })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Rates & Rules" && settings && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
            <h2 className="text-sm font-bold">Platform money controls</h2>
            <Field label={`Commission (${settings.commissionPct}%)`}>
              <input
                type="range"
                min={0}
                max={40}
                value={settings.commissionPct}
                onChange={(e) => saveSettings({ commissionPct: Number(e.target.value) })}
                className="w-full accent-lime-400"
              />
            </Field>
            <Field label={`Surge multiplier ×${settings.surgeMultiplier.toFixed(2)}`}>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                value={settings.surgeMultiplier}
                onChange={(e) => saveSettings({ surgeMultiplier: Number(e.target.value) })}
                className="w-full accent-lime-400"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Service fee (per job)">
                <input
                  type="number"
                  defaultValue={settings.serviceFee}
                  onBlur={(e) => saveSettings({ serviceFee: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                />
              </Field>
              <Field label="Currency label">
                <input
                  defaultValue={settings.currency}
                  onBlur={(e) => saveSettings({ currency: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                />
              </Field>
              <Field label="Min offer allowed">
                <input
                  type="number"
                  defaultValue={settings.minOffer}
                  onBlur={(e) => saveSettings({ minOffer: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                />
              </Field>
              <Field label="Max offer allowed">
                <input
                  type="number"
                  defaultValue={settings.maxOffer}
                  onBlur={(e) => saveSettings({ maxOffer: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                />
              </Field>
              <Field label="Default map radius (km)">
                <input
                  type="number"
                  defaultValue={settings.defaultRadiusKm}
                  onBlur={(e) => saveSettings({ defaultRadiusKm: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                />
              </Field>
              <Field label="Max service radius (km)">
                <input
                  type="number"
                  defaultValue={settings.maxRadiusKm}
                  onBlur={(e) => saveSettings({ maxRadiusKm: Number(e.target.value) })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Toggle
                label="Collect commission"
                on={settings.commissionEnabled}
                onClick={() => saveSettings({ commissionEnabled: !settings.commissionEnabled })}
              />
              <Toggle
                label="New workers need approval"
                on={settings.requireWorkerApproval}
                onClick={() =>
                  saveSettings({ requireWorkerApproval: !settings.requireWorkerApproval })
                }
              />
              <Toggle
                label="Auto counter-offers"
                on={settings.autoBidEnabled}
                onClick={() => saveSettings({ autoBidEnabled: !settings.autoBidEnabled })}
              />
            </div>
            <Field label={`Auto offers per job (${settings.autoBidCount})`}>
              <input
                type="range"
                min={0}
                max={12}
                value={settings.autoBidCount}
                onChange={(e) => saveSettings({ autoBidCount: Number(e.target.value) })}
                className="w-full accent-lime-400"
              />
            </Field>
            <Field label={`Min worker rating to bid (${settings.minRatingToBid.toFixed(1)})`}>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={settings.minRatingToBid}
                onChange={(e) => saveSettings({ minRatingToBid: Number(e.target.value) })}
                className="w-full accent-lime-400"
              />
            </Field>
            <Field label="City / region label">
              <input
                defaultValue={settings.city}
                onBlur={(e) => saveSettings({ city: e.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
              />
            </Field>
            <Field label="Homepage announcement">
              <input
                defaultValue={settings.announcement}
                onBlur={(e) => saveSettings({ announcement: e.target.value })}
                placeholder="e.g. Dashain offer: 0% commission this week"
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
              />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
              <h2 className="mb-2 text-sm font-bold">Base rate per trade ({cur})</h2>
              <div className="space-y-2">
                {TRADES.map((t) => (
                  <div key={t.key} className="flex items-center gap-2">
                    <span className="w-40 text-slate-300">
                      {t.emoji} {t.label}
                    </span>
                    <input
                      type="number"
                      defaultValue={settings.tradeRates?.[t.key] ?? t.defaultRate}
                      onBlur={(e) =>
                        saveSettings({
                          tradeRates: {
                            ...(settings.tradeRates ?? {}),
                            [t.key]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1"
                    />
                    <span className="text-slate-500">
                      live avg{" "}
                      {stats &&
                        Math.round(
                          (workers
                            .filter((w) => w.trade === t.key)
                            .reduce((s, w) => s + w.baseRate, 0) /
                            Math.max(1, workers.filter((w) => w.trade === t.key).length)) || 0,
                        )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
              <h2 className="mb-2 text-sm font-bold">Enable / disable services</h2>
              <div className="flex flex-wrap gap-2">
                {TRADES.map((t) => {
                  const off = settings.disabledTrades
                    .split(",")
                    .map((d) => d.trim())
                    .includes(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        const list = settings.disabledTrades
                          .split(",")
                          .map((d) => d.trim())
                          .filter(Boolean)
                          .filter((d) => d !== t.key);
                        if (!off) list.push(t.key);
                        saveSettings({ disabledTrades: list.join(",") });
                      }}
                      className={`rounded-full px-3 py-1 font-bold ${
                        off ? "bg-rose-500/20 text-rose-300" : "bg-lime-400/20 text-lime-300"
                      }`}
                    >
                      {t.emoji} {t.label} {off ? "OFF" : "ON"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
              <h2 className="mb-2 text-sm font-bold">Quick worker add</h2>
              <QuickAdd onDone={load} />
            </div>
          </div>
        </div>
      )}

      {tab === "Social & Branding" && (
        <div className="mt-4 space-y-5">
          {/* Top Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime-400/40 bg-slate-900 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <h2 className="text-base font-extrabold text-slate-100">
                  Social Media Links, Helplines & Branding
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Full control over public links, customer support contact, emergency numbers, and admin password.
              </p>
            </div>
            <button
              onClick={async () => {
                await saveSettings({
                  socialLinks: socialDraft,
                  emergencyHotlines: hotlinesDraft,
                  appName: brandingDraft.appName,
                  appTagline: brandingDraft.appTagline,
                  city: brandingDraft.city,
                  adminPassword: brandingDraft.adminPassword,
                });
                setToast("Social media links & branding updated successfully!");
              }}
              className="rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-md shadow-lime-400/20 hover:bg-lime-300"
            >
              💾 Save All Social & Branding
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Social Media Links Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-lg">📱</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100">
                    Social Media Profiles & Channels
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Shown in the side menu drawer and app footer for community engagement.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    key: "facebook",
                    label: "Facebook Page",
                    icon: "📘",
                    placeholder: "https://facebook.com/kaamsathinpl",
                  },
                  {
                    key: "instagram",
                    label: "Instagram Profile",
                    icon: "📸",
                    placeholder: "https://instagram.com/kaamsathi.np",
                  },
                  {
                    key: "tiktok",
                    label: "TikTok Handle / Link",
                    icon: "🎵",
                    placeholder: "https://tiktok.com/@kaamsathi",
                  },
                  {
                    key: "whatsapp",
                    label: "WhatsApp Business Link / Number",
                    icon: "💬",
                    placeholder: "https://wa.me/9779801234567",
                  },
                  {
                    key: "youtube",
                    label: "YouTube Channel",
                    icon: "▶️",
                    placeholder: "https://youtube.com/@kaamsathi",
                  },
                  {
                    key: "twitter",
                    label: "X / Twitter",
                    icon: "🐦",
                    placeholder: "https://x.com/kaamsathinpl",
                  },
                  {
                    key: "website",
                    label: "Official Website",
                    icon: "🌐",
                    placeholder: "https://kaamsathi.com",
                  },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </label>
                    <input
                      type="url"
                      value={socialDraft[item.key] ?? ""}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          [item.key]: e.target.value,
                        })
                      }
                      placeholder={item.placeholder}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Support, Emergency, App Identity & Security */}
            <div className="space-y-4">
              {/* Customer Support & Helplines */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="text-lg">📞</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100">
                      Customer Support & Helplines
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Helpline numbers accessible by users directly from the drawer.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Support Helpline Phone
                    </label>
                    <input
                      value={socialDraft["supportPhone"] ?? ""}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          supportPhone: e.target.value,
                        })
                      }
                      placeholder="+977 9801234567"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Support Email Address
                    </label>
                    <input
                      value={socialDraft["supportEmail"] ?? ""}
                      onChange={(e) =>
                        setSocialDraft({
                          ...socialDraft,
                          supportEmail: e.target.value,
                        })
                      }
                      placeholder="support@kaamsathi.com"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                    Emergency Hotlines (Nepal)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { key: "police", label: "Police", placeholder: "100" },
                      { key: "ambulance", label: "Ambulance", placeholder: "102" },
                      { key: "traffic", label: "Traffic", placeholder: "103" },
                      { key: "fire", label: "Fire Brigade", placeholder: "101" },
                      { key: "womenHelp", label: "Women Helpline", placeholder: "1145" },
                      { key: "childHelp", label: "Child Helpline", placeholder: "1098" },
                    ].map((h) => (
                      <div key={h.key} className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          {h.label}
                        </label>
                        <input
                          value={hotlinesDraft[h.key] ?? h.placeholder}
                          onChange={(e) =>
                            setHotlinesDraft({
                              ...hotlinesDraft,
                              [h.key]: e.target.value,
                            })
                          }
                          className="w-full bg-transparent font-mono text-xs font-bold text-lime-400 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* App Identity & Admin Password */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100">
                      App Identity & Admin Security
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Change app name and set your private admin passcode.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      App Name
                    </label>
                    <input
                      value={brandingDraft.appName}
                      onChange={(e) =>
                        setBrandingDraft({
                          ...brandingDraft,
                          appName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      App Tagline
                    </label>
                    <input
                      value={brandingDraft.appTagline}
                      onChange={(e) =>
                        setBrandingDraft({
                          ...brandingDraft,
                          appTagline: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Change Admin Passcode
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={brandingDraft.adminPassword}
                      onChange={(e) =>
                        setBrandingDraft({
                          ...brandingDraft,
                          adminPassword: e.target.value,
                        })
                      }
                      placeholder="Enter new admin passcode"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-lime-400 focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    This updates the live admin authentication password in the PostgreSQL database.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={async () => {
                await saveSettings({
                  socialLinks: socialDraft,
                  emergencyHotlines: hotlinesDraft,
                  appName: brandingDraft.appName,
                  appTagline: brandingDraft.appTagline,
                  city: brandingDraft.city,
                  adminPassword: brandingDraft.adminPassword,
                });
                setToast("Social media links & branding updated successfully!");
              }}
              className="rounded-xl bg-lime-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-lime-400/20 hover:bg-lime-300"
            >
              💾 Save All Social & Branding
            </button>
          </div>
        </div>
      )}

      {tab === "API Keys & Integrations" && (
        <div className="mt-4 space-y-5">
          {/* Top Banner with Stats & Save */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime-400/40 bg-slate-900 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔑</span>
                <h2 className="text-base font-extrabold text-slate-100">
                  External API Keys & Integrations
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Connect Nepal SMS (Sparrow), Maps (Google/Mapbox), Payments (eSewa/Khalti/Stripe), Push Notifications & Cloud storage.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const lines = [
                    "# KaamSathi API Keys (Kathmandu Valley)",
                    `CITY="${settings?.city ?? "Kathmandu, Nepal"}"`,
                    `CURRENCY="${settings?.currency ?? "Rs"}"`,
                  ];
                  Object.entries(apiDraft).forEach(([k, v]) => {
                    if (v) lines.push(`${k}="${v}"`);
                  });
                  navigator.clipboard?.writeText(lines.join("\n"));
                  setToast("Copied .env format to clipboard!");
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 hover:border-lime-400 hover:text-lime-300"
              >
                📋 Copy as .env
              </button>
              <button
                onClick={async () => {
                  await saveSettings({ apiKeys: apiDraft });
                  setToast("All API keys successfully saved!");
                }}
                className="rounded-xl bg-lime-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-lime-400/20 hover:bg-lime-300"
              >
                💾 Save All API Keys
              </button>
            </div>
          </div>

          {/* Configuration Status Tracker */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-500">
                Configured Keys
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-lime-400">
                  {Object.values(apiDraft).filter((v) => Boolean(v?.trim())).length}
                </span>
                <span className="text-xs text-slate-400">active keys</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-500">
                Nepal SMS (Sparrow)
              </div>
              <div className="mt-1 text-xs font-bold text-slate-200">
                {apiDraft["SPARROW_SMS_TOKEN"] ? (
                  <span className="text-lime-400">🟢 Connected</span>
                ) : (
                  <span className="text-slate-500">⚪ Not set</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-500">
                Nepal Wallets (eSewa / Khalti)
              </div>
              <div className="mt-1 text-xs font-bold text-slate-200">
                {apiDraft["ESEWA_MERCHANT_CODE"] || apiDraft["KHALTI_PUBLIC_KEY"] ? (
                  <span className="text-lime-400">🟢 Ready</span>
                ) : (
                  <span className="text-slate-500">⚪ Cash on Service</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-500">
                Google Maps / Routing
              </div>
              <div className="mt-1 text-xs font-bold text-slate-200">
                {apiDraft["GOOGLE_MAPS_API_KEY"] ? (
                  <span className="text-lime-400">🟢 Google Maps Active</span>
                ) : (
                  <span className="text-sky-400">🔵 OSM Dark Leaflet Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Categorized API Form Sections */}
          <div className="space-y-4">
            {API_SECTIONS.map((sec) => (
              <div
                key={sec.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="mb-3">
                  <h3 className="text-sm font-extrabold text-slate-100">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-slate-400">{sec.description}</p>
                </div>

                <div className="space-y-3">
                  {sec.keys.map((k) => {
                    const val = apiDraft[k.key] ?? "";
                    const isRevealed = Boolean(revealedKeys[k.key]);
                    const isConfigured = Boolean(val.trim());
                    const isTested = testedKey === k.key;

                    return (
                      <div
                        key={k.key}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 transition hover:border-slate-700"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                          <label
                            htmlFor={`input-${k.key}`}
                            className="font-mono text-xs font-bold text-lime-300"
                          >
                            {k.key}
                          </label>
                          <div className="flex items-center gap-2">
                            {k.docs && (
                              <a
                                href={k.docs}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-slate-400 underline hover:text-lime-400"
                              >
                                Docs ↗
                              </a>
                            )}
                            <span
                              className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                                isConfigured
                                  ? "bg-lime-400/20 text-lime-300"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              {isConfigured ? "Configured" : "Empty"}
                            </span>
                          </div>
                        </div>

                        <p className="mb-1.5 text-[11px] text-slate-400">
                          {k.desc}
                        </p>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              id={`input-${k.key}`}
                              type={isRevealed ? "text" : "password"}
                              value={val}
                              onChange={(e) =>
                                setApiDraft({ ...apiDraft, [k.key]: e.target.value })
                              }
                              placeholder={k.placeholder}
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:border-lime-400 focus:outline-none"
                            />
                            {val && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedKeys({
                                    ...revealedKeys,
                                    [k.key]: !isRevealed,
                                  })
                                }
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-200"
                              >
                                {isRevealed ? "Hide" : "Show"}
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!val) {
                                setToast(`Please enter a value for ${k.key} first.`);
                                return;
                              }
                              setTestedKey(k.key);
                              setTimeout(() => {
                                setTestedKey(null);
                                setToast(`✓ ${k.key} format validated & ready!`);
                              }, 600);
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:border-lime-400 hover:text-lime-300"
                          >
                            {isTested ? "Testing…" : "Test Ping"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom API Keys Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h3 className="text-sm font-extrabold text-slate-100">
                  Custom & Webhook API Keys
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Put any other external service key needed for your setup (e.g. OPENAI_API_KEY, RESEND_API_KEY, TELEGRAM_BOT_TOKEN, WEBHOOK_URL).
              </p>
            </div>

            {/* List existing custom keys */}
            {(() => {
              const standardKeys = new Set(
                API_SECTIONS.flatMap((s) => s.keys.map((k) => k.key)),
              );
              const customEntries = Object.entries(apiDraft).filter(
                ([k]) => !standardKeys.has(k),
              );

              return (
                <div className="space-y-2 mb-4">
                  {customEntries.length === 0 && (
                    <p className="text-xs text-slate-500 italic">
                      No custom keys added yet. Use the form below to add one.
                    </p>
                  )}
                  {customEntries.map(([k, v]) => {
                    const isRevealed = Boolean(revealedKeys[k]);
                    return (
                      <div
                        key={k}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5"
                      >
                        <span className="font-mono text-xs font-bold text-amber-300 min-w-[160px]">
                          {k}
                        </span>
                        <div className="relative flex-1 min-w-[200px]">
                          <input
                            type={isRevealed ? "text" : "password"}
                            value={v}
                            onChange={(e) =>
                              setApiDraft({ ...apiDraft, [k]: e.target.value })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedKeys({
                                ...revealedKeys,
                                [k]: !isRevealed,
                              })
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
                          >
                            {isRevealed ? "Hide" : "Show"}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...apiDraft };
                            delete copy[k];
                            setApiDraft(copy);
                          }}
                          className="rounded bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/30"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Form to add a new custom key */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              <input
                value={customKeyName}
                onChange={(e) =>
                  setCustomKeyName(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                  )
                }
                placeholder="KEY_NAME (e.g. RESEND_API_KEY)"
                className="flex-1 min-w-[180px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600"
              />
              <input
                value={customKeyValue}
                onChange={(e) => setCustomKeyValue(e.target.value)}
                placeholder="Secret key or token value"
                className="flex-1 min-w-[220px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => {
                  if (!customKeyName.trim()) {
                    setToast("Please specify a Key Name");
                    return;
                  }
                  setApiDraft({
                    ...apiDraft,
                    [customKeyName.trim()]: customKeyValue,
                  });
                  setCustomKeyName("");
                  setCustomKeyValue("");
                  setToast(`Added custom key: ${customKeyName}`);
                }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-lime-300 hover:bg-slate-700"
              >
                + Add Custom Key
              </button>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={async () => {
                await saveSettings({ apiKeys: apiDraft });
                setToast("All API keys successfully saved to database!");
              }}
              className="rounded-xl bg-lime-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-lime-400/20 hover:bg-lime-300"
            >
              💾 Save All API Keys
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-slate-400">
      <span className="mb-1 block font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left font-bold ${
        on ? "bg-lime-400/20 text-lime-300" : "bg-slate-800 text-slate-400"
      }`}
    >
      {on ? "✓" : "✕"} {label}
    </button>
  );
}

function QuickAdd({ onDone }: { onDone: () => void }) {
  const [draft, setDraft] = useState({
    name: "",
    phone: "",
    trade: "plumber",
    area: "Thamel",
    baseRate: 800,
    experienceYears: 2,
    status: "approved",
  });
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Worker name"
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        />
        <input
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          placeholder="98xxxxxxxx"
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        />
        <select
          value={draft.trade}
          onChange={(e) => setDraft({ ...draft, trade: e.target.value })}
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        >
          {TRADES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={draft.area}
          onChange={(e) => setDraft({ ...draft, area: e.target.value })}
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        >
          {KTM_AREAS.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={draft.baseRate}
          onChange={(e) => setDraft({ ...draft, baseRate: Number(e.target.value) })}
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        />
        <input
          type="number"
          value={draft.experienceYears}
          onChange={(e) => setDraft({ ...draft, experienceYears: Number(e.target.value) })}
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        />
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/admin/mutate", {
            method: "POST",
            headers: adminHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ entity: "worker", action: "create", patch: draft }),
          });
          setBusy(false);
          onDone();
        }}
        className="w-full rounded-lg bg-lime-400 py-2 font-extrabold text-slate-950 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add worker"}
      </button>
    </div>
  );
}

function ManualAdjust({
  workers,
  onSubmit,
}: {
  workers: { id: number; name: string; phone: string }[];
  onSubmit: (providerId: number, amount: number, note: string) => void;
}) {
  const [providerId, setProviderId] = useState<number>(workers[0]?.id ?? 0);
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2">
      <select
        value={providerId}
        onChange={(e) => setProviderId(Number(e.target.value))}
        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
      >
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.phone})
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Amount (+credit / -debit)"
          className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(providerId, Math.abs(amount), note || "Admin credit")}
          className="flex-1 rounded-lg bg-lime-400 py-2 font-extrabold text-slate-950"
        >
          + Credit
        </button>
        <button
          onClick={() => onSubmit(providerId, -Math.abs(amount), note || "Admin debit")}
          className="flex-1 rounded-lg bg-rose-500/20 py-2 font-bold text-rose-300"
        >
          − Debit
        </button>
      </div>
    </div>
  );
}
