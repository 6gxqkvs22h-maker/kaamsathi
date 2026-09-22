import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, customers, jobRequests } from "@/db/schema";
import { currentCustomerId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** HIRE PRO DASHBOARD — my jobs + counts. */
export async function GET(req: NextRequest) {
  const customerId = await currentCustomerId(req);
  if (!customerId)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [me] = await db.select().from(customers).where(eq(customers.id, customerId));
  const jobs = await db
    .select()
    .from(jobRequests)
    .where(eq(jobRequests.customerId, customerId))
    .orderBy(desc(jobRequests.createdAt));

  const jobIds = new Set(jobs.map((j) => j.id));
  const allApps = jobIds.size
    ? await db.select().from(applications)
    : [];
  const mine = allApps.filter((a) => jobIds.has(a.jobId));

  const countFor = (jobId: number) => mine.filter((a) => a.jobId === jobId);

  const s = await getSettings();
  return NextResponse.json({
    currency: s.currency,
    name: me?.name ?? "",
    stats: {
      activeJobs: jobs.filter((j) => j.status === "open").length,
      applications: mine.length,
      selected: mine.filter((a) => a.status === "selected").length,
      completed: jobs.filter((j) => j.status === "completed").length,
    },
    jobs: jobs.map((j) => {
      const apps = countFor(j.id);
      return {
        ...j,
        applicationCount: apps.length,
        shortlistedCount: apps.filter((a) => a.status === "shortlisted").length,
        selectedCount: apps.filter((a) => a.status === "selected").length,
        newCount: apps.filter((a) => a.status === "applied").length,
      };
    }),
  });
}
