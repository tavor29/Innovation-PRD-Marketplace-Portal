// A builder (or a manager) moves an assignment along. "done" marks the PRD
// built, which is where Phase 2 hands the app to the Citizen App Registry.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";

export async function POST(req: Request, ctx: RouteContext<"/api/assignments/[id]">) {
  const { user, error } = await apiUser(["manager", "admin", "dev"]);
  if (error) return error;
  const parsed = z.object({ status: z.enum(["assigned", "in_progress", "done"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  const [a] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, (await ctx.params).id));
  if (!a) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (user.role === "dev" && a.assigneeId !== user.id) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  await db.update(schema.assignments).set({ status: parsed.data.status }).where(eq(schema.assignments.id, a.id));
  await db.update(schema.prds).set({ status: parsed.data.status === "done" ? "built" : "assigned" }).where(eq(schema.prds.id, a.prdId));
  await audit(user.id, "prd", a.prdId, "status_changed", { assignment: parsed.data.status });
  return NextResponse.json({ ok: true });
}
