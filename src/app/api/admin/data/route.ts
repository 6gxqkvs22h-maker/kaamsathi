import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bids, jobRequests, providers, reviews, transactions } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { getSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSeed();

  const settingsRow = await getSettings();
  const workerRows = await db
    .select()
    .from(providers)
    .orderBy(desc(providers.createdAt))
    .limit(400);
  const requestRows = await db
    .select()
    .from(jobRequests)
    .orderBy(desc(jobRequests.createdAt))
    .limit(200);
  const bidRows = await db
    .select({ bid: bids, provider: providers })
    .from(bids)
    .innerJoin(providers, eq(bids.providerId, providers.id))
    .orderBy(desc(bids.createdAt))
    .limit(200);
  const reviewRows = await db
    .select({ review: reviews, provider: providers })
    .from(reviews)
    .innerJoin(providers, eq(reviews.providerId, providers.id))
    .orderBy(desc(reviews.createdAt))
    .limit(200);

  const txRows = await db
    .select({ tx: transactions, provider: providers })
    .from(transactions)
    .innerJoin(providers, eq(transactions.providerId, providers.id))
    .orderBy(desc(transactions.createdAt))
    .limit(300);

  const accepted = bidRows.filter((b) => b.bid.status === "accepted");
  const gmv = accepted.reduce((s, b) => s + b.bid.price, 0);
  const commission = settingsRow.commissionEnabled
    ? Math.round((gmv * settingsRow.commissionPct) / 100)
    : 0;

  const byTrade: Record<string, { workers: number; requests: number }> = {};
  for (const w of workerRows) {
    byTrade[w.trade] = byTrade[w.trade] ?? { workers: 0, requests: 0 };
    byTrade[w.trade].workers++;
  }
  for (const r of requestRows) {
    byTrade[r.trade] = byTrade[r.trade] ?? { workers: 0, requests: 0 };
    byTrade[r.trade].requests++;
  }

  return NextResponse.json({
    settings: settingsRow,
    providers: workerRows,
    requests: requestRows,
    bids: bidRows.map((b) => ({ ...b.bid, providerName: b.provider.name, providerTrade: b.provider.trade })),
    reviews: reviewRows.map((r) => ({ ...r.review, providerName: r.provider.name })),
    transactions: txRows.map((t) => ({
      ...t.tx,
      providerName: t.provider.name,
      providerPhone: t.provider.phone,
      providerBalance: t.provider.walletBalance,
    })),
    stats: {
      workers: workerRows.length,
      online: workerRows.filter((w) => w.online).length,
      pending: workerRows.filter((w) => w.status === "pending").length,
      verified: workerRows.filter((w) => w.verified).length,
      requests: requestRows.length,
      open: requestRows.filter((r) => r.status === "open").length,
      bids: bidRows.length,
      booked: accepted.length,
      gmv,
      commission,
      avgWorkerRate: workerRows.length
        ? Math.round(workerRows.reduce((s, w) => s + w.baseRate, 0) / workerRows.length)
        : 0,
      avgRating: workerRows.length
        ? Math.round((workerRows.reduce((s, w) => s + w.rating, 0) / workerRows.length) * 10) / 10
        : 0,
      byTrade,
      walletTotal: workerRows.reduce((s, w) => s + w.walletBalance, 0),
      pendingTopups: txRows.filter((t) => t.tx.status === "pending" && t.tx.type === "topup").length,
      topupVolume: txRows
        .filter((t) => t.tx.type === "topup" && t.tx.status === "approved")
        .reduce((s, t) => s + t.tx.amount, 0),
      leadFeeEarned: -txRows
        .filter((t) => t.tx.type === "lead_fee")
        .reduce((s, t) => s + t.tx.amount, 0),
    },
  });
}
