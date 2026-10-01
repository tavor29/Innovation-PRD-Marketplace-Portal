// PRD orchestration (PRD 7.2): synthesize → validate → policy (code, then
// semantic, add-only) → wireframe → render → save, with an audit entry for
// every step that changes state. Versions are immutable once published; a
// draft can be edited and re-checked until then.
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAi } from "../ai/registry";
import type { WireframeSpec } from "../ai/types";
import { mergeFindings, riskLevel, runRules } from "../policy/engine";
import { detectorSchema, type Finding, type RuleInput } from "../policy/types";
import { audit } from "../audit";
import { today } from "../utils";
import { prdContentSchema, type PrdContent } from "./schema";
import { renderPrdMarkdown } from "./render";

export async function loadRules(): Promise<RuleInput[]> {
  const rows = await db.select().from(schema.policyRules);
  return rows.map((r) => ({
    code: r.code,
    titleHe: r.titleHe,
    type: r.type,
    severity: r.severity,
    detector: detectorSchema.parse(r.detector),
    mitigationTemplateMd: r.mitigationTemplateMd,
    isActive: r.isActive,
  }));
}

export async function runPolicy(content: PrdContent): Promise<{ findings: Finding[]; risk: ReturnType<typeof riskLevel> }> {
  const code = runRules(content, await loadRules());
  const llm = await getAi().semanticReview(content, code);
  const findings = mergeFindings(code, llm);
  return { findings, risk: riskLevel(findings) };
}

async function saveFlags(prdId: string, findings: Finding[], keep: Map<string, typeof schema.securityFlags.$inferSelect> = new Map()) {
  await db.delete(schema.securityFlags).where(eq(schema.securityFlags.prdId, prdId));
  if (!findings.length) return;
  await db.insert(schema.securityFlags).values(
    findings.map((f) => {
      const prev = keep.get(f.ruleCode);
      return {
        prdId,
        ruleCode: f.ruleCode,
        ruleType: f.ruleType,
        severity: f.severity,
        evidence: `${f.title}: ${f.evidence}`,
        mitigationMd: f.mitigationMd,
        source: f.source,
        // A waiver or mitigation survives a re-check if the same rule fires again.
        status: prev?.status ?? "open",
        waivedBy: prev?.waivedBy ?? null,
        waivedReason: prev?.waivedReason ?? null,
      };
    }),
  );
}

export async function generatePrd(sessionId: string, actorId: string): Promise<string> {
  const session = await db.query.wizardSessions.findFirst({ where: eq(schema.wizardSessions.id, sessionId) });
  if (!session) throw new Error("session not found");
  const submission = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, session.submissionId) });
  if (!submission) throw new Error("submission not found");
  const [submitter] = await db.select().from(schema.users).where(eq(schema.users.id, submission.submitterId));
  const dept = submission.departmentId
    ? (await db.select().from(schema.departments).where(eq(schema.departments.id, submission.departmentId)))[0]
    : undefined;
  const files = await db.select().from(schema.attachments).where(eq(schema.attachments.submissionId, submission.id));

  const ai = getAi();
  const content = prdContentSchema.parse(
    await ai.synthesize({
      branch: submission.branch,
      title: submission.title,
      rawInput: submission.rawInput,
      attachments: files.map((a) => ({ provider: a.provider, externalUrl: a.externalUrl, metadata: a.extractedMetadata ?? null })),
      state: session.state,
      submitterName: submitter?.fullName ?? "",
      departmentName: dept?.nameHe ?? "",
    }),
  );
  const { findings, risk } = await runPolicy(content);
  const wireframe = await ai.wireframe(content);

  const [last] = await db
    .select({ version: schema.prds.version })
    .from(schema.prds)
    .where(eq(schema.prds.submissionId, submission.id))
    .orderBy(desc(schema.prds.version))
    .limit(1);
  const version = (last?.version ?? 0) + 1;

  const [prd] = await db
    .insert(schema.prds)
    .values({
      submissionId: submission.id,
      version,
      title: content.title,
      contentJson: content,
      contentMd: renderPrdMarkdown(content, { version, status: "draft", date: today(), findings, wireframe }),
      status: "draft",
      riskLevel: risk,
    })
    .returning({ id: schema.prds.id });

  await saveFlags(prd.id, findings);
  await db.insert(schema.wireframes).values({ prdId: prd.id, specJson: wireframe });
  await db.update(schema.wizardSessions).set({ completedAt: new Date() }).where(eq(schema.wizardSessions.id, session.id));
  await db.update(schema.submissions).set({ status: "synthesized" }).where(eq(schema.submissions.id, submission.id));
  await audit(actorId, "prd", prd.id, "generated", { version, risk, flags: findings.map((f) => f.ruleCode), provider: ai.name });
  return prd.id;
}

async function latestWireframe(prdId: string): Promise<WireframeSpec | null> {
  const [w] = await db.select().from(schema.wireframes).where(eq(schema.wireframes.prdId, prdId)).orderBy(desc(schema.wireframes.createdAt)).limit(1);
  return (w?.specJson as WireframeSpec) ?? null;
}

/**
 * Re-run the policy on a draft, e.g. after an admin edits a rule or the
 * submitter edits the PRD. Returns which flags appeared and disappeared.
 */
export async function recheckPrd(prdId: string, actorId: string, edited?: PrdContent) {
  const prd = await db.query.prds.findFirst({ where: eq(schema.prds.id, prdId) });
  if (!prd) throw new Error("prd not found");
  if (prd.status !== "draft") throw new Error("only a draft can change; published versions are immutable");
  const content = prdContentSchema.parse(edited ?? prd.contentJson);
  const before = await db.select().from(schema.securityFlags).where(eq(schema.securityFlags.prdId, prdId));
  const { findings, risk } = await runPolicy(content);

  let wireframe = await latestWireframe(prdId);
  if (edited) {
    wireframe = await getAi().wireframe(content);
    await db.insert(schema.wireframes).values({ prdId, specJson: wireframe });
  }
  await saveFlags(prdId, findings, new Map(before.map((f) => [f.ruleCode, f])));
  await db
    .update(schema.prds)
    .set({
      title: content.title,
      contentJson: content,
      riskLevel: risk,
      contentMd: renderPrdMarkdown(content, { version: prd.version, status: prd.status, date: today(), findings, wireframe }),
    })
    .where(eq(schema.prds.id, prdId));

  const was = new Set(before.map((f) => f.ruleCode));
  const now = new Set(findings.map((f) => f.ruleCode));
  const diff = { added: [...now].filter((c) => !was.has(c)), removed: [...was].filter((c) => !now.has(c)), risk };
  await audit(actorId, "prd", prdId, edited ? "edited" : "policy_rechecked", diff);
  return diff;
}

/** After "revision requested": a new draft version, the old one stays as it was. */
export async function newVersion(prdId: string, actorId: string): Promise<string> {
  const prd = await db.query.prds.findFirst({ where: eq(schema.prds.id, prdId) });
  if (!prd) throw new Error("prd not found");
  const [last] = await db
    .select({ version: schema.prds.version })
    .from(schema.prds)
    .where(eq(schema.prds.submissionId, prd.submissionId))
    .orderBy(desc(schema.prds.version))
    .limit(1);
  const existingDraft = await db.query.prds.findFirst({
    where: and(eq(schema.prds.submissionId, prd.submissionId), eq(schema.prds.status, "draft")),
  });
  if (existingDraft) return existingDraft.id;

  const [copy] = await db
    .insert(schema.prds)
    .values({
      submissionId: prd.submissionId,
      version: last.version + 1,
      title: prd.title,
      contentJson: prd.contentJson,
      contentMd: prd.contentMd,
      status: "draft",
      riskLevel: prd.riskLevel,
      priorityScore: prd.priorityScore,
    })
    .returning({ id: schema.prds.id });
  const wf = await latestWireframe(prdId);
  if (wf) await db.insert(schema.wireframes).values({ prdId: copy.id, specJson: wf });
  await audit(actorId, "prd", copy.id, "new_version", { from: prd.version, to: last.version + 1 });
  await recheckPrd(copy.id, actorId);
  return copy.id;
}
