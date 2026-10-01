import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { getAi } from "@/lib/ai/registry";

export async function POST(req: Request, ctx: RouteContext<"/api/wizard/[sessionid]/message">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { sessionid } = await ctx.params;
  const body = z.object({ content: z.string().trim().min(1).max(4000) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "הודעה ריקה" }, { status: 400 });

  const session = await db.query.wizardSessions.findFirst({ where: eq(schema.wizardSessions.id, sessionid) });
  if (!session) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, session.submissionId) });
  if (!sub || sub.submitterId !== user.id) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  if (session.completedAt) return NextResponse.json({ error: "ה-PRD כבר הופק" }, { status: 409 });

  const files = await db.select().from(schema.attachments).where(eq(schema.attachments.submissionId, sub.id));
  const turn = await getAi().turn(
    {
      branch: sub.branch,
      title: sub.title,
      rawInput: sub.rawInput,
      attachments: files.map((a) => ({ provider: a.provider, externalUrl: a.externalUrl, metadata: a.extractedMetadata ?? null })),
    },
    session.state,
    body.data.content,
  );

  await db.insert(schema.wizardMessages).values([
    { sessionId: session.id, role: "user", content: body.data.content },
    { sessionId: session.id, role: "assistant", content: turn.reply, toolCalls: turn.shallow ? { shallow: true } : null },
  ]);
  await db.update(schema.wizardSessions).set({ state: turn.state, completenessScore: turn.completeness }).where(eq(schema.wizardSessions.id, session.id));

  return NextResponse.json({ reply: turn.reply, shallow: turn.shallow, completeness: turn.completeness, done: turn.done });
}
