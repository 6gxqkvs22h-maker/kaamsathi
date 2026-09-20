import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { WORKER_COOKIE, cookieOptions, makeToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").replace(/\s/g, "");
  if (!phone)
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });

  const all = await db.select().from(providers);
  const match = all.find((p) => p.phone.replace(/\s/g, "") === phone);
  if (!match)
    return NextResponse.json(
      { error: "No worker profile with that phone. Please register first." },
      { status: 404 },
    );

  const token = makeToken(String(match.id));
  const res = NextResponse.json({ provider: match, token });
  res.cookies.set(WORKER_COOKIE, token, cookieOptions);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WORKER_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
