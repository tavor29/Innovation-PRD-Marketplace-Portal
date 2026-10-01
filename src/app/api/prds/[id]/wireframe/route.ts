// FR-42: regenerate the wireframe from the current PRD content.
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { bad, loadPrdFor } from "@/lib/prd/access";
import { enqueue } from "@/lib/jobs/queue";
import { prdContentSchema } from "@/lib/prd/schema";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, ctx: RouteContext<"/api/prds/[id]/wireframe">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  if (!r.isOwner && user.role !== "admin") return bad("אין הרשאה", 403);
  const content = prdContentSchema.parse(r.prd.contentJson);
  await enqueue("wireframe", { prdId: r.prd.id, content }, async ({ prdId, content: c }) => {
    const { getAi } = await import("@/lib/ai/registry");
    await db.insert(schema.wireframes).values({ prdId, specJson: await getAi().wireframe(c) });
  });
  await audit(user.id, "prd", r.prd.id, "wireframe_regenerated");
  return NextResponse.json({ ok: true });
}
