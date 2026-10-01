// FR-14: save a policy rule. The detector must parse against the detector
// schema, so a bad edit can't break the engine. Audited.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { detectorSchema } from "@/lib/policy/types";
import { audit } from "@/lib/audit";

const body = z.object({
  id: z.string().uuid(),
  titleHe: z.string().trim().min(2).max(200),
  type: z.enum(["hard_ban", "requires_mitigation", "advisory"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  mitigationTemplateMd: z.string().max(2000),
  detector: z.string(),
  isActive: z.boolean(),
});

export async function POST(req: Request) {
  const { user, error } = await apiUser(["admin"]);
  if (error) return error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "שדות חסרים" }, { status: 400 });
  let detector;
  try {
    detector = detectorSchema.parse(JSON.parse(parsed.data.detector));
  } catch {
    return NextResponse.json({ error: "התנאי אינו JSON תקין לפי הסכמה" }, { status: 400 });
  }
  const [before] = await db.select().from(schema.policyRules).where(eq(schema.policyRules.id, parsed.data.id));
  if (!before) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  const { id, ...rest } = parsed.data;
  const next = { ...rest, detector };
  await db.update(schema.policyRules).set(next).where(eq(schema.policyRules.id, id));
  const changed = Object.fromEntries(
    Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify((before as Record<string, unknown>)[k])),
  );
  await audit(user.id, "policy_rule", id, "updated", { code: before.code, changed });
  return NextResponse.json({ ok: true });
}
