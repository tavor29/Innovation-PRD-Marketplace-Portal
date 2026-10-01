import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { roles } from "@/lib/auth/roles";
import { audit } from "@/lib/audit";

const body = z.object({
  id: z.string().uuid(),
  role: z.enum(roles).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { user, error } = await apiUser(["admin"]);
  if (error) return error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  const { id, ...patch } = parsed.data;
  // Keep the four demo accounts usable: their roles are what the role switcher signs into.
  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!target) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (/^(submitter|manager|dev|admin)@meridian\.demo$/.test(target.email) && (patch.role || patch.isActive === false)) {
    return NextResponse.json({ error: "אי אפשר לשנות תפקיד של חשבונות הדמו הראשיים" }, { status: 409 });
  }
  await db.update(schema.users).set(patch).where(eq(schema.users.id, id));
  await audit(user.id, "user", id, "updated", patch);
  return NextResponse.json({ ok: true });
}
