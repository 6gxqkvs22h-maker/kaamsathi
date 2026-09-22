import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  jobRequests,
  notifications,
  providers,
} from "@/db/schema";
import { currentCustomerId, currentWorkerId } from "@/lib/auth";
import { matchScore, workerCompletion } from "@/lib/marketplace";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function resolveWorker(req: NextRequest) {
  const workerId = await currentWorkerId(req);
  if (workerId) {
    const [w] = await db.select().from(providers).where(eq(providers.id, workerId));
    if (w) return w;
  }
  const customerId = await currentCustomerId(req);
  if (customerId) {
    const owned = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, customerId));
    if (owned[0]) return owned[0];
  }
  return null;
}

/** Worker applies to a job. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const jobId = Number((await ctx.params).id);
  const me = await resolveWorker(req);
  if (!me)
    return NextResponse.json(
      { error: "Switch to Worker mode to apply.", needsWorker: true },
      { status: 401 },
    );

  const completion = workerCompletion(me);
  if (!completion.canApply) {
    return NextResponse.json(
      {
        error: "Complete your worker profile before applying.",
        needsProfile: true,
        missing: completion.missing.map((m) => m.label),
      },
      { status: 428 },
    );
  }

  const [job] = await db.select().from(jobRequests).where(eq(jobRequests.id, jobId));
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "open")
    return NextResponse.json(
      { error: "This job is no longer accepting applications." },
      { status: 409 },
    );
  if (job.expiresAt && new Date(job.expiresAt).getTime() < Date.now())
    return NextResponse.json({ error: "This job has expired." }, { status: 409 });

  // Prevent duplicate applications
  const existing = await db
    .select()
    .from(applications)
    .where(
      and(eq(applications.jobId, jobId), eq(applications.providerId, me.id)),
    );
  if (existing.length)
    return NextResponse.json(
      { error: "You already applied to this job.", application: existing[0] },
      { status: 409 },
    );

  const b = await req.json().catch(() => ({}));
  const m = matchScore({
    worker: {
      trade: me.trade,
      skills: me.skills,
      lat: me.lat,
      lng: me.lng,
      workTypes: me.workTypes,
      availableDays: me.availableDays,
      minRate: me.minRate,
      experienceYears: me.experienceYears,
    },
    job: {
      trade: job.trade,
      requiredSkills: job.requiredSkills,
      lat: job.lat,
      lng: job.lng,
      offerPrice: job.offerPrice,
      workType: job.workType,
      startDate: job.startDate,
    },
  });

  const [app] = await db
    .insert(applications)
    .values({
      jobId,
      providerId: me.id,
      message: String(b.message ?? "").slice(0, 500),
      expectedPay: Number(b.expectedPay) || job.offerPrice,
      availableConfirmed: b.availableConfirmed !== false,
      matchScore: m.score,
      status: "applied",
    })
    .returning();

  if (job.customerId) {
    await db.insert(notifications).values({
      customerId: job.customerId,
      title: "New application",
      body: `${me.name} applied for “${job.title || job.trade}”.`,
      kind: "application",
      href: `/hire/jobs/${jobId}`,
    });
  }

  return NextResponse.json({ application: app, match: m });
}

/** Worker withdraws their application. */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const jobId = Number((await ctx.params).id);
  const me = await resolveWorker(req);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await db
    .update(applications)
    .set({ status: "cancelled" })
    .where(
      and(eq(applications.jobId, jobId), eq(applications.providerId, me.id)),
    );
  return NextResponse.json({ ok: true });
}
