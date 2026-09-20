import { db } from "@/db";
import { bids, customers, jobRequests, providers, reviews, transactions } from "@/db/schema";
import { hashPassword } from "./auth";
import { sql, eq } from "drizzle-orm";
import { KTM_AREAS, TRADES } from "./trades";

const FIRST = [
  "Bishal","Sujata","Ramesh","Anjali","Kiran","Deepak","Sunita","Prakash","Manisha","Nabin",
  "Sarita","Rabin","Gita","Bikash","Puja","Sagar","Laxmi","Hari","Sabina","Dipesh",
  "Kamala","Nirajan","Asmita","Roshan","Bimala","Umesh","Sneha","Padam","Rita","Yubraj",
];
const LAST = ["Shrestha","Tamang","Gurung","Maharjan","Karki","Thapa","Rai","Shakya","Adhikari","Bhattarai"];
const AVATARS = ["👨‍🔧","👩‍🔧","🧑‍🔧","👨‍🌾","👩‍🎨","🧑‍🏭","👨‍🏭","👩‍🌾"];
const COMMENTS = [
  "Kaam ramro bhayo, time ma aayeko. Very satisfied.",
  "Fixed the leakage quickly at a fair price.",
  "Polite and skilled, cleaned up after the work.",
  "Came a bit late but the work quality was excellent.",
  "Honest pricing, no hidden charges. Will call again.",
  "Knows the job well, brought his own tools.",
];

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function ensureSeed() {
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(providers);
  const [{ ktm }] = await db
    .select({
      ktm: sql<number>`count(*) filter (where lat between 27 and 28.6 and lng between 84 and 86)::int`,
    })
    .from(providers);

  // 1) Always keep demo accounts (customer / worker / admin) fresh.
  await seedDemoAccounts();

  // 2) Reset Kathmandu-only seed data the very first time we run on this DB.
  if (c > 0 && ktm === c) return;
  if (c > 0) {
    await db.delete(bids);
    await db.delete(reviews);
    await db.delete(jobRequests);
    await db.delete(providers);
    await db.delete(customers);
    await db.delete(transactions);
  }

  const r = rnd(7);
  const rows: (typeof providers.$inferInsert)[] = [];
  for (let i = 0; i < 90; i++) {
    const trade = TRADES[i % TRADES.length];
    const area = KTM_AREAS[Math.floor(r() * KTM_AREAS.length)];
    const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    const rating = Math.round((3.7 + r() * 1.3) * 10) / 10;
    const years = 1 + Math.floor(r() * 18);
    const skills = [...trade.skills]
      .sort(() => r() - 0.5)
      .slice(0, 2 + Math.floor(r() * 3));
    const areas = [area.name];
    if (r() > 0.5) areas.push(KTM_AREAS[Math.floor(r() * KTM_AREAS.length)].name);
    rows.push({
      name,
      trade: trade.key,
      skills: skills.join("|"),
      bio: `${trade.label} based in ${area.name} with ${years} years of hands-on work across Kathmandu Valley. Own tools, same-day service.`,
      phone: `+977 98${Math.floor(10000000 + r() * 89999999)}`,
      whatsapp: `+977 98${Math.floor(10000000 + r() * 89999999)}`,
      avatar: AVATARS[Math.floor(r() * AVATARS.length)],
      lat: area.lat + (r() - 0.5) * 0.012,
      lng: area.lng + (r() - 0.5) * 0.012,
      area: area.name,
      serviceAreas: Array.from(new Set(areas)).join(", "),
      languages: r() > 0.4 ? "Nepali, English" : "Nepali, Hindi",
      rating,
      ratingCount: 5 + Math.floor(r() * 320),
      jobsDone: 8 + Math.floor(r() * 700),
      baseRate: Math.round((trade.defaultRate * (0.8 + r() * 0.6)) / 50) * 50,
      priceUnit: r() > 0.75 ? "hour" : "visit",
      experienceYears: years,
      online: r() > 0.28,
      etaMins: 10 + Math.floor(r() * 50),
      verified: r() > 0.35,
      featured: r() > 0.88,
      status: r() > 0.94 ? "pending" : "approved",
      walletBalance: 200 + Math.floor(r() * 20) * 50,
    });
  }
  const inserted = await db
    .insert(providers)
    .values(rows)
    .returning({ id: providers.id });

  const reviewRows: (typeof reviews.$inferInsert)[] = [];
  for (const p of inserted) {
    const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      reviewRows.push({
        providerId: p.id,
        stars: 3 + Math.floor(r() * 3),
        comment: COMMENTS[Math.floor(r() * COMMENTS.length)],
        author: FIRST[Math.floor(r() * FIRST.length)],
      });
    }
  }
  await db.insert(reviews).values(reviewRows);
}

/**
 * Ensure the demo accounts (customer / worker / admin passcode) exist.
 * Idempotent: safe to run on every ensureSeed() call.
 */
async function seedDemoAccounts() {
  const thamel = KTM_AREAS.find((a) => a.name === "Thamel")!;
  const demoWorkerPhone = "9800000001";

  // Look up the demo worker by normalised phone so we survive prior schema.
  const allPros = await db.select().from(providers);
  let demoWorker = allPros.find(
    (p) => p.phone.replace(/\D/g, "").endsWith(demoWorkerPhone),
  );
  if (!demoWorker) {
    const [created] = await db
      .insert(providers)
      .values({
        name: "Demo Worker",
        trade: "plumber",
        phone: `+977 ${demoWorkerPhone}`,
        whatsapp: `+977 ${demoWorkerPhone}`,
        avatar: "🛠️",
        skills: ["Tap & pipe leakage", "Water tank & pump", "Geyser / water heater"].join("|"),
        bio: "Demo plumber account — same mobile (9800000001) every fresh install.",
        lat: thamel.lat + 0.004,
        lng: thamel.lng + 0.004,
        area: "Thamel",
        serviceAreas: "Thamel, Lazimpat",
        languages: "Nepali, English",
        baseRate: 700,
        priceUnit: "visit",
        experienceYears: 5,
        online: true,
        etaMins: 15,
        verified: true,
        featured: true,
        status: "approved",
        walletBalance: 500,
      })
      .returning();
    demoWorker = created;
    await db.insert(transactions).values({
      providerId: demoWorker.id,
      type: "topup",
      amount: 500,
      method: "system",
      note: "Demo wallet credit",
      status: "approved",
      balanceAfter: 500,
    });
  }

  const existingCustomer = await db
    .select()
    .from(customers)
    .where(eq(customers.username, "customer"));
  if (!existingCustomer.length) {
    await db.insert(customers).values({
      name: "Demo Customer",
      username: "customer",
      password: hashPassword("customer123"),
      phone: "9800000000",
      avatar: "🙋",
      lat: thamel.lat,
      lng: thamel.lng,
      area: "Thamel",
    });
  }
}
