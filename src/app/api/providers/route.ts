import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { DEFAULT_CENTER, distanceKm } from "@/lib/trades";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureSeed();
  const sp = req.nextUrl.searchParams;
  const trade = sp.get("trade") ?? "";
  const q = (sp.get("q") ?? "").toLowerCase();
  const area = sp.get("area") ?? "";
  const lat = Number(sp.get("lat") ?? DEFAULT_CENTER.lat);
  const lng = Number(sp.get("lng") ?? DEFAULT_CENTER.lng);
  const radius = Number(sp.get("radius") ?? 8);
  const onlineOnly = sp.get("online") === "1";
  const minRating = Number(sp.get("minRating") ?? 0);
  const verifiedOnly = sp.get("verified") === "1";
  const sort = sp.get("sort") ?? "distance";

  const all = await db.select().from(providers);
  const list = all
    .filter((p) => p.status === "approved")
    .map((p) => {
      // Strip private contact info from public listings. Only the
      // worker's own dashboard or an accepted job can reveal phone.
      const safe: typeof p = { ...p, phone: "", whatsapp: "" };
      return { ...safe, distanceKm: distanceKm({ lat, lng }, safe) };
    })
    .filter((p) => (trade ? p.trade === trade : true))
    .filter((p) => (area ? p.area === area : true))
    .filter((p) => p.distanceKm <= radius)
    .filter((p) => (onlineOnly ? p.online : true))
    .filter((p) => (verifiedOnly ? p.verified : true))
    .filter((p) => p.rating >= minRating)
    .filter((p) =>
      q
        ? p.name.toLowerCase().includes(q) ||
          p.trade.includes(q) ||
          p.skills.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q)
        : true,
    )
    .sort((a, b) => {
      if (b.featured !== a.featured) return Number(b.featured) - Number(a.featured);
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price") return a.baseRate - b.baseRate;
      if (sort === "experience") return b.experienceYears - a.experienceYears;
      return a.distanceKm - b.distanceKm;
    });

  return NextResponse.json({ providers: list.slice(0, 80) });
}
