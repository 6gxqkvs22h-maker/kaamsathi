import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  customers,
  jobRequests,
  providers,
  savedJobs,
} from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { currentCustomerId, currentWorkerId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { distanceKm, nearestArea } from "@/lib/trades";
import { matchScore, splitList } from "@/lib/marketplace";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** WORKER JOB FEED — filters, search, matching, pagination. */
export async function GET(req: NextRequest) {
  await ensureSeed();
  const sp = req.nextUrl.searchParams;
  const workerId = await currentWorkerId(req);
  const customerId = await currentCustomerId(req);

  // Resolve the viewing worker (session worker, or worker owned by the account)
  let me = null;
  if (workerId) {
    const [w] = await db.select().from(providers).where(eq(providers.id, workerId));
    me = w ?? null;
  }
  if (!me && customerId) {
    const owned = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, customerId));
    me = owned[0] ?? null;
  }

  const q = (sp.get("q") ?? "").toLowerCase().trim();
  const category = sp.get("category") ?? "";
  const workType = sp.get("workType") ?? "";
  const minPay = Number(sp.get("minPay") ?? 0);
  const maxPay = Number(sp.get("maxPay") ?? 0);
  const paymentType = sp.get("paymentType") ?? "";
  const when = sp.get("when") ?? "";
  const maxKm = Number(sp.get("maxKm") ?? 0);
  const onlyMySkills = sp.get("mySkills") === "1";
  const sort = sp.get("sort") ?? "match";
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = 20;

  const originLat = Number(sp.get("lat") ?? me?.lat ?? 27.7172);
  const originLng = Number(sp.get("lng") ?? me?.lng ?? 85.324);

  const all = await db
    .select()
    .from(jobRequests)
    .orderBy(desc(jobRequests.createdAt))
    .limit(400);

  // Applications + saves by this worker (so the feed can show state)
  const myApps = me
    ? await db.select().from(applications).where(eq(applications.providerId, me.id))
    : [];
  const mySaves = me
    ? await db.select().from(savedJobs).where(eq(savedJobs.providerId, me.id))
    : [];
  const appByJob = new Map(myApps.map((a) => [a.jobId, a]));
  const savedSet = new Set(mySaves.map((s) => s.jobId));

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  let rows = all
    .filter((j) => j.status === "open")
    // job expiry — old posts drop out of the feed
    .filter((j) => !j.expiresAt || new Date(j.expiresAt).getTime() > now)
    .map((j) => {
      const d = distanceKm(
        { lat: originLat, lng: originLng },
        { lat: j.lat, lng: j.lng },
      );
      const m = me
        ? matchScore({
            worker: {
              trade: me.trade,
              skills: me.skills,
              lat: me.lat,
              lng: me.lng,
              workTypes: me.workTypes,
              availableDays: me.availableDays,
              minRate: me.minRate,
              experienceYears: me.experienceYears,
            },
            job: {
              trade: j.trade,
              requiredSkills: j.requiredSkills,
              lat: j.lat,
              lng: j.lng,
              offerPrice: j.offerPrice,
              workType: j.workType,
              startDate: j.startDate,
            },
          })
        : { score: 0, label: "", reasons: [] };
      const app = appByJob.get(j.id) ?? null;
      return {
        ...j,
        distanceKm: d,
        match: m,
        applied: Boolean(app),
        applicationStatus: app?.status ?? null,
        saved: savedSet.has(j.id),
      };
    });

  if (category) rows = rows.filter((j) => j.trade === category);
  if (workType) rows = rows.filter((j) => j.workType === workType);
  if (paymentType) rows = rows.filter((j) => j.paymentType === paymentType);
  if (minPay) rows = rows.filter((j) => j.offerPrice >= minPay);
  if (maxPay) rows = rows.filter((j) => j.offerPrice <= maxPay);
  if (maxKm) rows = rows.filter((j) => j.distanceKm <= maxKm);
  if (when === "today") rows = rows.filter((j) => !j.startDate || j.startDate === today);
  if (when === "urgent") rows = rows.filter((j) => j.urgency === "now");
  if (onlyMySkills && me) {
    const mine = splitList(me.skills).map((s) => s.toLowerCase());
    rows = rows.filter(
      (j) =>
        j.trade === me.trade ||
        splitList(j.requiredSkills).some((s) => mine.includes(s.toLowerCase())),
    );
  }
  if (q) {
    rows = rows.filter((j) =>
      [j.title, j.description, j.trade, j.area, j.requiredSkills]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  rows.sort((a, b) => {
    if (sort === "newest")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "nearest") return a.distanceKm - b.distanceKm;
    if (sort === "pay") return b.offerPrice - a.offerPrice;
    return b.match.score - a.match.score;
  });

  const total = rows.length;
  const paged = rows.slice((page - 1) * perPage, page * perPage);

  const s = await getSettings();
  return NextResponse.json({
    jobs: paged,
    total,
    page,
    hasMore: page * perPage < total,
    currency: s.currency,
    viewer: me
      ? { id: me.id, trade: me.trade, skills: me.skills, area: me.area }
      : null,
  });
}

/** HIRE PRO — post work. */
export async function POST(req: NextRequest) {
  await ensureSeed();
  const customerId = await currentCustomerId(req);
  if (!customerId)
    return NextResponse.json(
      { error: "Please sign in to post work.", needsLogin: true },
      { status: 401 },
    );

  const [me] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!me) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const s = await getSettings();
  const b = await req.json().catch(() => ({}));

  const title = String(b.title ?? "").trim().slice(0, 120);
  const trade = String(b.category ?? b.trade ?? "").trim();
  const description = String(b.description ?? "").trim().slice(0, 1000);
  if (!title) return NextResponse.json({ error: "Add a job title." }, { status: 400 });
  if (!trade)
    return NextResponse.json({ error: "Choose a work category." }, { status: 400 });

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return NextResponse.json({ error: "Set the job location." }, { status: 400 });

  const offerPrice = Math.min(
    s.maxOffer,
    Math.max(s.minOffer, Math.round(Number(b.offerPrice) || s.minOffer)),
  );
  const workersNeeded = Math.max(1, Math.min(50, Number(b.workersNeeded) || 1));
  const durationHours = Number(b.durationHours) || null;
  const expiryDays = Math.max(1, Math.min(60, Number(b.expiryDays) || 14));

  const [job] = await db
    .insert(jobRequests)
    .values({
      customerId,
      customerName: me.name,
      customerPhone: me.phone,
      title,
      trade,
      requiredSkills: Array.isArray(b.requiredSkills)
        ? b.requiredSkills.join("|").slice(0, 400)
        : String(b.requiredSkills ?? "").slice(0, 400),
      description,
      offerPrice,
      paymentType: ["fixed", "daily", "hourly", "negotiable"].includes(b.paymentType)
        ? b.paymentType
        : "fixed",
      workType: String(b.workType ?? "one-day").slice(0, 30),
      workersNeeded,
      durationHours,
      startDate: String(b.startDate ?? "").slice(0, 20),
      startTime: String(b.startTime ?? "").slice(0, 20),
      lat,
      lng,
      pinLat: lat,
      pinLng: lng,
      area: String(b.area || nearestArea(lat, lng)).slice(0, 60),
      address: String(b.address ?? "").slice(0, 200),
      urgency: b.urgent ? "now" : String(b.urgency ?? "today"),
      radiusKm: Math.max(0.5, Math.min(s.maxRadiusKm, Number(b.radiusKm) || 5)),
      status: "open",
      expiresAt: new Date(Date.now() + expiryDays * 86400000),
    })
    .returning();

  return NextResponse.json({ job });
}
