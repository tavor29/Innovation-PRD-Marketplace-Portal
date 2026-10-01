import { describe, expect, it } from "vitest";
import { renderPrdMarkdown } from "./render";
import { mockSynthesize } from "../ai/mock";
import { runRules } from "../policy/engine";
import { seedRules } from "../policy/rules";
import { wireframeFromContent } from "../ai/wireframe";

const content = mockSynthesize({
  branch: "prototype",
  title: "בוט שאלות נהלים",
  rawInput: "בוט שעונה על שאלות עובדים מתוך מסמכי הנהלים, בנוי ב-Lovable",
  attachments: [{ provider: "lovable", externalUrl: "https://policy-bot.lovable.app", metadata: { title: "policy bot" } }],
  submitterName: "רון",
  departmentName: "משאבי אנוש",
  state: {
    prototype_users: "צוות משאבי אנוש, 6 אנשים, ובפרודקשן כל העובדים",
    data_sources: "מסמכי הנהלים ב-SharePoint",
    systems: "רק קריאה",
    personal_data: "יש מספרי תעודת זהות במסמכים מסוימים",
    gaps: "הרשאות לפי מחלקה וחיבור ל-SSO",
    success: "פחות פניות חוזרות למשאבי אנוש",
  },
});
const findings = runRules(content, seedRules);
const md = renderPrdMarkdown(content, { version: 1, status: "draft", date: "2026-10-01", findings, wireframe: wireframeFromContent(content) });

describe("PRD markdown (FR-40)", () => {
  it("has every template section in order", () => {
    const order = ["## פרטי מסמך", "## 1. סיכום מנהלים", "## 2. בעיה והזדמנות", "## 3. משתמשים ופרסונות", "### User Stories", "## 4. היקף", "## 5. דרישות פונקציונליות", "## 7. ארכיטקטורה", "## Security & Compliance Matrix", "## 11. מדדי הצלחה", "## 12. סיכונים", "## Wireframe"];
    const idx = order.map((h) => md.indexOf(h));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it("adds the workaround section for findings that need one (FR-51)", () => {
    expect(findings.some((f) => f.ruleCode === "MT-01")).toBe(true);
    expect(md).toContain("### Security & Compliance Workaround");
    expect(md).toContain("**MT-01:**");
  });

  it("records the prototype link (FR-33)", () => {
    expect(md).toContain("https://policy-bot.lovable.app");
  });

  it("is deterministic", () => {
    expect(renderPrdMarkdown(content, { version: 1, status: "draft", date: "2026-10-01", findings, wireframe: wireframeFromContent(content) })).toBe(md);
  });

  it("escapes pipes so table cells can't break the table", () => {
    const out = renderPrdMarkdown({ ...content, title: "a | b" }, { version: 1, status: "draft", date: "2026-10-01", findings: [] });
    expect(out).toContain("a \\| b");
  });
});
