import { NextRequest, NextResponse } from "next/server";
import { ensureSeed } from "@/lib/seed";
import { getSettings } from "@/lib/settings";
import {
  ADMIN_COOKIE,
  cookieOptions,
  isValidAdminPasscode,
  makeToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Plain-link admin login. Useful when a browser blocks cookies AND
 * localStorage inside the preview iframe: open this URL and you are in.
 *   /api/admin/login?passcode=admin123
 * The signed token is handed to /admin through the URL, so the session
 * survives the page load even with zero client-side storage.
 */
export async function GET(req: NextRequest) {
  await ensureSeed();
  const sp = req.nextUrl.searchParams;
  const passcode = String(sp.get("passcode") ?? sp.get("p") ?? "").trim();
  const target = sp.get("redirect") || "/admin";

  if (!isValidAdminPasscode(passcode, (await getSettings()).adminPassword)) {
    return NextResponse.json(
      { error: "Invalid admin passcode. Default is 'admin123'." },
      { status: 401 },
    );
  }

  const token = makeToken("admin");
  // Build the origin from forwarded headers so the redirect stays on the
  // public preview domain instead of an internal host.
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  const base = host ? `${proto}://${host}` : req.nextUrl.origin;
  const url = new URL(target.startsWith("/") ? target : "/admin", base);
  url.searchParams.set("t", token);

  const res = NextResponse.redirect(url);
  res.cookies.set(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
  return res;
}
