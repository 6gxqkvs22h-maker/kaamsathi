import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { hashPassword, makeToken, normalizePhone } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "login");
  const name = String(body.name ?? "").trim().slice(0, 60);
  const username = String(body.username ?? "").trim().toLowerCase().slice(0, 40);
  const password = String(body.password ?? "");
  const phone = normalizePhone(String(body.phone ?? ""));

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  if (action === "register") {
    if (!name) {
      return NextResponse.json({ error: "Please tell us your name." }, { status: 400 });
    }
    const existing = await db.select().from(customers).where(eq(customers.username, username));
    if (existing.length) {
      return NextResponse.json(
        { error: "That username is taken — try another or log in." },
        { status: 409 },
      );
    }
    const [created] = await db
      .insert(customers)
      .values({
        name,
        username,
        password: hashPassword(password),
        phone,
        avatar: "🙋",
      })
      .returning();
    const token = makeToken(`cust:${created.id}`);
    return NextResponse.json({
      role: "customer",
      token,
      customer: {
        id: created.id,
        name: created.name,
        username: created.username,
        phone: created.phone,
        area: created.area,
        avatar: created.avatar,
      },
    });
  }

  // Login
  const [match] = await db
    .select()
    .from(customers)
    .where(eq(customers.username, username));
  if (!match || match.password !== hashPassword(password)) {
    return NextResponse.json(
      { error: "Username or password is wrong." },
      { status: 401 },
    );
  }
  const token = makeToken(`cust:${match.id}`);
  return NextResponse.json({
    role: "customer",
    token,
    customer: {
      id: match.id,
      name: match.name,
      username: match.username,
      phone: match.phone,
      area: match.area,
      avatar: match.avatar,
    },
  });
}
