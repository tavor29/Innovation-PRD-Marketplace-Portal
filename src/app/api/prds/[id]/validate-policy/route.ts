// Re-run the policy on a draft, optionally saving the author's edits first
// (FR-23). Returns which flags were added and removed.
import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth/guard";
import { bad, loadPrdFor } from "@/lib/prd/access";
import { recheckPrd } from "@/lib/prd/generate";
import { prdContentSchema } from "@/lib/prd/schema";

export async function POST(req: Request, ctx: RouteContext<"/api/prds/[id]/validate-policy">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  if (!r.isOwner && user.role !== "admin") return bad("אין הרשאה", 403);
  if (r.prd.status !== "draft") return bad("גרסה שפורסמה לא משתנה. אפשר לערוך רק טיוטה.", 409);

  const raw = await req.text();
  let edited;
  if (raw) {
    const parsed = prdContentSchema.safeParse(JSON.parse(raw)?.content);
    if (!parsed.success) return bad("יש שדות ריקים או לא תקינים ב-PRD");
    edited = parsed.data;
  }
  const diff = await recheckPrd(r.prd.id, user.id, edited);
  return NextResponse.json(diff);
}
