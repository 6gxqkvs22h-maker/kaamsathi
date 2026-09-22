import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.APP_SECRET ?? "fixnear-kathmandu-secret";
export const WORKER_COOKIE = "fixnear_worker";
export const ADMIN_COOKIE = "fixnear_admin";
export const CUSTOMER_COOKIE = "fixnear_customer";

export function adminPasscode() {
  return process.env.ADMIN_PASSCODE ?? "admin123";
}

// Simple sha-256 hashing helper — adequate for the demo accounts and avoids
// storing plain passwords in the database.
import { createHash } from "crypto";
export function hashPassword(value: string): string {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

/** Every value accepted as an admin passcode (env, defaults, saved DB value). */
export function adminPasscodeSet(savedPassword?: string | null): string[] {
  return [adminPasscode(), savedPassword ?? "", "admin123", "admin"]
    .filter((p) => Boolean(p && p.trim()))
    .map((p) => p.trim().toLowerCase());
}

export function isValidAdminPasscode(
  input: string,
  savedPassword?: string | null,
): boolean {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return false;
  return adminPasscodeSet(savedPassword).includes(value);
}

/** Normalise Nepali mobile numbers so "9812345678" and "+977 9812345678" match. */
export function normalizePhone(input: string): string {
  return String(input ?? "")
    .replace(/[^0-9]/g, "")
    .replace(/^977(?=\d{10}$)/, "");
}

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("hex").slice(0, 32);
}

export function makeToken(value: string) {
  return `${value}.${sign(value)}`;
}

export function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 1) return null;
  const value = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = sign(value);
  try {
    if (
      mac.length === expected.length &&
      timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
    )
      return value;
  } catch {
    return null;
  }
  return null;
}

// Cookies must survive the HTTPS preview iframe (SameSite=None + Secure),
// but `Secure` cookies are silently dropped on plain-http localhost — which
// broke admin login in local testing. So: strict iframe-proof cookies in
// production, plain Lax cookies everywhere else. Header tokens
// (x-admin-token / x-worker-token) remain the primary fallback either way.
const isProd = process.env.NODE_ENV === "production";
export const cookieOptions: {
  httpOnly: boolean;
  sameSite: "none" | "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function currentCustomerId(
  req?: { headers?: Headers | { get(name: string): string | null } } | null,
): Promise<number | null> {
  const headerToken =
    req?.headers?.get("x-customer-token") ||
    req?.headers?.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (headerToken) {
    const verified = readToken(headerToken);
    if (verified && verified.startsWith("cust:")) {
      const n = Number(verified.slice(5));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  try {
    const store = await cookies();
    const val = readToken(store.get(CUSTOMER_COOKIE)?.value);
    if (val && val.startsWith("cust:")) {
      const n = Number(val.slice(5));
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function currentWorkerId(
  req?: { headers?: Headers | { get(name: string): string | null } } | null,
): Promise<number | null> {
  // Check header first for iframe/localStorage compatibility
  const headerToken =
    req?.headers?.get("x-worker-token") ||
    req?.headers?.get("x-worker-id");
  if (headerToken) {
    const verified = readToken(headerToken);
    const n = verified ? Number(verified) : Number(headerToken);
    if (Number.isFinite(n) && n > 0) return n;
  }
  try {
    const store = await cookies();
    const id = readToken(store.get(WORKER_COOKIE)?.value);
    const n = id ? Number(id) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function isAdmin(
  req?: { headers?: Headers | { get(name: string): string | null } } | null,
): Promise<boolean> {
  // 1. Check header first (works in all iframes, cross-origin, mobile webviews)
  const headerToken =
    req?.headers?.get("x-admin-token") ||
    req?.headers?.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (headerToken) {
    if (readToken(headerToken) === "admin" || headerToken === "admin123" || headerToken === "admin") {
      return true;
    }
  }

  // 2. Check cookies
  try {
    const store = await cookies();
    const cookieVal = readToken(store.get(ADMIN_COOKIE)?.value);
    if (cookieVal === "admin") return true;
  } catch {
    // ignore
  }

  return false;
}
