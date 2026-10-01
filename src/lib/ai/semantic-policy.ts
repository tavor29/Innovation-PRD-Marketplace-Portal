// The semantic pass (PRD 2.3): reads the prose for risks the structured
// fields missed. It runs after the code rules and its findings go through
// policy/engine.ts mergeFindings, so it can only add flags (FR-52).
import type { PrdContent } from "../prd/schema";
import type { Finding } from "../policy/types";

const prose = (c: PrdContent) =>
  [c.summary.problem, c.summary.solution, ...c.workflows, ...c.dataSources, c.targetAudience, c.prototype?.notes ?? ""]
    .join("\n")
    .toLowerCase();

export function mockSemanticReview(content: PrdContent, codeFindings: Finding[]): Finding[] {
  const t = prose(content);
  const out: Finding[] = [];
  const add = (f: Omit<Finding, "source">) => out.push({ ...f, source: "llm" });

  if (/סיסמ|password|token|מפתח api|api key/.test(t)) {
    add({
      ruleCode: "SEM-01",
      ruleType: "advisory",
      severity: "medium",
      title: "סיסמאות או מפתחות בתוך הכלי",
      evidence: "הטקסט מזכיר סיסמאות או מפתחות גישה",
      mitigationMd: "המלצה: לשמור סודות רק במנהל הסודות הארגוני, לעולם לא בקוד או בגיליון.",
    });
  }
  if (/ייצוא|לייצא|export|להוריד את כל/.test(t) && /לקוח|עובד|customer|employee/.test(t)) {
    add({
      ruleCode: "SEM-02",
      ruleType: "requires_mitigation",
      severity: "medium",
      title: "ייצוא רשימות של אנשים",
      evidence: "הטקסט מתאר ייצוא של נתוני לקוחות או עובדים",
      mitigationMd: "דורש מיטיגציה: להגביל ייצוא לשדות הנחוצים, לתעד כל ייצוא ולהגביל לפי תפקיד.",
    });
  }
  if (/רגיש|סודי|confidential|sensitive/.test(t) && content.piiCategories.length === 0) {
    add({
      ruleCode: "SEM-03",
      ruleType: "requires_mitigation",
      severity: "medium",
      title: "מידע שתואר כרגיש אבל לא סווג",
      evidence: "הטקסט מתאר מידע רגיש שלא נמצא בשדות המידע האישי",
      mitigationMd: "דורש מיטיגציה: לסווג את המידע עם צוות האבטחה לפני המשך.",
    });
  }
  // A model would also try to "clear" findings; this one never does, and
  // the engine would ignore it anyway.
  void codeFindings;
  return out;
}
