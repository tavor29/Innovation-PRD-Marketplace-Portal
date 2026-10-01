// Create a submission (FR-20): save it with its link and file, open the
// wizard session, and record the wizard's first message.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { extractFile, extractLink } from "@/lib/extract";
import { storage } from "@/lib/storage/adapter";
import { getAi } from "@/lib/ai/registry";
import { audit } from "@/lib/audit";

const MAX_FILE = 5 * 1024 * 1024;

const input = z.object({
  branch: z.enum(["idea", "problem", "prototype"]),
  title: z.string().trim().min(2).max(120),
  rawInput: z.string().trim().min(5).max(5000),
  link: z.string().trim().max(500).optional().default(""),
});

export async function POST(req: Request) {
  const { user, error } = await apiUser(["submitter", "manager", "admin"]);
  if (error) return error;

  const form = await req.formData();
  const parsed = input.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return NextResponse.json({ error: "חסרים שם או תיאור" }, { status: 400 });
  const { branch, title, rawInput, link } = parsed.data;

  const linkInfo = link ? extractLink(link) : null;
  if (link && !linkInfo) return NextResponse.json({ error: "הקישור לא תקין" }, { status: 400 });
  if (branch === "prototype" && !linkInfo) return NextResponse.json({ error: "במסלול פרוטוטייפ צריך קישור" }, { status: 400 });

  const file = form.get("file");
  if (file instanceof File && file.size > MAX_FILE) return NextResponse.json({ error: "הקובץ גדול מ-5MB" }, { status: 400 });

  const [sub] = await db
    .insert(schema.submissions)
    .values({ submitterId: user.id, departmentId: user.departmentId ?? null, branch, title, rawInput, status: "in_wizard" })
    .returning();

  const attachments: { provider: string | null; externalUrl: string | null; metadata: Record<string, unknown> | null }[] = [];
  if (linkInfo) {
    const metadata = { title: linkInfo.title, host: linkInfo.host, providerLabel: linkInfo.providerLabel };
    await db.insert(schema.attachments).values({ submissionId: sub.id, kind: "link", externalUrl: linkInfo.url, provider: linkInfo.provider, extractedMetadata: metadata });
    attachments.push({ provider: linkInfo.providerLabel, externalUrl: linkInfo.url, metadata });
  }
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = extractFile(file.name, file.type, bytes);
    const key = await storage().put(file.name, bytes);
    await db.insert(schema.attachments).values({ submissionId: sub.id, kind: "file", storagePath: key, extractedMetadata: { ...info } });
  }

  const ctx = { branch, title, rawInput, attachments };
  const first = await getAi().start(ctx);
  const [session] = await db
    .insert(schema.wizardSessions)
    .values({ submissionId: sub.id, branch, state: first.state, completenessScore: first.completeness })
    .returning();
  await db.insert(schema.wizardMessages).values({ sessionId: session.id, role: "assistant", content: first.reply });
  await audit(user.id, "submission", sub.id, "submitted", { branch, link: linkInfo?.provider ?? null });

  return NextResponse.json({ sessionId: session.id });
}
