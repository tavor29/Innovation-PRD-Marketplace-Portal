// Interview fields per submission track, shallow-answer detection (FR-21) and
// the completeness meter (FR-22). Pure functions, shared by every provider.
import type { Branch, WizardState } from "./types";

export interface WizardField {
  id: string;
  question: string;
  /** Asked when the answer is too thin. */
  followUp: string;
  minWords: number;
  weight: number;
}

const common = {
  target_audience: {
    id: "target_audience",
    question: "מי ישתמש בזה בפועל? תאר/י את המשתמשים, את התפקיד שלהם ובערך כמה אנשים.",
    followUp: "אפשר לדייק? איזה צוות או תפקיד, ובערך כמה אנשים ישתמשו בזה כל שבוע?",
    minWords: 5,
    weight: 2,
  },
  workflows: {
    id: "workflows",
    question: "מה הם הצעדים העיקריים שהמשתמש עושה? כתוב/י 2–4 פעולות, כל אחת בשורה או מופרדת בפסיק.",
    followUp: "חסרים לי הצעדים עצמם. מה המשתמש עושה קודם, מה אחר כך, ומה התוצאה בסוף?",
    minWords: 6,
    weight: 3,
  },
  data_sources: {
    id: "data_sources",
    question: "מאילו מקורות מידע זה צריך לקרוא? (למשל קובץ אקסל, מערכת CRM, מערכת כספים, מסמכים)",
    followUp: "מאיפה בדיוק מגיע המידע היום? שם המערכת או הקובץ יעזור לבדיקת האבטחה.",
    minWords: 3,
    weight: 2,
  },
  systems: {
    id: "systems",
    question: "האם זה צריך לכתוב או לעדכן משהו במערכות אחרות? אם כן, באילו, ומה בדיוק משתנה שם?",
    followUp: "חשוב לדעת אם יש כתיבה למערכת אחרת. האם זה רק קורא מידע, או גם משנה אותו? באיזו מערכת?",
    minWords: 3,
    weight: 2,
  },
  personal_data: {
    id: "personal_data",
    question: "האם יש מידע אישי? (שמות, טלפונים, תעודות זהות, שכר, מידע רפואי) ומי צריך גישה אליו?",
    followUp: "אפשר לפרט? אילו שדות אישיים בדיוק, ומי מורשה לראות אותם?",
    minWords: 3,
    weight: 2,
  },
  success: {
    id: "success",
    question: "איך נדע שזה הצליח? מה ישתפר, ואיך אפשר למדוד את זה?",
    followUp: "אפשר מדד אחד שאפשר לבדוק? למשל זמן שנחסך, פחות טעויות או פחות פניות.",
    minWords: 5,
    weight: 2,
  },
} satisfies Record<string, WizardField>;

export const fieldsByBranch: Record<Branch, WizardField[]> = {
  // FR-31: solution-first fills in audience, workflows and data sources.
  idea: [
    {
      id: "solution",
      question: "ספר/י על הפתרון שאת/ה מדמיין/ת: מה הוא עושה, בשתיים–שלוש משפטים.",
      followUp: "אפשר יותר פרטים? מה המשתמש רואה ומה המערכת עושה בשבילו?",
      minWords: 8,
      weight: 3,
    },
    {
      id: "problem",
      question: "איזו בעיה זה פותר היום, ומה המחיר שלה (זמן, טעויות, כסף)?",
      followUp: "מה קורה היום בלי הפתרון? כמה זמן או טעויות זה עולה?",
      minWords: 6,
      weight: 3,
    },
    common.target_audience,
    common.workflows,
    common.data_sources,
    common.systems,
    common.personal_data,
    common.success,
  ],
  // FR-32: problem-first proposes 1–2 solution patterns before the PRD.
  problem: [
    {
      id: "pain",
      question: "מה הבעיה? תאר/י מה קורה היום ולמה זה מתסכל.",
      followUp: "אפשר דוגמה מהשבוע האחרון? מה בדיוק קרה?",
      minWords: 8,
      weight: 3,
    },
    {
      id: "who_affected",
      question: "את מי זה פוגע, ובאיזו תדירות?",
      followUp: "איזה צוות, כמה אנשים, וכל כמה זמן זה קורה?",
      minWords: 5,
      weight: 2,
    },
    {
      id: "current_workaround",
      question: "איך מתמודדים עם זה היום? (עבודה ידנית, אקסל, מיילים…)",
      followUp: "מה הצעדים הידניים היום, ומי עושה אותם?",
      minWords: 5,
      weight: 2,
    },
    {
      id: "solution_choice",
      question: "",
      followUp: "בחר/י 1 או 2, או תאר/י כיוון אחר בכמה מילים.",
      minWords: 1,
      weight: 3,
    },
    common.workflows,
    common.data_sources,
    common.systems,
    common.personal_data,
    common.success,
  ],
  // FR-33: the prototype track starts from the link and its metadata.
  prototype: [
    {
      id: "prototype_desc",
      question: "מה הפרוטוטייפ עושה היום? תאר/י את המסכים והפעולות העיקריות.",
      followUp: "אפשר לפרט את המסכים? מה המשתמש עושה בכל אחד?",
      minWords: 8,
      weight: 3,
    },
    {
      id: "prototype_users",
      question: "מי משתמש בו כבר היום, ומי אמור להשתמש בו בפרודקשן?",
      followUp: "כמה אנשים משתמשים בו היום, ואיזה צוות יקבל אותו בפרודקשן?",
      minWords: 5,
      weight: 2,
    },
    common.data_sources,
    common.systems,
    common.personal_data,
    {
      id: "gaps",
      question: "מה חסר כדי שזה יעבוד בפרודקשן? (הרשאות, חיבור למערכות, ביצועים, תחזוקה)",
      followUp: "מה הדבר הראשון שהיה נשבר אם כל המחלקה הייתה משתמשת בזה מחר?",
      minWords: 5,
      weight: 2,
    },
    common.success,
  ],
};

const vague = [
  "לא יודע",
  "לא יודעת",
  "לא בטוח",
  "לא בטוחה",
  "משהו",
  "וכו",
  "כל מיני",
  "לא משנה",
  "אין לי מושג",
  "בערך כמו",
  "idk",
  "something",
  "whatever",
  "stuff",
];

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** FR-21: a thin answer gets a focused follow-up instead of moving on. */
export function isShallow(field: WizardField, answer: string): boolean {
  const a = answer.trim();
  if (field.id === "solution_choice") return !/^\s*[12]\b/.test(a) && wordCount(a) < 4;
  if (wordCount(a) < field.minWords) return true;
  const lower = a.toLowerCase();
  return vague.some((v) => lower.includes(v)) && wordCount(a) < field.minWords * 2;
}

export const shallowKey = (id: string) => `_shallow:${id}`;

/** FR-22: weighted share of fields answered; a shallow answer counts half. */
export function completeness(branch: Branch, state: WizardState): number {
  const fields = fieldsByBranch[branch];
  const total = fields.reduce((s, f) => s + f.weight, 0);
  const got = fields.reduce((s, f) => {
    if (!state[f.id]?.trim()) return s;
    return s + (state[shallowKey(f.id)] ? f.weight / 2 : f.weight);
  }, 0);
  return Math.round((got / total) * 100);
}

export const followedKey = (id: string) => `_followed:${id}`;

/** The next field to ask about: the first one with no answer yet. */
export function nextField(branch: Branch, state: WizardState): WizardField | undefined {
  return fieldsByBranch[branch].find((f) => !state[f.id]?.trim());
}

/** PRD generation is allowed from this score; below it the user is warned. */
export const READY_AT = 70;
