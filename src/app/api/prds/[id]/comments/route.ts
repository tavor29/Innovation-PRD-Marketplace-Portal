import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { bad, loadPrdFor } from "@/lib/prd/access";

export async function POST(req: Request, ctx: RouteContext<"/api/prds/[id]/comments">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("תגובה ריקה");
  await db.insert(schema.comments).values({ prdId: r.prd.id, authorId: user.id, body: parsed.data.body });
  return NextResponse.json({ ok: true });
}
