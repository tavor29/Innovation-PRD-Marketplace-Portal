// After a revision request: create the next version as an editable draft.
// The reviewed version stays exactly as it was (immutable versions).
import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth/guard";
import { bad, loadPrdFor } from "@/lib/prd/access";
import { newVersion } from "@/lib/prd/generate";

export async function POST(_req: Request, ctx: RouteContext<"/api/prds/[id]/generate">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  if (!r.isOwner) return bad("רק מי שהגיש/ה יכול/ה ליצור גרסה", 403);
  if (r.prd.status !== "revision_requested") return bad("גרסה חדשה נוצרת רק אחרי בקשת תיקון");
  const prdId = await newVersion(r.prd.id, user.id);
  return NextResponse.json({ prdId });
}
