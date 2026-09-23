import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, providers } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  WORKER_COOKIE,
  cookieOptions,
  hashPassword,
  makeToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function fail(req: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/login?g_error=${encodeURIComponent(message)}`, req.url),
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return fail(req, "Google sign-in was cancelled.");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail(req, "Google sign-in isn't configured yet.");
  }

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    return fail(req, "Could not verify your Google account. Please try again.");
  }

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  );
  const profile = await profileRes.json().catch(() => ({}));
  const email = String(profile.email ?? "").toLowerCase().trim();
  const name = String(profile.name ?? "").trim() || "Google User";
  if (!email) return fail(req, "Google didn't share an email address.");

  // Designated admin email logs straight into Admin — no passcode needed.
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  if (adminEmail && email === adminEmail) {
    const token = makeToken("admin");
    const res = NextResponse.redirect(
      new URL(`/login?g_role=admin&g_token=${encodeURIComponent(token)}`, req.url),
    );
    res.cookies.set(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
    return res;
  }

  const [worker] = await db
    .select()
    .from(providers)
    .where(eq(providers.email, email));
  if (worker) {
    const token = makeToken(String(worker.id));
    const res = NextResponse.redirect(
      new URL(`/login?g_role=worker&g_token=${encodeURIComponent(token)}`, req.url),
    );
    res.cookies.set(WORKER_COOKIE, token, cookieOptions);
    return res;
  }

  let [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, email));

  if (!customer) {
    const base = email.split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 20) || "user";
    let username = base;
    let attempt = 0;
    while (
      (await db.select().from(customers).where(eq(customers.username, username))).length > 0
    ) {
      attempt += 1;
      username = `${base}${attempt}`;
    }
    const randomPassword = hashPassword(
      `google-${email}-${Date.now()}-${Math.random()}`,
    );
    const [created] = await db
      .insert(customers)
      .values({
        name,
        username,
        password: randomPassword,
        phone: "",
        area: "",
        avatar: "🙋",
        email,
        authProvider: "google",
      })
      .returning();
    customer = created;
  }

  const token = makeToken(`cust:${customer.id}`);
  const res = NextResponse.redirect(
    new URL(`/login?g_role=customer&g_token=${encodeURIComponent(token)}`, req.url),
  );
  res.cookies.set(CUSTOMER_COOKIE, token, cookieOptions);
  return res;
}
