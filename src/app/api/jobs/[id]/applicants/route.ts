import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  jobRequests,
  notifications,
  providers,
} from "@/db/schema";
import { currentCustomerId } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** HIRE PRO — list applicants for a job they own. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const jobId = Number((await ctx.params).id);
  const customerId = await currentCustomerId(req);
  if (!customerId)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [job] = await db.select().from(jobRequests).where(eq(jobRequests.id, jobId));
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.customerId !== customerId)
    return NextResponse.json({ error: "Not your job" }, { status: 403 });

  const rows = await db
    .select({ app: applications, worker: providers })
    .from(applications)
    .innerJoin(providers, eq(applications.providerId, providers.id))
    .where(eq(applications.jobId, jobId));

  // Mark unseen applications as viewed.
  const unseen = rows.filter((r) => r.app.status === "applied").map((r) => r.app.id);
  if (unseen.length) {
    for (const id of unseen) {
      await db.update(applications).set({ status: "viewed" }).where(eq(applications.id, id));
    }
  }

  const selectedId = rows.find((r) => r.app.status === "selected")?.worker.id ?? null;

  return NextResponse.json({
    job,
    applicants: rows
      .map((r) => ({
        ...r.app,
        status: unseen.includes(r.app.id) ? "viewed" : r.app.status,
        worker: {
          id: r.worker.id,
          name: r.worker.name,
          avatar: r.worker.avatar,
          trade: r.worker.trade,
          skills: r.worker.skills,
          area: r.worker.area,
          rating: r.worker.rating,
          ratingCount: r.worker.ratingCount,
          jobsDone: r.worker.jobsDone,
          experienceYears: r.worker.experienceYears,
          verified: r.worker.verified,
          baseRate: r.worker.baseRate,
          priceUnit: r.worker.priceUnit,
          bio: r.worker.bio,
          // Contact is revealed only to the hiring Pro once selected.
          phone: r.worker.id === selectedId ? r.worker.phone : "",
        },
      }))
      .sort((a, b) => b.matchScore - a.matchScore),
  });
}

/** HIRE PRO — shortlist / select / reject an applicant. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const jobId = Number((await ctx.params).id);
  const customerId = await currentCustomerId(req);
  if (!customerId)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [job] = await db.select().from(jobRequests).where(eq(jobRequests.id, jobId));
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.customerId !== customerId)
    return NextResponse.json({ error: "Not your job" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const applicationId = Number(b.applicationId);
  const action = String(b.action ?? "");
  const allowed = ["shortlisted", "selected", "rejected", "completed"];
  if (!allowed.includes(action))
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId));
  if (!app || app.jobId !== jobId)
    return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const [updated] = await db
    .update(applications)
    .set({ status: action })
    .where(eq(applications.id, applicationId))
    .returning();

  if (action === "selected") {
    // Job moves into progress; other applicants are informed.
    await db
      .update(jobRequests)
      .set({ status: "accepted", acceptedOfferId: applicationId })
      .where(eq(jobRequests.id, jobId));
  }
  if (action === "completed") {
    await db
      .update(jobRequests)
      .set({ status: "completed" })
      .where(eq(jobRequests.id, jobId));
  }

  const msg: Record<string, string> = {
    shortlisted: "You were shortlisted",
    selected: "You got the job!",
    rejected: "Application not selected",
    completed: "Work marked complete",
  };
  await db.insert(notifications).values({
    providerId: app.providerId,
    title: msg[action],
    body: `“${job.title || job.trade}” in ${job.area}.`,
    kind: "application",
    href: `/work/applications`,
  });

  return NextResponse.json({ application: updated });
}
