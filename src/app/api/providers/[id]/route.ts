import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers, reviews, jobRequests, bids } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { currentCustomerId, currentWorkerId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const pid = Number(id);
  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, pid));
  if (!provider)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rs = await db
    .select()
    .from(reviews)
    .where(eq(reviews.providerId, pid))
    .orderBy(desc(reviews.createdAt));

  // Phone / WhatsApp reveal rules:
  //   - The worker themself always sees their own number.
  //   - A customer who has a job this worker accepted gets the number.
  //   - Otherwise the phone stays masked.
  const workerId = await currentWorkerId(req);
  const customerId = await currentCustomerId(req);
  let reveal = provider.id === workerId;
  if (!reveal && customerId) {
    const accepted = await db
      .select({ id: bids.id })
      .from(bids)
      .innerJoin(jobRequests, eq(bids.requestId, jobRequests.id))
      .where(
        and(
          eq(bids.providerId, pid),
          eq(bids.status, "accepted"),
          eq(jobRequests.customerId, customerId),
        ),
      );
    if (accepted.length) reveal = true;
  }
  const safeProvider = reveal
    ? provider
    : { ...provider, phone: "", whatsapp: "" };

  const s = await getSettings();
  return NextResponse.json({
    provider: safeProvider,
    revealPhone: reveal,
    reviews: rs.filter((r) => !r.hidden),
    settings: { currency: s.currency, commissionPct: s.commissionPct, serviceFee: s.serviceFee },
  });
}
