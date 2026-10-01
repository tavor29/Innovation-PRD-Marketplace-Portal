// FR-13: assign an approved PRD to a vibe-coder or developer, with an
// optional due date.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { bad, loadPrdFor } from "@/lib/prd/access";
import { audit } from "@/lib/audit";

const body = z.object({
  assigneeId: z.string().uuid(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  priority: z.number().int().min(0).max(100).nullable().optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/prds/[id]/assign">) {
  const { user, error } = await apiUser(["manager", "admin"]);
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("בקשה לא תקינה");
  if (r.prd.status !== "approved") return bad("אפשר להקצות רק PRD מאושר");

  const [dev] = await db.select().from(schema.users).where(eq(schema.users.id, parsed.data.assigneeId));
  if (!dev || dev.role !== "dev" || !dev.isActive) return bad("המשתמש/ת לא מוגדר/ת כבונה");

  await db.insert(schema.assignments).values({ prdId: r.prd.id, assigneeId: dev.id, assignedBy: user.id, dueDate: parsed.data.dueDate ?? null });
  await db
    .update(schema.prds)
    .set({ status: "assigned", ...(parsed.data.priority != null ? { priorityScore: parsed.data.priority } : {}) })
    .where(eq(schema.prds.id, r.prd.id));
  await audit(user.id, "prd", r.prd.id, "assigned", { to: dev.fullName, dueDate: parsed.data.dueDate ?? null });
  return NextResponse.json({ ok: true });
}
