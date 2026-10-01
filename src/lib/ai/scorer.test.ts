import { describe, expect, it } from "vitest";
import { completeness, fieldsByBranch, isShallow, shallowKey } from "./scorer";
import { interviewTurn, solutionPatterns, startInterview } from "./wizard";
import { inferMachineFields } from "./mock";
import type { WizardContext } from "./types";

const field = (branch: keyof typeof fieldsByBranch, id: string) => fieldsByBranch[branch].find((f) => f.id === id)!;

describe("shallow answers (FR-21)", () => {
  it("catches short and vague answers", () => {
    expect(isShallow(field("idea", "target_audience"), "כולם")).toBe(true);
    expect(isShallow(field("idea", "workflows"), "לא יודע, כל מיני דברים")).toBe(true);
    expect(isShallow(field("idea", "target_audience"), "כ-40 עובדי התפעול ומנהלי הצוותים שלהם")).toBe(false);
  });

  it("accepts a numbered pick of a solution pattern", () => {
    expect(isShallow(field("problem", "solution_choice"), "2")).toBe(false);
    expect(isShallow(field("problem", "solution_choice"), "לא")).toBe(true);
  });
});

describe("completeness meter (FR-22)", () => {
  it("is 0 with nothing and 100 with every field answered well", () => {
    expect(completeness("idea", {})).toBe(0);
    const all = Object.fromEntries(fieldsByBranch.idea.map((f) => [f.id, "תשובה מלאה ומפורטת מספיק בשביל השדה הזה"]));
    expect(completeness("idea", all)).toBe(100);
  });

  it("counts a shallow answer as half", () => {
    const one = fieldsByBranch.idea[0];
    const total = fieldsByBranch.idea.reduce((s, f) => s + f.weight, 0);
    expect(completeness("idea", { [one.id]: "x", [shallowKey(one.id)]: "1" })).toBe(Math.round(((one.weight / 2) / total) * 100));
  });
});

describe("interview flow", () => {
  const ctx: WizardContext = { branch: "problem", title: "דוחות שבועיים", rawInput: "", attachments: [] };

  it("asks one follow-up on a shallow answer, then moves on", () => {
    let t = startInterview(ctx);
    t = interviewTurn(ctx, t.state, "מעצבן");
    expect(t.shallow).toBe(true);
    const pending = t.state._pending;
    t = interviewTurn(ctx, t.state, "עדיין מעצבן");
    expect(t.shallow).toBe(false);
    expect(t.state._pending).not.toBe(pending);
  });

  it("proposes one or two solution patterns on the problem track (FR-32)", () => {
    expect(solutionPatterns("כל שבוע מעתיקים נתונים מאקסל לדוח ידני").length).toBeGreaterThanOrEqual(1);
    expect(solutionPatterns("משהו").length).toBe(2);
  });
});

describe("machine fields (FR-34)", () => {
  it("reads writes to the directory and SQL from the browser", () => {
    const m = inferMachineFields("הכלי יעדכן קבוצות ב-Active Directory ויריץ SQL ישירות מהדפדפן");
    expect(m.writeTargets).toContain("directory");
    expect(m.dataAccessPattern).toBe("frontend_sql");
  });

  it("finds salary and ID numbers as personal data", () => {
    expect(inferMachineFields("טבלה עם תעודת זהות ושכר של כל עובד").piiCategories).toEqual(expect.arrayContaining(["national_id", "salary"]));
  });
});
