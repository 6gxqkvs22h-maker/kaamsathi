import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRADES } from "./trades";

export type AppSettings = typeof settings.$inferSelect;

export function defaultTradeRates(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of TRADES) out[t.key] = t.defaultRate;
  return out;
}

export function defaultSocialLinks(): Record<string, string> {
  return {
    facebook: "https://facebook.com/kaamsathinpl",
    instagram: "https://instagram.com/kaamsathi.np",
    tiktok: "https://tiktok.com/@kaamsathi",
    whatsapp: "https://wa.me/9779801234567",
    youtube: "https://youtube.com/@kaamsathi",
    twitter: "https://x.com/kaamsathinpl",
    website: "https://kaamsathi.com",
    supportPhone: "+977 9801234567",
    supportEmail: "support@kaamsathi.com",
  };
}

export function defaultEmergencyHotlines(): Record<string, string> {
  return {
    police: "100",
    ambulance: "102",
    traffic: "103",
    fire: "101",
    womenHelp: "1145",
    childHelp: "1098",
  };
}

export async function getSettings(): Promise<AppSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) {
    let needsUpdate = false;
    const patch: Partial<AppSettings> = {};

    if (!row.tradeRates || Object.keys(row.tradeRates).length === 0) {
      patch.tradeRates = defaultTradeRates();
      needsUpdate = true;
    }
    if (!row.apiKeys || typeof row.apiKeys !== "object") {
      patch.apiKeys = {};
      needsUpdate = true;
    }
    if (!row.socialLinks || typeof row.socialLinks !== "object" || Object.keys(row.socialLinks).length === 0) {
      patch.socialLinks = defaultSocialLinks();
      needsUpdate = true;
    }
    if (!row.emergencyHotlines || typeof row.emergencyHotlines !== "object" || Object.keys(row.emergencyHotlines).length === 0) {
      patch.emergencyHotlines = defaultEmergencyHotlines();
      needsUpdate = true;
    }
    if (!row.adminPassword) {
      patch.adminPassword = "admin123";
      needsUpdate = true;
    }

    if (needsUpdate) {
      const [updated] = await db
        .update(settings)
        .set(patch)
        .where(eq(settings.id, 1))
        .returning();
      return updated ?? { ...row, ...patch };
    }
    return row;
  }
  const [created] = await db
    .insert(settings)
    .values({
      id: 1,
      tradeRates: defaultTradeRates(),
      apiKeys: {},
      socialLinks: defaultSocialLinks(),
      emergencyHotlines: defaultEmergencyHotlines(),
      adminPassword: "admin123",
      appName: "KaamSathi",
      appTagline: "Kathmandu Instant Services",
    })
    .returning();
  return created;
}

export async function updateSettings(patch: Partial<AppSettings>) {
  await getSettings();
  const [updated] = await db
    .update(settings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(settings.id, 1))
    .returning();
  return updated;
}
