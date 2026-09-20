import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers, transactions } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { getSettings } from "@/lib/settings";
import { KTM_AREAS, tradeByKey } from "@/lib/trades";
import { WORKER_COOKIE, cookieOptions, makeToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSeed();
  const s = await getSettings();
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim().slice(0, 60);
  const phone = String(body.phone || "").trim().slice(0, 25);
  const trade = String(body.trade || "");
  const skills = Array.isArray(body.skills)
    ? body.skills.map((x: unknown) => String(x).slice(0, 60)).slice(0, 12)
    : [];
  const experienceYears = Math.max(0, Math.min(60, Number(body.experienceYears) || 0));
  const baseRate = Math.max(100, Math.min(100000, Number(body.baseRate) || 500));
  const priceUnit = ["visit", "hour", "day"].includes(body.priceUnit)
    ? String(body.priceUnit)
    : "visit";
  const areaName = KTM_AREAS.find((a) => a.name === body.area)?.name ?? KTM_AREAS[0].name;
  const area = KTM_AREAS.find((a) => a.name === areaName) ?? KTM_AREAS[0];
  const serviceAreas = Array.isArray(body.serviceAreas)
    ? body.serviceAreas.map((x: unknown) => String(x)).join(", ").slice(0, 200)
    : areaName;
  const languages = String(body.languages || "Nepali, English").slice(0, 80);
  const bio = String(body.bio || "").slice(0, 600);
  const whatsapp = String(body.whatsapp || phone).slice(0, 25);
  const avatar = String(body.avatar || tradeByKey(trade).emoji).slice(0, 8);
  const online = body.online !== false;

  if (!name || !phone || !trade) {
    return NextResponse.json(
      { error: "Name, phone and service category are required" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(providers)
    .where(eq(providers.phone, phone));
  if (existing) {
    return NextResponse.json(
      { error: "This phone number already has a worker profile. Log in instead." },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(providers)
    .values({
      name,
      phone,
      whatsapp,
      trade,
      skills: skills.join("|"),
      experienceYears,
      baseRate,
      priceUnit,
      area: areaName,
      serviceAreas,
      languages,
      bio,
      avatar,
      online,
      etaMins: 20,
      lat: area.lat + (Math.random() - 0.5) * 0.008,
      lng: area.lng + (Math.random() - 0.5) * 0.008,
      rating: 0,
      ratingCount: 0,
      jobsDone: 0,
      verified: false,
      status: s.requireWorkerApproval ? "pending" : "approved",
      walletBalance: 200,
    })
    .returning();

  // Welcome bonus so new workers can send their first offers
  await db.insert(transactions).values({
    providerId: created.id,
    type: "topup",
    amount: 200,
    method: "system",
    note: "Welcome bonus — free starting credit",
    status: "approved",
    balanceAfter: 200,
  });

  const token = makeToken(String(created.id));
  const res = NextResponse.json({ provider: created, token });
  res.cookies.set(WORKER_COOKIE, token, cookieOptions);
  return res;
}
