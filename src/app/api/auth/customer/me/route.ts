import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { currentCustomerId, normalizePhone } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = await currentCustomerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    customer: {
      id: c.id,
      name: c.name,
      username: c.username,
      phone: c.phone,
      area: c.area,
      avatar: c.avatar,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const id = await currentCustomerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const [current] = await db.select().from(customers).where(eq(customers.id, id));
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Partial<typeof customers.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim())
    patch.name = body.name.trim().slice(0, 60);
  if (typeof body.phone === "string") patch.phone = normalizePhone(body.phone);

  const [updated] = await db
    .update(customers)
    .set(patch)
    .where(eq(customers.id, id))
    .returning();
  return NextResponse.json({
    customer: {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      phone: updated.phone,
      area: updated.area,
      avatar: updated.avatar,
    },
  });
}
