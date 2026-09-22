import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, providers } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { getSettings } from "@/lib/settings";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  WORKER_COOKIE,
  cookieOptions,
  hashPassword,
  isValidAdminPasscode,
  makeToken,
  normalizePhone,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * ONE login endpoint for everybody.
 *
 * Send `{ identifier, password? }`:
 *   • admin passcode      → admin session   (no password needed)
 *   • worker mobile       → worker session  (no password needed)
 *   • customer username   → customer session (password required)
 *   • customer mobile     → customer session (password required)
 *
 * If the identifier belongs to a customer but no password was supplied, the
 * response is 200 with `{ needsPassword: true }` so the UI can reveal the
 * password box instead of showing a scary error.
 */
export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const raw = String(
    body.identifier ?? body.phone ?? body.username ?? body.passcode ?? "",
  ).trim();
  const password = String(body.password ?? "");

  if (!raw) {
    return NextResponse.json(
      { error: "Type your mobile number, username or admin passcode." },
      { status: 400 },
    );
  }

  const settings = await getSettings();

  /* ------------------------------ 1) ADMIN ------------------------------ */
  if (isValidAdminPasscode(raw, settings.adminPassword)) {
    const token = makeToken("admin");
    const res = NextResponse.json({
      role: "admin",
      token,
      redirect: "/admin",
    });
    res.cookies.set(ADMIN_COOKIE, token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  /* ------------------------------ 2) WORKER ----------------------------- */
  const phone = normalizePhone(raw);
  if (phone.length >= 7) {
    const allPros = await db.select().from(providers);
    const worker = allPros.find(
      (p) => normalizePhone(p.phone) === phone && p.status === "approved",
    );
    if (worker) {
      const token = makeToken(String(worker.id));
      const res = NextResponse.json({
        role: "worker",
        token,
        redirect: "/worker",
        provider: {
          id: worker.id,
          name: worker.name,
          trade: worker.trade,
          area: worker.area,
          avatar: worker.avatar,
        },
      });
      res.cookies.set(WORKER_COOKIE, token, cookieOptions);
      return res;
    }
  }

  /* ----------------------------- 3) CUSTOMER ---------------------------- */
  const candidate = raw.toLowerCase();
  const allCustomers = await db.select().from(customers);
  const customer =
    allCustomers.find((c) => c.username.toLowerCase() === candidate) ??
    allCustomers.find(
      (c) => phone.length >= 7 && normalizePhone(c.phone) === phone,
    ) ??
    null;

  if (customer) {
    // Found the account but the password box hasn't been filled in yet.
    if (!password) {
      return NextResponse.json({
        needsPassword: true,
        role: "customer",
        name: customer.name,
        message: `Welcome back, ${customer.name.split(" ")[0]} — type your password to continue.`,
      });
    }
    if (customer.password !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Wrong password. Please try again." },
        { status: 401 },
      );
    }
    const token = makeToken(`cust:${customer.id}`);
    const res = NextResponse.json({
      role: "customer",
      token,
      redirect: "/",
      customer: {
        id: customer.id,
        name: customer.name,
        username: customer.username,
        phone: customer.phone,
        area: customer.area,
        avatar: customer.avatar,
      },
    });
    res.cookies.set(CUSTOMER_COOKIE, token, cookieOptions);
    return res;
  }

  /* ------------------------------ NO MATCH ------------------------------ */
  return NextResponse.json(
    {
      error:
        "No account found. Check your mobile / username, or create a new account below.",
      needsRegister: true,
    },
    { status: 404 },
  );
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  res.cookies.set(WORKER_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  res.cookies.set(CUSTOMER_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
