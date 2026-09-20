import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bids, customers, jobRequests, providers } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { distanceKm, nearestArea } from "@/lib/trades";
import { getSettings } from "@/lib/settings";
import { currentCustomerId } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db
    .select()
    .from(jobRequests)
    .orderBy(desc(jobRequests.createdAt))
    .limit(30);
  return NextResponse.json({ requests: rows });
}

export async function POST(req: NextRequest) {
  await ensureSeed();
  const s = await getSettings();

  // 1) Require a customer login — phones are private until a worker is hired.
  const cid = await currentCustomerId(req);
  if (s.customerLoginRequired && !cid) {
    return NextResponse.json(
      { error: "Please create an account or log in first.", needsLogin: true },
      { status: 401 },
    );
  }
  const [me] = cid
    ? await db.select().from(customers).where(eq(customers.id, cid))
    : [];

  const body = await req.json();
  const customerName = (me?.name ?? String(body.customerName || "Guest")).slice(0, 60);
  const customerPhone = (me?.phone ?? String(body.customerPhone || "")).slice(0, 25);
  const trade = String(body.trade || "");
  const description = String(body.description || "").slice(0, 500);
  const offerPrice = Math.min(
    s.maxOffer,
    Math.max(s.minOffer, Math.round(Number(body.offerPrice) || s.minOffer)),
  );
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const pinLat = Number.isFinite(Number(body.pinLat)) ? Number(body.pinLat) : lat;
  const pinLng = Number.isFinite(Number(body.pinLng)) ? Number(body.pinLng) : lng;
  const address = String(body.address || "").slice(0, 200);
  const urgency = ["now", "today", "tomorrow", "flexible"].includes(body.urgency)
    ? String(body.urgency)
    : "today";
  const area = String(body.area || nearestArea(lat, lng)).slice(0, 60);

  // 2) GPS pin must be present — the worker needs it for directions.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Please share your location before sending the request." },
      { status: 400 },
    );
  }

  const disabled = s.disabledTrades.split(",").map((d) => d.trim());
  if (!trade || disabled.includes(trade)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Direct booking: request sent to one specific worker only
  const targetProviderId = Number(body.targetProviderId) || null;

  // The request area the customer selected (default 1 km) decides who sees
  // this job — only pros inside that radius can auto-bid.
  const requestAreaKm = Math.max(
    0.1,
    Math.min(s.maxRadiusKm, Number(body.radiusKm) || 1),
  );

  const [request] = await db
    .insert(jobRequests)
    .values({
      customerName,
      customerPhone,
      trade,
      description,
      offerPrice,
      lat,
      lng,
      pinLat,
      pinLng,
      area,
      address,
      urgency,
      targetProviderId,
      radiusKm: requestAreaKm,
      customerId: cid ?? null,
    })
    .returning();

  // Store latest GPS so customer's account remembers where they usually are
  if (cid && Number.isFinite(pinLat) && Number.isFinite(pinLng)) {
    await db
      .update(customers)
      .set({
        lat: pinLat,
        lng: pinLng,
        area,
      })
      .where(eq(customers.id, cid));
  }

  // Pop-ups to the worker feed instead of auto-generated bids — the worker
  // chooses whether to accept or decline each request.
  let bidCount = 0;
  if (s.autoBidEnabled && targetProviderId) {
    const all = await db.select().from(providers);
    const nearby = all
      .filter(
        (p) =>
          p.trade === trade &&
          p.online &&
          p.status === "approved" &&
          p.rating >= s.minRatingToBid &&
          // Wallet rule: workers need enough balance to receive job leads
          (!s.walletRequired || p.walletBalance >= s.leadFee) &&
          // If this is a direct request, only that individual worker responds
          (!targetProviderId || p.id === targetProviderId),
      )
      .map((p) => ({ ...p, d: distanceKm({ lat, lng }, p) }))
      .filter((p) => (targetProviderId ? true : p.d <= requestAreaKm))
      .sort((a, b) => a.d - b.d || b.rating - a.rating)
      .slice(0, targetProviderId ? 1 : s.autoBidCount);

    const templates = [
      "I can start right away, aaudai chhu.",
      "All tools with me — on the way now.",
      "Price includes basic materials, let's go.",
      "Little higher — job needs two people.",
      "Accepting your price, see you soon!",
      "Free inspection, then final price.",
    ];

    const swings = [0, 0.18, -0.06, 0.32, 0.1, 0.22];
    const bidRows = nearby.map((p, i) => {
      const swing = swings[i % swings.length];
      const base = (offerPrice * (1 + swing) + p.baseRate * 0.35) / 2;
      const price =
        Math.round((base * s.surgeMultiplier) / 50) * 50 + s.serviceFee;
      return {
        requestId: request.id,
        providerId: p.id,
        price: Math.max(s.minOffer, price),
        etaMins: Math.max(5, Math.round(p.etaMins * 0.6 + p.d * 5)),
        message: templates[i % templates.length],
        source: "auto",
      };
    });
    if (bidRows.length) {
      await db.insert(bids).values(bidRows);
      bidCount = bidRows.length;
    }
  }

  return NextResponse.json({ request, bidCount });
}
