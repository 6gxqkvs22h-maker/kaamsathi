import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bids, jobRequests, providers } from "@/db/schema";
import { currentWorkerId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const id = await currentWorkerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const requestId = Number(body.requestId);
  const s = await getSettings();

  const [me] = await db.select().from(providers).where(eq(providers.id, id));
  const [request] = await db
    .select()
    .from(jobRequests)
    .where(eq(jobRequests.id, requestId));
  if (!me || !request)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.status !== "approved")
    return NextResponse.json(
      { error: "Your profile is awaiting admin approval." },
      { status: 403 },
    );
  if (s.walletRequired && me.walletBalance < s.leadFee)
    return NextResponse.json(
      {
        error: `Wallet balance too low (${s.currency} ${me.walletBalance}). Top up at least ${s.currency} ${s.leadFee} to send offers.`,
        needTopup: true,
      },
      { status: 402 },
    );
  if (request.trade !== me.trade)
    return NextResponse.json({ error: "Trade mismatch" }, { status: 400 });
  if (request.status !== "open")
    return NextResponse.json(
      { error: "This request is already closed." },
      { status: 409 },
    );

  const price = Math.max(
    s.minOffer,
    Math.min(s.maxOffer, Math.round(Number(body.price) || 500)),
  );
  const etaMins = Math.max(5, Math.min(240, Math.round(Number(body.etaMins) || 30)));
  const message = String(body.message || "I can do this job.").slice(0, 240);

  const mine = await db.select().from(bids).where(eq(bids.providerId, id));
  const existing = mine.find((b) => b.requestId === requestId);
  if (existing) {
    if (existing.status === "accepted")
      return NextResponse.json({ error: "Already accepted" }, { status: 409 });
    const [updated] = await db
      .update(bids)
      .set({ price, etaMins, message, status: "pending" })
      .where(eq(bids.id, existing.id))
      .returning();
    return NextResponse.json({ bid: updated });
  }

  const [created] = await db
    .insert(bids)
    .values({ requestId, providerId: id, price, etaMins, message, source: "worker" })
    .returning();
  return NextResponse.json({ bid: created });
}
