// Generate a PRD from a finished (or partly finished) interview.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { generatePrd } from "@/lib/prd/generate";

export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const body = z.object({ sessionId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });

  const session = await db.query.wizardSessions.findFirst({ where: eq(schema.wizardSessions.id, body.data.sessionId) });
  if (!session) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, session.submissionId) });
  if (!sub || sub.submitterId !== user.id) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const existing = await db.query.prds.findFirst({ where: eq(schema.prds.submissionId, sub.id) });
  if (existing) return NextResponse.json({ prdId: existing.id });

  try {
    const prdId = await generatePrd(session.id, user.id);
    return NextResponse.json({ prdId });
  } catch (e) {
    console.error("[generate]", e);
    return NextResponse.json({ error: "לא הצלחנו להפיק PRD מהתשובות. נסה/י להשלים עוד שאלות." }, { status: 422 });
  }
}
