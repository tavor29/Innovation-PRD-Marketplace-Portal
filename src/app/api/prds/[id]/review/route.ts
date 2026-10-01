// FR-11/12: approve, request a revision, or reject; set priority; and
// decide on individual security flags. Managers and admins only. Every
// decision is audited (NFR-04).
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { bad, loadPrdFor } from "@/lib/prd/access";
import { audit } from "@/lib/audit";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), comment: z.string().max(2000).optional(), priority: z.number().int().min(0).max(100).nullable().optional() }),
  z.object({ action: z.literal("revise"), comment: z.string().trim().min(2).max(2000) }),
  z.object({ action: z.literal("reject"), comment: z.string().trim().min(2).max(2000) }),
  z.object({ action: z.literal("priority"), priority: z.number().int().min(0).max(100) }),
  z.object({
    action: z.literal("flag"),
    flagId: z.string().uuid(),
    status: z.enum(["mitigated", "accepted_risk", "waived"]),
    reason: z.string().trim().min(2).max(500),
  }),
]);

export async function POST(req: Request, ctx: RouteContext<"/api/prds/[id]/review">) {
  const { user, error } = await apiUser(["manager", "admin"]);
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("בקשה לא תקינה");
  const b = parsed.data;
  const prd = r.prd;

  if (b.action === "flag") {
    const [flag] = await db.select().from(schema.securityFlags).where(and(eq(schema.securityFlags.id, b.flagId), eq(schema.securityFlags.prdId, prd.id)));
    if (!flag) return bad("דגל לא נמצא", 404);
    // A hard ban is never waived by a manager; the requirement has to change.
    if (flag.ruleType === "hard_ban") return bad("חסימה לא ניתנת לביטול. יש לשנות את הדרישה.", 409);
    await db.update(schema.securityFlags).set({ status: b.status, waivedBy: user.id, waivedReason: b.reason }).where(eq(schema.securityFlags.id, flag.id));
    await audit(user.id, "prd", prd.id, "flag_updated", { rule: flag.ruleCode, status: b.status, reason: b.reason });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "priority") {
    await db.update(schema.prds).set({ priorityScore: b.priority }).where(eq(schema.prds.id, prd.id));
    await audit(user.id, "prd", prd.id, "priority_set", { priority: b.priority });
    return NextResponse.json({ ok: true });
  }

  if (prd.status !== "in_review") return bad("אפשר להחליט רק על PRD בסקירה");

  if (b.action === "approve") {
    if (prd.riskLevel === "blocked") return bad("אי אפשר לאשר PRD חסום", 409);
    await db
      .update(schema.prds)
      .set({ status: "approved", ...(b.priority !== undefined && b.priority !== null ? { priorityScore: b.priority } : {}) })
      .where(eq(schema.prds.id, prd.id));
    if (b.comment?.trim()) await db.insert(schema.comments).values({ prdId: prd.id, authorId: user.id, body: b.comment.trim() });
    await audit(user.id, "prd", prd.id, "approved", { priority: b.priority ?? prd.priorityScore });
    return NextResponse.json({ ok: true });
  }

  const status = b.action === "revise" ? "revision_requested" : "rejected";
  await db.update(schema.prds).set({ status }).where(eq(schema.prds.id, prd.id));
  await db.insert(schema.comments).values({ prdId: prd.id, authorId: user.id, body: b.comment, kind: b.action === "revise" ? "revision_request" : "comment" });
  await audit(user.id, "prd", prd.id, status, { comment: b.comment });
  return NextResponse.json({ ok: true });
}
