import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { currentCustomerId, hashPassword, normalizePhone } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const shape = (c: typeof customers.$inferSelect) => ({
  id: c.id,
  name: c.name,
  username: c.username,
  phone: c.phone,
  email: c.email,
  area: c.area,
  avatar: c.avatar,
  businessName: c.businessName,
  businessDesc: c.businessDesc,
  serviceArea: c.serviceArea,
  verified: c.verified,
  activeMode: c.activeMode,
});

export async function GET(req: NextRequest) {
  const id = await currentCustomerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ customer: shape(c) });
}

/** Edit my own customer profile (name, phone, area, avatar, password). */
export async function PATCH(req: NextRequest) {
  const id = await currentCustomerId(req);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [existing] = await db.select().from(customers).where(eq(customers.id, id));
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Partial<typeof customers.$inferInsert> = {};

  if (typeof body.name === "string" && body.name.trim())
    patch.name = body.name.trim().slice(0, 60);
  if (typeof body.phone === "string")
    patch.phone = normalizePhone(body.phone).slice(0, 25);
  if (typeof body.area === "string") patch.area = body.area.slice(0, 60);
  if (typeof body.avatar === "string" && body.avatar.trim())
    patch.avatar = body.avatar.slice(0, 8);
  if (typeof body.email === "string") patch.email = body.email.trim().slice(0, 80);
  if (typeof body.businessName === "string")
    patch.businessName = body.businessName.slice(0, 120);
  if (typeof body.businessDesc === "string")
    patch.businessDesc = body.businessDesc.slice(0, 600);
  if (typeof body.serviceArea === "string")
    patch.serviceArea = body.serviceArea.slice(0, 200);

  // Optional password change — requires the current password.
  if (typeof body.newPassword === "string" && body.newPassword) {
    if (existing.password !== hashPassword(String(body.currentPassword ?? ""))) {
      return NextResponse.json(
        { error: "Current password is wrong." },
        { status: 403 },
      );
    }
    if (String(body.newPassword).length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters." },
        { status: 400 },
      );
    }
    patch.password = hashPassword(String(body.newPassword));
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ customer: shape(existing) });
  }

  const [updated] = await db
    .update(customers)
    .set(patch)
    .where(eq(customers.id, id))
    .returning();

  return NextResponse.json({ customer: shape(updated), saved: true });
}
