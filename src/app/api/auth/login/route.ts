import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { getSettings } from "@/lib/settings";
import {
  ADMIN_COOKIE,
  WORKER_COOKIE,
  cookieOptions,
  isValidAdminPasscode,
  makeToken,
  normalizePhone,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * ONE login for everybody.
 * Type your mobile number → you get a worker session.
 * Type the admin passcode → you get an admin session.
 * The app figures out which one you are, so nobody has to pick a role.
 */
export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const raw = String(body.identifier ?? body.phone ?? body.passcode ?? "").trim();

  if (!raw) {
    return NextResponse.json(
      { error: "Enter your mobile number to continue." },
      { status: 400 },
    );
  }

  const settings = await getSettings();

  // 1) Admin passcode — anything that matches env/DB password is admin.
  if (isValidAdminPasscode(raw, settings.adminPassword)) {
    const token = makeToken("admin");
    const res = NextResponse.json({ role: "admin", token });
    res.cookies.set(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
    return res;
  }

  // 2) Worker login by mobile number.
  const looksLikePhone = /^[\d+\s-]{7,}$/.test(raw);
  if (looksLikePhone) {
    const phone = normalizePhone(raw);
    if (phone.length >= 7) {
      const all = await db.select().from(providers);
      const match = all.find(
        (p) => normalizePhone(p.phone) === phone && p.status === "approved",
      );
      if (match) {
        const token = makeToken(String(match.id));
        const res = NextResponse.json({
          role: "worker",
          token,
          provider: {
            id: match.id,
            name: match.name,
            trade: match.trade,
            area: match.area,
            avatar: match.avatar,
          },
        });
        res.cookies.set(WORKER_COOKIE, token, cookieOptions);
        return res;
      }
    }
  }

  // 3) Customer login by username (or mobile if registered with one).
  //    The username comes from `body.username` and the password from
  //    `body.password` — falling back to legacy single-field usage.
  const { customers } = await import("@/db/schema");
  const { hashPassword } = await import("@/lib/auth");
  const { eq } = await import("drizzle-orm");

  const usernameInput = String(body.username ?? "").toLowerCase().trim();
  const passwordInput = String(body.password ?? "");
  const candidate = usernameInput || raw.toLowerCase().trim();
  const candidatePassword = passwordInput || raw;

  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.username, candidate));
  type Cust = typeof rows[number];
  let found: Cust | null = rows[0] ?? null;
  if (!found) {
    const phone = normalizePhone(raw);
    const allCustomers = await db.select().from(customers);
    const match = allCustomers.find(
      (c) => normalizePhone(c.phone) === phone,
    );
    found = (match as Cust | undefined) ?? null;
  }
  const passwordMatches = found
    ? found.password === hashPassword(candidatePassword)
    : false;
  if (!found || !passwordMatches) {
    return NextResponse.json(
      {
        error:
          "We couldn't match those credentials to customer, worker or admin.",
      },
      { status: 404 },
    );
  }

  const token = makeToken(`cust:${found.id}`);
  const res = NextResponse.json({
    role: "customer",
    token,
    customer: {
      id: found.id,
      name: found.name,
      username: found.username,
      phone: found.phone,
      area: found.area,
      avatar: found.avatar,
    },
  });
  res.cookies.set("fixnear_customer", token, cookieOptions);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  res.cookies.set(WORKER_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
