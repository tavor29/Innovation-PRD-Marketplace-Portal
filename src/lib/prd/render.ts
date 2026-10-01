// FR-40: the PRD as Markdown, in the organization's template structure
// (PRD-template (1) - Copy.txt): document details, 1 summary, 2 problem,
// 3 personas, user stories, 4 scope, 5 requirements, 7 architecture,
// security matrix, 11 KPIs, 12 risks, wireframe. Pure and deterministic,
// so the same content always renders the same file (and can be tested).
import { machineLabels, type PrdContent } from "./schema";
import type { Finding } from "../policy/types";
import type { WireframeSpec } from "../ai/types";

export interface RenderMeta {
  version: number;
  status: string;
  date: string; // YYYY-MM-DD
  findings: Pick<Finding, "ruleCode" | "ruleType" | "severity" | "title" | "evidence" | "mitigationMd" | "source">[];
  wireframe?: WireframeSpec | null;
}

const branchLabel = { idea: "Solution-first (רעיון)", problem: "Problem-first (בעיה)", prototype: "Citizen Developer (פרוטוטייפ)" };
export const ruleTypeLabel = { hard_ban: "🟥 חסום", requires_mitigation: "🟨 דורש מיטיגציה", advisory: "⬜ המלצה" };

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ");
const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- —");
const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
const labels = (xs: string[]) => (xs.length ? xs.map((x) => machineLabels[x] ?? x).join(", ") : "ללא");

export function renderPrdMarkdown(c: PrdContent, meta: RenderMeta): string {
  const out: string[] = [];
  out.push(`# PRD — ${c.title}`);
  out.push("## פרטי מסמך");
  out.push(
    table(
      ["שדה", "ערך"],
      [
        ["שם המוצר", c.title],
        ["גרסת מסמך", String(meta.version)],
        ["תאריך", meta.date],
        ["סטטוס", meta.status],
        ["מסלול הגשה", branchLabel[c.branch]],
        ["מחלקה", c.department || "—"],
        ["מגיש/ה", c.submitter || "—"],
      ],
    ),
  );

  out.push("## 1. סיכום מנהלים", c.summary.problem, c.summary.solution);
  out.push("**תוצרים עיקריים למשתמש הסופי:**", list(c.summary.deliverables));
  out.push("**שלבי מוצר:**", list([`Phase 1: ${c.summary.phase1}`, ...(c.summary.phase2 ? [`Phase 2: ${c.summary.phase2}`] : [])]));

  out.push("## 2. בעיה והזדמנות", "### 2.1 הבעיה העסקית");
  out.push(table(["כאב", "השפעה"], c.problem.pains.map((p) => [p.pain, p.impact])));
  out.push("### 2.2 ההזדמנות", list(c.problem.opportunities));

  out.push("## 3. משתמשים ופרסונות", `**קהל יעד:** ${c.targetAudience}`);
  c.personas.forEach((p, i) => {
    out.push(`### 3.${i + 1} פרסונה — ${p.name}`, list([`מטרה עיקרית: ${p.goal}`, `מה מצליח עבורם: ${p.success}`]));
  });
  out.push("### User Stories", list(c.userStories.map((u) => `בתור ${u.as}, אני רוצה ${u.want}, כדי ש${u.soThat}.`)));

  out.push("## 4. היקף (In / Out)", "### 4.1 In — Phase 1 (MVP)", list(c.scope.in));
  out.push("### 4.2 Out — Phase 1", list(c.scope.out), "### 4.3 Phase 2", list(c.scope.phase2));

  out.push("## 5. דרישות פונקציונליות", table(["ID", "דרישה"], c.functionalRequirements.map((r) => [r.id, r.text])));

  out.push("## 7. ארכיטקטורה וזרימות (Tech Architecture)", "### 7.1 סטאק מוצע", list(c.architecture.stack));
  out.push("### 7.2 זרימה מקצה לקצה", c.architecture.flow.map((s, i) => `${i + 1}. ${s}`).join("\n"));
  out.push("### מקורות מידע", list(c.dataSources));
  out.push(
    "### שדות לבדיקת מדיניות",
    table(
      ["שדה", "ערך"],
      [
        ["אינטגרציות", labels(c.integrations)],
        ["כתיבה למערכות", labels(c.writeTargets)],
        ["גישה לנתונים", labels([c.dataAccessPattern])],
        ["אימות", labels([c.authModel])],
        ["מידע אישי", labels(c.piiCategories)],
      ],
    ),
  );
  if (c.prototype?.url) out.push("### פרוטוטייפ קיים", list([`קישור: ${c.prototype.url}`, `כלי: ${c.prototype.provider || "—"}`]));

  out.push("## Security & Compliance Matrix");
  if (meta.findings.length === 0) {
    out.push("לא נמצאו הפרות מדיניות.");
  } else {
    out.push(
      table(
        ["כלל", "סטטוס", "חומרה", "ממצא", "מקור"],
        meta.findings.map((f) => [`${f.ruleCode} ${f.title}`, ruleTypeLabel[f.ruleType], f.severity, f.evidence, f.source === "code" ? "כלל קוד" : "בדיקה סמנטית"]),
      ),
    );
    // FR-51: every finding that needs a mitigation gets its workaround section.
    const work = meta.findings.filter((f) => f.ruleType !== "advisory" || f.mitigationMd);
    out.push("### Security & Compliance Workaround", work.map((f) => `- **${f.ruleCode}:** ${f.mitigationMd}`).join("\n"));
  }

  out.push("## 11. מדדי הצלחה (KPIs)", table(["מדד", "יעד"], c.kpis.length ? c.kpis.map((k) => [k.name, k.target]) : [["—", "—"]]));
  out.push("## 12. סיכונים ומיטיגציות", table(["סיכון", "השפעה", "מיטיגציה"], c.risks.length ? c.risks.map((r) => [r.risk, r.impact, r.mitigation]) : [["—", "—", "—"]]));

  out.push("## Wireframe");
  if (meta.wireframe?.screens.length) {
    out.push(list(meta.wireframe.screens.map((s) => `**${s.name}** — ${s.purpose}`)));
  } else {
    out.push("ייווצר אחרי בדיקת המדיניות.");
  }
  return out.join("\n\n") + "\n";
}
