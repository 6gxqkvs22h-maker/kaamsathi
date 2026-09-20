import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers, transactions } from "@/db/schema";
import { currentWorkerId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = await currentWorkerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [me] = await db.select().from(providers).where(eq(providers.id, id));
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const s = await getSettings();
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.providerId, id))
    .orderBy(desc(transactions.createdAt))
    .limit(50);

  return NextResponse.json({
    balance: me.walletBalance,
    leadFee: s.leadFee,
    minTopup: s.minTopup,
    walletRequired: s.walletRequired,
    currency: s.currency,
    canBid: !s.walletRequired || me.walletBalance >= s.leadFee,
    transactions: rows,
  });
}

// Worker submits a top-up request (admin approves it)
export async function POST(req: NextRequest) {
  const id = await currentWorkerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const s = await getSettings();
  const body = await req.json().catch(() => ({}));
  const amount = Math.round(Number(body.amount) || 0);
  const method = ["esewa", "khalti", "bank", "cash"].includes(body.method)
    ? String(body.method)
    : "esewa";
  const reference = String(body.reference || "").slice(0, 80);

  if (amount < s.minTopup) {
    return NextResponse.json(
      { error: `Minimum top-up is ${s.currency} ${s.minTopup}` },
      { status: 400 },
    );
  }
  if (!reference.trim()) {
    return NextResponse.json(
      { error: "Add the payment reference / transaction ID so admin can verify." },
      { status: 400 },
    );
  }

  const [tx] = await db
    .insert(transactions)
    .values({
      providerId: id,
      type: "topup",
      amount,
      method,
      reference,
      note: `Top-up request via ${method}`,
      status: "pending",
    })
    .returning();

  return NextResponse.json({
    transaction: tx,
    message: "Top-up submitted! Admin will verify and add balance shortly.",
  });
}
