import { describe, expect, it } from "vitest";
import { mergeFindings, riskLevel, runRules } from "./engine";
import { seedRules } from "./rules";
import type { Finding } from "./types";
import { mockSynthesize } from "../ai/mock";
import type { PrdContent } from "../prd/schema";

const base = mockSynthesize({
  branch: "idea",
  title: "מעקב בקשות רכש",
  rawInput: "טופס אחד לבקשות רכש עם אישור מנהל ומעקב סטטוס במקום מיילים",
  attachments: [],
  submitterName: "דנה",
  departmentName: "תפעול",
  state: {
    problem: "בקשות רכש מגיעות במייל ונאבדות, ואין דרך לדעת איפה כל בקשה עומדת",
    target_audience: "כ-40 עובדי התפעול ומנהלי הצוותים",
    workflows: "העובד ממלא טופס, המנהל מאשר, הרכש מקבל הודעה",
    data_sources: "רשימת ספקים מאושרים",
    systems: "רק קריאה, בלי כתיבה למערכות אחרות",
    personal_data: "לא, רק שמות העובדים",
    success: "זמן אישור ממוצע יורד מחמישה ימים ליומיים",
  },
});

const withFields = (patch: Partial<PrdContent>): PrdContent => ({ ...base, ...patch });

describe("policy engine: hard bans (FR-50)", () => {
  it("passes a clean PRD", () => {
    const findings = runRules(base, seedRules);
    expect(findings.filter((f) => f.ruleType === "hard_ban")).toEqual([]);
  });

  it.each([
    ["HB-01", { integrations: ["endpoint_management"] }],
    ["HB-01", { writeTargets: ["endpoint_management"] }],
    ["HB-02", { writeTargets: ["directory"] }],
    ["HB-03", { dataAccessPattern: "frontend_sql" }],
  ] as const)("blocks %s", (code, patch) => {
    const findings = runRules(withFields(patch as Partial<PrdContent>), seedRules);
    expect(findings.map((f) => f.ruleCode)).toContain(code);
    expect(riskLevel(findings)).toBe("blocked");
  });

  it("reading the directory is not a ban; writing to it is", () => {
    expect(runRules(withFields({ integrations: ["directory"] }), seedRules).some((f) => f.ruleCode === "HB-02")).toBe(false);
    expect(runRules(withFields({ writeTargets: ["directory"] }), seedRules).some((f) => f.ruleCode === "HB-02")).toBe(true);
  });

  it("ignores inactive rules (admin switched it off)", () => {
    const rules = seedRules.map((r) => (r.code === "HB-03" ? { ...r, isActive: false } : r));
    expect(runRules(withFields({ dataAccessPattern: "frontend_sql" }), rules).some((f) => f.ruleCode === "HB-03")).toBe(false);
  });
});

describe("policy engine: mitigations (FR-51)", () => {
  it("flags sensitive personal data as needing a mitigation, with the workaround filled in", () => {
    const [f] = runRules(withFields({ piiCategories: ["salary"] }), seedRules).filter((x) => x.ruleCode === "MT-01");
    expect(f.ruleType).toBe("requires_mitigation");
    expect(f.mitigationMd).toContain("נתוני שכר");
    expect(f.mitigationMd).not.toContain("{{evidence}}");
  });

  it("needs both an external AI and personal data for MT-02", () => {
    const only = (p: Partial<PrdContent>) => runRules(withFields(p), seedRules).some((f) => f.ruleCode === "MT-02");
    expect(only({ integrations: ["external_ai"] })).toBe(false);
    expect(only({ integrations: ["external_ai"], piiCategories: ["contact"] })).toBe(true);
  });

  it("risk levels follow the worst finding", () => {
    expect(riskLevel([])).toBe("none");
    expect(riskLevel([{ ruleType: "advisory", severity: "low" }])).toBe("low");
    expect(riskLevel([{ ruleType: "requires_mitigation", severity: "medium" }])).toBe("medium");
    expect(riskLevel([{ ruleType: "requires_mitigation", severity: "high" }])).toBe("high");
  });
});

describe("semantic pass can only add flags (FR-52)", () => {
  const code = runRules(withFields({ writeTargets: ["directory"] }), seedRules);
  const llm = (f: Partial<Finding>): Finding => ({
    ruleCode: "SEM-X",
    ruleType: "advisory",
    severity: "low",
    title: "x",
    evidence: "x",
    mitigationMd: "",
    source: "llm",
    ...f,
  });

  it("keeps every code finding even if the model returns nothing", () => {
    expect(mergeFindings(code, []).map((f) => f.ruleCode)).toEqual(code.map((f) => f.ruleCode));
  });

  it("cannot soften a code finding by reusing its rule code", () => {
    const merged = mergeFindings(code, [llm({ ruleCode: "HB-02", ruleType: "advisory" })]);
    const hb = merged.filter((f) => f.ruleCode === "HB-02");
    expect(hb).toHaveLength(1);
    expect(hb[0].ruleType).toBe("hard_ban");
    expect(hb[0].source).toBe("code");
  });

  it("adds new findings, but can't issue a hard ban on its own", () => {
    const merged = mergeFindings([], [llm({ ruleCode: "SEM-9", ruleType: "hard_ban" })]);
    expect(merged[0].ruleType).toBe("requires_mitigation");
    expect(merged[0].source).toBe("llm");
  });
});
