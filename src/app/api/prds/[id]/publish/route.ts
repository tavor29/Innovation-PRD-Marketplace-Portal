// FR-24: the author publishes a draft to the marketplace. A PRD with an open
// hard ban can't be published (FR-50).
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { bad, loadPrdFor } from "@/lib/prd/access";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, ctx: RouteContext<"/api/prds/[id]/publish">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  if (!r.isOwner) return bad("רק מי שהגיש/ה יכול/ה לפרסם", 403);
  if (r.prd.status !== "draft") return bad("רק טיוטה אפשר לפרסם");
  if (r.prd.riskLevel === "blocked") return bad("יש חסימת מדיניות פתוחה. ערוך/י את הדרישה לפני פרסום.", 409);

  await db.update(schema.prds).set({ status: "in_review", publishedAt: new Date() }).where(eq(schema.prds.id, r.prd.id));
  await audit(user.id, "prd", r.prd.id, "published", { version: r.prd.version, risk: r.prd.riskLevel });
  return NextResponse.json({ ok: true });
}
