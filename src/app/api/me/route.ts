import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, providers } from "@/db/schema";
import { currentCustomerId, currentWorkerId } from "@/lib/auth";
import { workerCompletion } from "@/lib/marketplace";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Unified session endpoint: returns the single account plus BOTH profiles and
 * the active mode, so the UI never has to guess who is signed in.
 */
export async function GET(req: NextRequest) {
  const customerId = await currentCustomerId(req);
  const workerId = await currentWorkerId(req);

  let account = null;
  if (customerId) {
    const [c] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (c) account = c;
  }

  // Worker profile: either linked to the account, or a direct worker session.
  let workerProfile = null;
  if (account) {
    const owned = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, account.id));
    workerProfile = owned[0] ?? null;
  }
  if (!workerProfile && workerId) {
    const [w] = await db.select().from(providers).where(eq(providers.id, workerId));
    workerProfile = w ?? null;
  }

  if (!account && !workerProfile) {
    return NextResponse.json({ signedIn: false });
  }

  const completion = workerProfile ? workerCompletion(workerProfile) : null;

  return NextResponse.json({
    signedIn: true,
    activeMode: account?.activeMode ?? (workerProfile ? "worker" : "hire"),
    account: account
      ? {
          id: account.id,
          name: account.name,
          username: account.username,
          phone: account.phone,
          email: account.email,
          area: account.area,
          avatar: account.avatar,
          businessName: account.businessName,
          businessDesc: account.businessDesc,
          serviceArea: account.serviceArea,
          verified: account.verified,
        }
      : null,
    worker: workerProfile
      ? {
          ...workerProfile,
          // never leak the worker's own contact to other viewers via this route
          completion: completion?.pct ?? 0,
          canApply: completion?.canApply ?? false,
          missing: completion?.missing ?? [],
        }
      : null,
    hasWorkerProfile: Boolean(workerProfile),
  });
}

/** Switch active mode: { mode: "hire" | "worker" } */
export async function POST(req: NextRequest) {
  const customerId = await currentCustomerId(req);
  if (!customerId)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "worker" ? "worker" : "hire";

  const [updated] = await db
    .update(customers)
    .set({ activeMode: mode })
    .where(eq(customers.id, customerId))
    .returning();

  const owned = await db
    .select()
    .from(providers)
    .where(eq(providers.userId, customerId));
  const workerProfile = owned[0] ?? null;

  return NextResponse.json({
    activeMode: updated.activeMode,
    hasWorkerProfile: Boolean(workerProfile),
    needsWorkerSetup: mode === "worker" && !workerProfile,
    completion: workerProfile ? workerCompletion(workerProfile).pct : 0,
  });
}
