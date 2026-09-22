import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, jobRequests, providers, savedJobs } from "@/db/schema";
import { currentCustomerId, currentWorkerId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** WORKER — my applications + my saved jobs. */
export async function GET(req: NextRequest) {
  let me = null;
  const workerId = await currentWorkerId(req);
  if (workerId) {
    const [w] = await db.select().from(providers).where(eq(providers.id, workerId));
    me = w ?? null;
  }
  if (!me) {
    const customerId = await currentCustomerId(req);
    if (customerId) {
      const owned = await db
        .select()
        .from(providers)
        .where(eq(providers.userId, customerId));
      me = owned[0] ?? null;
    }
  }
  if (!me) return NextResponse.json({ applications: [], saved: [] });

  const rows = await db
    .select({ app: applications, job: jobRequests })
    .from(applications)
    .innerJoin(jobRequests, eq(applications.jobId, jobRequests.id))
    .where(eq(applications.providerId, me.id))
    .orderBy(desc(applications.createdAt));

  const savedRows = await db
    .select({ save: savedJobs, job: jobRequests })
    .from(savedJobs)
    .innerJoin(jobRequests, eq(savedJobs.jobId, jobRequests.id))
    .where(eq(savedJobs.providerId, me.id))
    .orderBy(desc(savedJobs.createdAt));

  const s = await getSettings();
  return NextResponse.json({
    currency: s.currency,
    applications: rows.map((r) => ({
      ...r.app,
      job: {
        ...r.job,
        // Hire Pro contact only after the worker is selected.
        customerPhone:
          r.app.status === "selected" || r.app.status === "completed"
            ? r.job.customerPhone
            : "",
      },
    })),
    saved: savedRows.map((r) => r.job),
  });
}
