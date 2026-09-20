import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  bids,
  jobRequests,
  providers,
  transactions,
} from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { currentWorkerId } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Worker responds to a customer request.
 *  - "accept": becomes the hired worker, customer phone unlocked, leads the
 *    request page shows directions.
 *  - "decline": records the decline, no charges.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = Number((await ctx.params).id);
  const workerId = await currentWorkerId(req);
  if (!workerId)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "accept");
  const price = Math.max(0, Math.round(Number(body.price) || 0));
  const etaMins = Math.max(5, Math.round(Number(body.etaMins) || 20));
  const message = String(body.message ?? "").slice(0, 240);

  const settings = await getSettings();
  if (settings.walletRequired && !body.skipWallet) {
    if (!price) {
      return NextResponse.json(
        { error: "Quote your price before accepting." },
        { status: 400 },
      );
    }
  }

  const [request] = await db
    .select()
    .from(jobRequests)
    .where(eq(jobRequests.id, id));
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "open")
    return NextResponse.json(
      { error: "This request is no longer open." },
      { status: 409 },
    );
  if (request.trade) {
    const [me] = await db.select().from(providers).where(eq(providers.id, workerId));
    if (me && me.trade !== request.trade) {
      return NextResponse.json({ error: "Trade mismatch" }, { status: 400 });
    }
  }

  // Upsert the worker's bid row (auto-bids may have created one).
  const mine = await db
    .select()
    .from(bids)
    .where(eq(bids.providerId, workerId));
  let bidId = mine.find((b) => b.requestId === id)?.id;

  if (action === "decline") {
    if (bidId) {
      await db
        .update(bids)
        .set({ status: "rejected", message: message || "Declined" })
        .where(eq(bids.id, bidId));
    }
    return NextResponse.json({ ok: true, status: "declined" });
  }

  if (!bidId) {
    const [created] = await db
      .insert(bids)
      .values({
        requestId: id,
        providerId: workerId,
        price,
        etaMins,
        message: message || "I can do this job.",
        status: "accepted",
        source: "worker",
      })
      .returning();
    bidId = created.id;
  } else {
    await db
      .update(bids)
      .set({
        price,
        etaMins,
        message: message || "I can do this job.",
        status: "accepted",
      })
      .where(eq(bids.id, bidId));
  }

  // Close out the request & reject other bids.
  await db
    .update(bids)
    .set({ status: "rejected" })
    .where(eq(bids.requestId, id));
  await db
    .update(jobRequests)
    .set({ status: "accepted", acceptedOfferId: bidId })
    .where(eq(jobRequests.id, id));
  await db
    .update(bids)
    .set({ status: "accepted" })
    .where(eq(bids.id, bidId));

  // Wallet: deduct lead fee from the hired worker so admin can track usage.
  if (settings.walletRequired && settings.leadFee > 0) {
    const [worker] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, workerId));
    if (worker) {
      const newBalance = Math.max(0, worker.walletBalance - settings.leadFee);
      await db
        .update(providers)
        .set({ walletBalance: newBalance })
        .where(eq(providers.id, worker.id));
      await db.insert(transactions).values({
        providerId: worker.id,
        type: "lead_fee",
        amount: -settings.leadFee,
        method: "system",
        reference: `job#${id}`,
        note: `Lead fee for accepted job #${id} (${request.trade}, ${settings.currency} ${price})`,
        status: "approved",
        balanceAfter: newBalance,
      });
    }
  }

  return NextResponse.json({ ok: true, status: "accepted", bidId });
}
