import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    settings: {
      city: s.city,
      currency: s.currency,
      commissionPct: s.commissionPct,
      serviceFee: s.serviceFee,
      minOffer: s.minOffer,
      maxOffer: s.maxOffer,
      maxRadiusKm: s.maxRadiusKm,
      defaultRadiusKm: s.defaultRadiusKm,
      surgeMultiplier: s.surgeMultiplier,
      commissionEnabled: s.commissionEnabled,
      requireWorkerApproval: s.requireWorkerApproval,
      autoBidEnabled: s.autoBidEnabled,
      autoBidCount: s.autoBidCount,
      minRatingToBid: s.minRatingToBid,
      tradeRates: s.tradeRates,
      disabledTrades: s.disabledTrades,
      announcement: s.announcement,
      appName: s.appName,
      appTagline: s.appTagline,
      socialLinks: s.socialLinks,
      emergencyHotlines: s.emergencyHotlines,
    },
  });
}
