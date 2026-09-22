import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers, savedJobs } from "@/db/schema";
import { currentCustomerId, currentWorkerId } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function resolveWorkerId(req: NextRequest) {
  const workerId = await currentWorkerId(req);
  if (workerId) return workerId;
  const customerId = await currentCustomerId(req);
  if (customerId) {
    const owned = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, customerId));
    if (owned[0]) return owned[0].id;
  }
  return null;
}

/** Toggle bookmark on a job. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const jobId = Number((await ctx.params).id);
  const providerId = await resolveWorkerId(req);
  if (!providerId)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const existing = await db
    .select()
    .from(savedJobs)
    .where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.providerId, providerId)));

  if (existing.length) {
    await db
      .delete(savedJobs)
      .where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.providerId, providerId)));
    return NextResponse.json({ saved: false });
  }
  await db.insert(savedJobs).values({ jobId, providerId });
  return NextResponse.json({ saved: true });
}
