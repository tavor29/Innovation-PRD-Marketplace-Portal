// Policy engine, deterministic first (PRD 2.3, FR-50..52). Code rules run
// over the machine-checkable fields; the semantic (LLM) pass runs after and
// is merged with `mergeFindings`, which can only add findings, never remove
// or soften one raised in code.
import type { PrdContent } from "../prd/schema";
import { machineLabels } from "../prd/schema";
import type { Detector, Finding, RiskLevel, RuleInput } from "./types";

type Match = { matched: boolean; evidence: string[] };

const label = (v: string) => machineLabels[v] ?? v;
const fieldLabel: Record<string, string> = {
  integrations: "אינטגרציות",
  writeTargets: "כתיבה ל",
  dataAccessPattern: "גישה לנתונים",
  authModel: "אימות",
  piiCategories: "מידע אישי",
};
const field = (f: string) => fieldLabel[f] ?? f;

function fieldValues(content: PrdContent, field: string): string[] {
  const v = (content as Record<string, unknown>)[field];
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") return [v];
  return [];
}

function evaluate(d: Detector, content: PrdContent): Match {
  if ("all" in d) {
    const parts = d.all.map((x) => evaluate(x, content));
    return { matched: parts.every((p) => p.matched), evidence: parts.flatMap((p) => p.evidence) };
  }
  if ("any" in d) {
    const parts = d.any.map((x) => evaluate(x, content)).filter((p) => p.matched);
    return { matched: parts.length > 0, evidence: parts.flatMap((p) => p.evidence) };
  }
  const values = fieldValues(content, d.field);
  if (d.op === "nonempty") {
    return { matched: values.length > 0, evidence: values.length ? [`${field(d.field)}: ${values.map(label).join(", ")}`] : [] };
  }
  const hits = values.filter((v) => d.values.includes(v));
  return { matched: hits.length > 0, evidence: hits.length ? [`${field(d.field)}: ${hits.map(label).join(", ")}`] : [] };
}

/** Run every active rule. Pure: same content and rules, same findings. */
export function runRules(content: PrdContent, rules: RuleInput[]): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (!rule.isActive) continue;
    const m = evaluate(rule.detector, content);
    if (!m.matched) continue;
    const evidence = m.evidence.join("; ");
    findings.push({
      ruleCode: rule.code,
      ruleType: rule.type,
      severity: rule.severity,
      title: rule.titleHe,
      evidence,
      mitigationMd: rule.mitigationTemplateMd.replaceAll("{{evidence}}", evidence),
      source: "code",
    });
  }
  return findings;
}

const typeRank = { advisory: 0, requires_mitigation: 1, hard_ban: 2 } as const;

/**
 * FR-52: the semantic pass may only add flags. A finding from the LLM with
 * the same rule code as a code finding is ignored (code wins), and nothing
 * the LLM returns can remove a code finding.
 */
export function mergeFindings(codeFindings: Finding[], llmFindings: Finding[]): Finding[] {
  const codes = new Set(codeFindings.map((f) => f.ruleCode));
  const extra = llmFindings
    .filter((f) => !codes.has(f.ruleCode))
    // The model can raise concerns but never issue a hard ban on its own.
    .map((f) => ({ ...f, source: "llm" as const, ruleType: f.ruleType === "hard_ban" ? "requires_mitigation" as const : f.ruleType }));
  return [...codeFindings, ...extra].sort((a, b) => typeRank[b.ruleType] - typeRank[a.ruleType]);
}

export function riskLevel(findings: Pick<Finding, "ruleType" | "severity">[]): RiskLevel {
  if (findings.some((f) => f.ruleType === "hard_ban")) return "blocked";
  const mitigations = findings.filter((f) => f.ruleType === "requires_mitigation");
  if (mitigations.some((f) => f.severity === "high" || f.severity === "critical")) return "high";
  if (mitigations.length) return "medium";
  if (findings.length) return "low";
  return "none";
}
