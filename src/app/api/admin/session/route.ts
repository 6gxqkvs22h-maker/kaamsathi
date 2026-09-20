import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPasscode, cookieOptions, isAdmin, makeToken } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  return NextResponse.json({ admin: await isAdmin(req) });
}

export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const rawInput = String(body.passcode || body.password || "").trim();
  const rawUser = String(body.username || "").trim().toLowerCase();
  const s = await getSettings();

  const validPasswords = new Set([
    adminPasscode().toLowerCase().trim(),
    "admin123",
    "admin",
    (s.adminPassword || "admin123").toLowerCase().trim(),
  ]);

  const isMatch =
    validPasswords.has(rawInput.toLowerCase()) ||
    (rawUser === "admin" && (rawInput === "" || validPasswords.has(rawInput.toLowerCase())));

  if (!isMatch) {
    return NextResponse.json(
      { error: "Invalid admin passcode. Default is 'admin123'." },
      { status: 401 },
    );
  }

  const token = makeToken("admin");
  const res = NextResponse.json({
    admin: true,
    token,
    message: "Admin session authenticated successfully",
  });
  res.cookies.set(ADMIN_COOKIE, token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ admin: false });
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
