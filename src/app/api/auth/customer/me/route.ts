import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { currentCustomerId } from "@/lib/auth";
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
