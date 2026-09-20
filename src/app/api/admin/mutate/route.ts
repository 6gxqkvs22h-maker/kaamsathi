import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bids, jobRequests, providers, reviews, transactions } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { updateSettings, getSettings } from "@/lib/settings";
import { KTM_AREAS, tradeByKey } from "@/lib/trades";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Body = {
  entity: "worker" | "request" | "review" | "bid" | "settings" | "transaction";
  action: "create" | "update" | "delete" | "approve" | "reject";
  id?: number;
  patch?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;
  const patch = body.patch ?? {};

  if (body.entity === "settings") {
    const allowed: Record<string, unknown> = {};
    for (const k of [
      "city","currency","commissionPct","serviceFee","minOffer","maxOffer",
      "maxRadiusKm","defaultRadiusKm","surgeMultiplier","commissionEnabled",
      "requireWorkerApproval","autoBidEnabled","autoBidCount","minRatingToBid",
      "disabledTrades","announcement","tradeRates","apiKeys",
      "socialLinks","emergencyHotlines","adminPassword","appName","appTagline",
      "leadFee","minTopup","walletRequired",
    ]) {
      if (k in patch) allowed[k] = patch[k];
    }
    const updated = await updateSettings(allowed);
    return NextResponse.json({ settings: updated });
  }

  if (body.entity === "transaction") {
    const id = Number(body.id);

    // Admin manual wallet adjustment (credit or debit any worker instantly)
    if (body.action === "create") {
      const providerId = Number(patch.providerId);
      const amount = Math.round(Number(patch.amount) || 0);
      const [worker] = await db.select().from(providers).where(eq(providers.id, providerId));
      if (!worker || !amount)
        return NextResponse.json({ error: "Worker and non-zero amount required" }, { status: 400 });
      const newBalance = Math.max(0, worker.walletBalance + amount);
      await db.update(providers).set({ walletBalance: newBalance }).where(eq(providers.id, providerId));
      const [tx] = await db
        .insert(transactions)
        .values({
          providerId,
          type: "admin_adjust",
          amount,
          method: "system",
          note: String(patch.note ?? "Manual balance adjustment by admin"),
          status: "approved",
          balanceAfter: newBalance,
        })
        .returning();
      return NextResponse.json({ transaction: tx });
    }

    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    if (body.action === "delete") {
      await db.delete(transactions).where(eq(transactions.id, id));
      return NextResponse.json({ ok: true });
    }

    // Approve a pending top-up: credit the worker wallet
    if (body.action === "approve") {
      if (tx.status !== "pending")
        return NextResponse.json({ error: "Already processed" }, { status: 409 });
      const [worker] = await db.select().from(providers).where(eq(providers.id, tx.providerId));
      if (!worker) return NextResponse.json({ error: "Worker missing" }, { status: 404 });
      const newBalance = worker.walletBalance + tx.amount;
      await db.update(providers).set({ walletBalance: newBalance }).where(eq(providers.id, worker.id));
      const [updated] = await db
        .update(transactions)
        .set({ status: "approved", balanceAfter: newBalance })
        .where(eq(transactions.id, id))
        .returning();
      return NextResponse.json({ transaction: updated });
    }

    if (body.action === "reject") {
      const [updated] = await db
        .update(transactions)
        .set({ status: "rejected" })
        .where(eq(transactions.id, id))
        .returning();
      return NextResponse.json({ transaction: updated });
    }

    return NextResponse.json({ error: "Unknown transaction action" }, { status: 400 });
  }

  if (body.entity === "worker") {
    if (body.action === "create") {
      const trade = String(patch.trade ?? "helper");
      const areaName = KTM_AREAS.some((a) => a.name === patch.area)
        ? String(patch.area)
        : KTM_AREAS[0].name;
      const area = KTM_AREAS.find((a) => a.name === areaName)!;
      const [created] = await db
        .insert(providers)
        .values({
          name: String(patch.name ?? "New worker").slice(0, 60),
          trade,
          phone: String(patch.phone ?? "").slice(0, 25),
          whatsapp: String(patch.whatsapp ?? patch.phone ?? "").slice(0, 25),
          skills: Array.isArray(patch.skills) ? (patch.skills as string[]).join("|") : String(patch.skills ?? ""),
          bio: String(patch.bio ?? "").slice(0, 600),
          area: areaName,
          serviceAreas: String(patch.serviceAreas ?? areaName).slice(0, 200),
          languages: String(patch.languages ?? "Nepali, English"),
          avatar: String(patch.avatar ?? tradeByKey(trade).emoji).slice(0, 8),
          baseRate: Number(patch.baseRate ?? tradeByKey(trade).defaultRate),
          priceUnit: String(patch.priceUnit ?? "visit"),
          experienceYears: Number(patch.experienceYears ?? 0),
          online: patch.online !== false,
          verified: Boolean(patch.verified),
          featured: Boolean(patch.featured),
          status: String(patch.status ?? "approved"),
          lat: area.lat + (Math.random() - 0.5) * 0.01,
          lng: area.lng + (Math.random() - 0.5) * 0.01,
        })
        .returning();
      return NextResponse.json({ worker: created });
    }
    const id = Number(body.id);
    if (body.action === "delete") {
      await db.delete(bids).where(eq(bids.providerId, id));
      await db.delete(reviews).where(eq(reviews.providerId, id));
      await db.delete(providers).where(eq(providers.id, id));
      return NextResponse.json({ ok: true });
    }
    const clean: Record<string, unknown> = {};
    for (const k of [
      "name","trade","skills","bio","phone","whatsapp","area","serviceAreas",
      "languages","baseRate","priceUnit","experienceYears","online","etaMins",
      "verified","featured","status","rating","jobsDone","avatar","walletBalance",
    ]) {
      if (k in patch) clean[k] = patch[k];
    }
    if (Array.isArray(clean.skills)) clean.skills = (clean.skills as string[]).join("|");
    if (typeof clean.area === "string" && KTM_AREAS.some((a) => a.name === clean.area)) {
      const a = KTM_AREAS.find((x) => x.name === clean.area)!;
      clean.lat = a.lat + (Math.random() - 0.5) * 0.01;
      clean.lng = a.lng + (Math.random() - 0.5) * 0.01;
    }
    const [updated] = await db
      .update(providers)
      .set(clean)
      .where(eq(providers.id, id))
      .returning();
    return NextResponse.json({ worker: updated });
  }

  if (body.entity === "request") {
    const id = Number(body.id);
    if (body.action === "delete") {
      await db.delete(bids).where(eq(bids.requestId, id));
      await db.delete(jobRequests).where(eq(jobRequests.id, id));
      return NextResponse.json({ ok: true });
    }
    const [updated] = await db
      .update(jobRequests)
      .set(patch as Partial<typeof jobRequests.$inferInsert>)
      .where(eq(jobRequests.id, id))
      .returning();
    return NextResponse.json({ request: updated });
  }

  if (body.entity === "review") {
    const id = Number(body.id);
    if (body.action === "delete") {
      await db.delete(reviews).where(eq(reviews.id, id));
      return NextResponse.json({ ok: true });
    }
    const [updated] = await db
      .update(reviews)
      .set(patch as Partial<typeof reviews.$inferInsert>)
      .where(eq(reviews.id, id))
      .returning();
    if (updated) {
      const [p] = await db.select().from(providers).where(eq(providers.id, updated.providerId));
      if (p) {
        const all = await db.select().from(reviews).where(eq(reviews.providerId, p.id));
        const live = all.filter((r) => !r.hidden);
        const avg = live.length
          ? Math.round((live.reduce((s, r) => s + r.stars, 0) / live.length) * 10) / 10
          : 0;
        await db
          .update(providers)
          .set({ rating: avg, ratingCount: live.length })
          .where(eq(providers.id, p.id));
      }
    }
    return NextResponse.json({ review: updated });
  }

  if (body.entity === "bid") {
    const id = Number(body.id);
    if (body.action === "delete") {
      await db.delete(bids).where(eq(bids.id, id));
      return NextResponse.json({ ok: true });
    }
    const [updated] = await db
      .update(bids)
      .set(patch as Partial<typeof bids.$inferInsert>)
      .where(eq(bids.id, id))
      .returning();
    return NextResponse.json({ bid: updated });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ settings: s });
}
