import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers, reviews } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const providerId = Number(body.providerId);
  const stars = Math.min(5, Math.max(1, Math.round(Number(body.stars) || 5)));
  const comment = String(body.comment || "").slice(0, 300);
  const author = String(body.author || "Customer").slice(0, 60);

  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, providerId));
  if (!provider)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [review] = await db
    .insert(reviews)
    .values({ providerId, stars, comment, author })
    .returning();

  const all = await db
    .select()
    .from(reviews)
    .where(eq(reviews.providerId, providerId));
  const live = all.filter((r) => !r.hidden);
  const avg = live.length
    ? Math.round((live.reduce((s, r) => s + r.stars, 0) / live.length) * 10) / 10
    : 0;
  await db
    .update(providers)
    .set({ rating: avg, ratingCount: live.length })
    .where(eq(providers.id, providerId));
  await db
    .update(providers)
    .set({ jobsDone: provider.jobsDone + 1 })
    .where(eq(providers.id, providerId));

  return NextResponse.json({ review });
}
