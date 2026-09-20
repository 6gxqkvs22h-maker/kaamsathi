import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bids, jobRequests, providers, transactions } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { currentWorkerId } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const rid = Number(id);
  const [request] = await db
    .select()
    .from(jobRequests)
    .where(eq(jobRequests.id, rid));
  if (!request)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({ bid: bids, provider: providers })
    .from(bids)
    .innerJoin(providers, eq(bids.providerId, providers.id))
    .where(eq(bids.requestId, rid));

  // Privacy: customer phone is only revealed to the accepted worker.
  const workerId = await currentWorkerId(req);
  const accepted = request.status === "accepted" && request.acceptedOfferId;
  const winners = accepted
    ? rows.filter((r) => r.bid.status === "accepted").map((r) => r.bid.providerId)
    : [];
  const showPhone = Boolean(workerId && winners.includes(workerId));

  // Phone number is intentionally omitted from public payloads.
  const safeRequest = { ...request, customerPhone: showPhone ? request.customerPhone : "" };

  return NextResponse.json({
    request: safeRequest,
    bids: rows
      .map((r) => ({
        ...r.bid,
        provider: { ...r.provider, phone: showPhone ? r.provider.phone : "" },
      }))
      .sort((a, b) => a.price - b.price),
    revealPhone: showPhone,
  });
}

// Worker acknowledges a direct bid/auto-bid without auto-accepting.
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = Number((await ctx.params).id);
  const workerId = await currentWorkerId(_req);
  if (!workerId)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { bids } = await import("@/db/schema");
  const rows = await db.select().from(bids).where(eq(bids.requestId, id));
  const mine = rows.find((b) => b.providerId === workerId);
  if (mine && mine.status === "pending") {
    await db
      .update(bids)
      .set({ status: "rejected", message: "Declined" })
      .where(eq(bids.id, mine.id));
  }
  return NextResponse.json({ ok: true });
}

// Edit the work-request area (only allowed while the request is still open).
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const radiusKm = Number(body.radiusKm);
  if (!Number.isFinite(radiusKm) || radiusKm < 0.1 || radiusKm > 50) {
    return NextResponse.json({ error: "Invalid radius" }, { status: 400 });
  }
  const [existing] = await db
    .select()
    .from(jobRequests)
    .where(eq(jobRequests.id, Number(id)));
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "open")
    return NextResponse.json(
      { error: "Cannot change area after the job is accepted." },
      { status: 409 },
    );

  const [updated] = await db
    .update(jobRequests)
    .set({ radiusKm })
    .where(eq(jobRequests.id, Number(id)))
    .returning();
  return NextResponse.json({ request: updated });
}

export async function PUT(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const [request] = await db
    .update(jobRequests)
    .set({ status: "completed" })
    .where(eq(jobRequests.id, Number(id)))
    .returning();
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const rid = Number(id);
  const body = await req.json();
  const bidId = Number(body.bidId);
  const [bid] = await db.select().from(bids).where(eq(bids.id, bidId));
  if (!bid || bid.requestId !== rid)
    return NextResponse.json({ error: "Invalid bid" }, { status: 400 });

  await db
    .update(bids)
    .set({ status: "rejected" })
    .where(eq(bids.requestId, rid));
  await db.update(bids).set({ status: "accepted" }).where(eq(bids.id, bidId));
  const [request] = await db
    .update(jobRequests)
    .set({ status: "accepted", acceptedOfferId: bidId })
    .where(eq(jobRequests.id, rid))
    .returning();

  // Wallet: deduct lead fee from the hired worker & record it so admin can track
  const s = await getSettings();
  if (s.walletRequired && s.leadFee > 0) {
    const [worker] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, bid.providerId));
    if (worker) {
      const newBalance = Math.max(0, worker.walletBalance - s.leadFee);
      await db
        .update(providers)
        .set({ walletBalance: newBalance })
        .where(eq(providers.id, worker.id));
      await db.insert(transactions).values({
        providerId: worker.id,
        type: "lead_fee",
        amount: -s.leadFee,
        method: "system",
        reference: `job#${rid}`,
        note: `Lead fee for accepted job #${rid} (${request.trade}, ${s.currency} ${bid.price})`,
        status: "approved",
        balanceAfter: newBalance,
      });
    }
  }

  return NextResponse.json({ request });
}
