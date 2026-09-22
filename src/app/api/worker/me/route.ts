import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bids, jobRequests, providers, reviews } from "@/db/schema";
import { currentWorkerId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { KTM_AREAS, distanceKm, tradeByKey } from "@/lib/trades";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = await currentWorkerId(req);
  if (!id) return NextResponse.json({ provider: null });

  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  if (!provider) return NextResponse.json({ provider: null });

  const myBids = await db
    .select({ bid: bids, request: jobRequests })
    .from(bids)
    .innerJoin(jobRequests, eq(bids.requestId, jobRequests.id))
    .where(eq(bids.providerId, id))
    .orderBy(desc(bids.createdAt))
    .limit(40);

  const myReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.providerId, id))
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  return NextResponse.json({
    provider,
    bids: myBids.map((r) => ({ ...r.bid, request: r.request })),
    reviews: myReviews,
  });
}

export async function PATCH(req: NextRequest) {
  const id = await currentWorkerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const [current] = await db.select().from(providers).where(eq(providers.id, id));
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Partial<typeof providers.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 60);
  if (typeof body.avatar === "string" && body.avatar.trim())
    patch.avatar = body.avatar.slice(0, 8);
  if (typeof body.bio === "string") patch.bio = body.bio.slice(0, 600);
  if (typeof body.whatsapp === "string") patch.whatsapp = body.whatsapp.slice(0, 25);
  if (typeof body.languages === "string") patch.languages = body.languages.slice(0, 80);
  if (typeof body.trade === "string" && body.trade) patch.trade = body.trade;
  if (Array.isArray(body.skills)) patch.skills = body.skills.join("|").slice(0, 400);
  if (body.experienceYears !== undefined)
    patch.experienceYears = Math.max(0, Math.min(60, Number(body.experienceYears) || 0));
  if (body.baseRate !== undefined)
    patch.baseRate = Math.max(100, Math.min(100000, Number(body.baseRate) || 500));
  if (["visit", "hour", "day"].includes(body.priceUnit)) patch.priceUnit = body.priceUnit;
  if (typeof body.area === "string" && KTM_AREAS.some((a) => a.name === body.area)) {
    patch.area = body.area;
    const a = KTM_AREAS.find((x) => x.name === body.area)!;
    patch.lat = a.lat + (Math.random() - 0.5) * 0.008;
    patch.lng = a.lng + (Math.random() - 0.5) * 0.008;
  }
  if (Array.isArray(body.serviceAreas))
    patch.serviceAreas = body.serviceAreas.join(", ").slice(0, 200);
  if (typeof body.etaMins !== "undefined")
    patch.etaMins = Math.max(5, Math.min(180, Number(body.etaMins) || 20));
  if (typeof body.online === "boolean") patch.online = body.online;

  const [updated] = await db
    .update(providers)
    .set(patch)
    .where(eq(providers.id, id))
    .returning();
  return NextResponse.json({ provider: updated });
}

export async function POST(req: NextRequest) {
  // Toggle availability quickly
  const id = await currentWorkerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [current] = await db.select().from(providers).where(eq(providers.id, id));
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [updated] = await db
    .update(providers)
    .set({ online: !current.online })
    .where(eq(providers.id, id))
    .returning();
  return NextResponse.json({ provider: updated });
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}

// Expose matching open jobs for this worker
export async function PUT(req: NextRequest) {
  const id = await currentWorkerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [me] = await db.select().from(providers).where(eq(providers.id, id));
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const s = await getSettings();

  const open = await db.select().from(jobRequests).where(eq(jobRequests.status, "open"));
  const mine = await db.select().from(bids).where(eq(bids.providerId, id));
  const bidByReq = new Map(mine.map((b) => [b.requestId, b]));

  const jobs = open
    .filter((r) => r.trade === me.trade)
    // Only show jobs whose work-request area covers this worker.
    .map((r) => ({
      ...r,
      distanceKm: distanceKm(me, r),
      myBid: bidByReq.get(r.id) ?? null,
    }))
    .filter((r) => r.distanceKm <= (r.radiusKm ?? 1))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 40);

  const trade = tradeByKey(me.trade);
  return NextResponse.json({ jobs, trade, settings: { currency: s.currency } });
}
