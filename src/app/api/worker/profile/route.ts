import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, providers } from "@/db/schema";
import { currentCustomerId, currentWorkerId } from "@/lib/auth";
import { joinList, workerCompletion } from "@/lib/marketplace";
import { KTM_AREAS, tradeByKey } from "@/lib/trades";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function resolve(req: NextRequest) {
  const customerId = await currentCustomerId(req);
  let profile = null;
  if (customerId) {
    const owned = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, customerId));
    profile = owned[0] ?? null;
  }
  if (!profile) {
    const workerId = await currentWorkerId(req);
    if (workerId) {
      const [w] = await db.select().from(providers).where(eq(providers.id, workerId));
      profile = w ?? null;
    }
  }
  return { customerId, profile };
}

export async function GET(req: NextRequest) {
  const { profile } = await resolve(req);
  if (!profile) return NextResponse.json({ profile: null });
  return NextResponse.json({
    profile,
    completion: workerCompletion(profile),
  });
}

/**
 * Create or update the worker profile for the signed-in account.
 * This is what powers "Complete your worker profile" on first mode switch.
 */
export async function POST(req: NextRequest) {
  const { customerId, profile } = await resolve(req);
  if (!customerId && !profile)
    return NextResponse.json(
      { error: "Sign in to set up your worker profile." },
      { status: 401 },
    );

  const b = await req.json().catch(() => ({}));
  const area = KTM_AREAS.find((a) => a.name === b.area) ?? KTM_AREAS[0];
  const trade = String(b.trade ?? "helper");

  const values = {
    name: String(b.name ?? "").trim().slice(0, 60),
    phone: String(b.phone ?? "").trim().slice(0, 25),
    email: String(b.email ?? "").trim().slice(0, 80),
    avatar: String(b.avatar ?? tradeByKey(trade).emoji).slice(0, 8),
    trade,
    skills: Array.isArray(b.skills) ? joinList(b.skills).slice(0, 400) : "",
    bio: String(b.bio ?? "").slice(0, 600),
    dob: String(b.dob ?? "").slice(0, 20),
    gender: String(b.gender ?? "").slice(0, 20),
    education: String(b.education ?? "").slice(0, 200),
    certifications: String(b.certifications ?? "").slice(0, 300),
    pastWork: String(b.pastWork ?? "").slice(0, 600),
    languages: String(b.languages ?? "Nepali, English").slice(0, 80),
    experienceYears: Math.max(0, Math.min(60, Number(b.experienceYears) || 0)),
    baseRate: Math.max(0, Math.min(100000, Number(b.baseRate) || 0)),
    minRate: Math.max(0, Math.min(100000, Number(b.minRate) || 0)),
    priceUnit: ["visit", "hour", "day"].includes(b.priceUnit) ? b.priceUnit : "day",
    workTypes: Array.isArray(b.workTypes) ? joinList(b.workTypes) : "",
    availableDays: Array.isArray(b.availableDays) ? joinList(b.availableDays) : "",
    preferredHours: String(b.preferredHours ?? "").slice(0, 60),
    area: area.name,
    serviceAreas: Array.isArray(b.serviceAreas)
      ? b.serviceAreas.join(", ").slice(0, 200)
      : area.name,
    lat: area.lat + (Math.random() - 0.5) * 0.008,
    lng: area.lng + (Math.random() - 0.5) * 0.008,
  };

  if (!values.name || !values.phone)
    return NextResponse.json(
      { error: "Name and phone number are required." },
      { status: 400 },
    );

  let saved;
  if (profile) {
    const [updated] = await db
      .update(providers)
      .set(values)
      .where(eq(providers.id, profile.id))
      .returning();
    saved = updated;
  } else {
    const [created] = await db
      .insert(providers)
      .values({
        ...values,
        userId: customerId,
        online: true,
        etaMins: 20,
        status: "approved",
        walletBalance: 200,
      })
      .returning();
    saved = created;
    // Remember that this account now has a worker profile.
    if (customerId) {
      await db
        .update(customers)
        .set({ activeMode: "worker" })
        .where(eq(customers.id, customerId));
    }
  }

  return NextResponse.json({
    profile: saved,
    completion: workerCompletion(saved),
  });
}
