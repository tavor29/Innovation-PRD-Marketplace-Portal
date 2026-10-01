// The deterministic provider (AI_PROVIDER=mock): no keys, no cost, same
// output for the same input. It's the default for development, CI and the
// public demo. It reads the interview with keyword rules instead of a model.
import { prdContentSchema, type PrdContent } from "../prd/schema";
import { interviewTurn, startInterview } from "./wizard";
import { mockSemanticReview } from "./semantic-policy";
import { wireframeFromContent } from "./wireframe";
import type { AiProvider, SynthesisInput } from "./types";

type Machine = Pick<PrdContent, "integrations" | "writeTargets" | "dataAccessPattern" | "authModel" | "piiCategories">;

const has = (text: string, ...patterns: RegExp[]) => patterns.some((p) => p.test(text));

/**
 * FR-34: derive the machine-checkable fields from the interview text. A real
 * model fills the same fields through structured output; the policy engine
 * only ever reads these, never the prose.
 */
export function inferMachineFields(raw: string, writeText = raw): Machine {
  const t = raw.toLowerCase();
  const w = writeText.toLowerCase();
  const integrations = new Set<Machine["integrations"][number]>();
  const writeTargets = new Set<Machine["writeTargets"][number]>();
  const pii = new Set<Machine["piiCategories"][number]>();

  if (has(t, /מייל|דוא"ל|email|outlook/)) integrations.add("email");
  if (has(t, /יומן|calendar|פגיש/)) integrations.add("calendar");
  if (has(t, /teams|slack|טימס|סלאק|צ'אט/)) integrations.add("chat");
  if (has(t, /crm|לקוחות/)) integrations.add("crm");
  if (has(t, /\berp\b|מלאי|רכש/)) integrations.add("erp");
  if (has(t, /משאבי אנוש|\bhr\b|נוכחות|גיוס/)) integrations.add("hr_system");
  if (has(t, /כספים|חשבונ|תקציב|finance|הנהלת חשבונות/)) integrations.add("finance_system");
  if (has(t, /תחנות קצה|ניהול תחנות|endpoint|מחשבי עובדים/)) integrations.add("endpoint_management");
  if (has(t, /active directory|אקטיב דירקטורי|\bad\b|ldap|ספריית משתמשים|directory/)) integrations.add("directory");
  if (has(t, /sharepoint|שרפוינט|מסמכים|נהלים|קבצים/)) integrations.add("document_store");
  if (has(t, /chatgpt|\bgpt|openai|claude|gemini|בינה מלאכותית|\bai\b|מודל שפה|llm/)) integrations.add("external_ai");
  if (has(t, /מסד נתונים|database|\bsql\b|טבלה/)) integrations.add("internal_db");
  if (has(t, /ציבורי|לקוחות חיצוניים|אתר החברה|public/)) integrations.add("public_web");

  // Hebrew conjugates around the root, so match roots: עדכ covers לעדכן,
  // יעדכן, מעדכן, עדכון; and so on.
  const writes = /עדכ|כתו?ב(?!ת)|כתיב|יצור|יצירת|יוצר|מחו?ק|מחיק|שנות|ישנה|משנה|להוסיף|יוסיף|מוסיף|פתוח|יפתח|פותח|update|write|create|delete|modify/;
  if (writes.test(w)) {
    if (has(w, /active directory|אקטיב דירקטורי|\bad\b|ldap|ספריית משתמשים|הרשאות משתמשים|קבוצות/)) writeTargets.add("directory");
    if (has(w, /תחנות קצה|ניהול תחנות|endpoint|להתקין|התקנ/)) writeTargets.add("endpoint_management");
    if (has(w, /כספים|חשבונ|תקציב|finance/)) writeTargets.add("finance_system");
    if (has(w, /משאבי אנוש|\bhr\b|נוכחות|שכר/)) writeTargets.add("hr_system");
    if (has(w, /מסד נתונים|database|טבלה|רשומ/)) writeTargets.add("internal_db");
    if (has(w, /מסמכ|קובץ|קבצים|sharepoint/)) writeTargets.add("documents");
    if (has(w, /saas|שירות חיצוני|מערכת חיצונית/)) writeTargets.add("external_saas");
  }

  let dataAccessPattern: Machine["dataAccessPattern"] = "backend_api";
  if (has(t, /\bsql\b/) && has(t, /דפדפן|frontend|צד הלקוח|מהממשק|client/)) dataAccessPattern = "frontend_sql";
  else if (has(t, /ישירות ממסד|direct db|חיבור ישיר למסד/)) dataAccessPattern = "direct_db_read";

  let authModel: Machine["authModel"] = "sso";
  if (has(t, /בלי התחברות|ללא התחברות|בלי סיסמה|פתוח לכולם/)) authModel = "none";
  else if (has(t, /סיסמה משותפת|shared password|יוזר אחד לכולם/)) authModel = "shared_password";

  if (has(t, /טלפון|כתובת|פרטי קשר|אימייל של|phone/)) pii.add("contact");
  if (has(t, /תעודת זהות|ת\.ז|ת"ז|national id/)) pii.add("national_id");
  if (has(t, /רפואי|בריאות|מחלה|health/)) pii.add("health");
  if (has(t, /כרטיס אשראי|חשבון בנק|פיננסי/)) pii.add("financial");
  if (has(t, /שכר|משכורת|תלוש|salary/)) pii.add("salary");
  if (has(t, /מיקום|gps|location/)) pii.add("location");

  return {
    integrations: [...integrations],
    writeTargets: [...writeTargets],
    dataAccessPattern,
    authModel,
    piiCategories: [...pii],
  };
}

const items = (s: string | undefined) =>
  (s ?? "")
    .split(/\n|,|;|•|(?:\s-\s)|\.\s/)
    .map((x) => x.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter((x) => x.length > 2);

const first = (...xs: (string | undefined)[]) => xs.find((x) => x?.trim())?.trim() ?? "";

export function mockSynthesize(input: SynthesisInput): PrdContent {
  const s = input.state;
  const proto = input.attachments.find((a) => a.externalUrl);
  const problem = first(s.problem, s.pain, s.gaps, input.rawInput);
  const solution = first(s.solution, s.solution_choice, s.prototype_desc, input.title);
  const audience = first(s.target_audience, s.who_affected, s.prototype_users, "עובדי המחלקה");
  const workflows = items(s.workflows).length ? items(s.workflows) : items(solution).slice(0, 3);
  const success = first(s.success, "חיסכון בזמן עבודה ידני");
  // A "no personal data" answer is left out, so its words ("no phone
  // numbers") don't read as personal data. (\b doesn't work on Hebrew.)
  const denies = /^\s*(לא|אין|ללא|no)(\s|$|,|\.)/i.test(s.personal_data ?? "");
  const answers = Object.entries(s).filter(([k]) => !k.startsWith("_") && !(denies && k === "personal_data"));
  const allText = [input.title, input.rawInput, ...answers.map(([, v]) => v)].join("\n");
  const machine = inferMachineFields(allText, s.systems ?? allText);

  const content = {
    title: input.title,
    branch: input.branch,
    department: input.departmentName,
    submitter: input.submitterName,
    summary: {
      problem,
      solution,
      deliverables: [`כלי פנימי: ${input.title}`, "בעלות תחזוקה מוגדרת ותיעוד תהליך", "מדד הצלחה למעקב מהיום הראשון"],
      phase1: `MVP ל${audience}: ${workflows.slice(0, 3).join("; ")}`,
      phase2: "הרחבה למחלקות נוספות ואינטגרציות שנדחו מה-MVP",
    },
    problem: {
      pains: [{ pain: problem, impact: first(s.who_affected, s.current_workaround, "זמן עבודה ידני וטעויות") }],
      opportunities: [success],
    },
    targetAudience: audience,
    personas: [
      { name: "משתמש/ת קצה", goal: solution, success },
      { name: "מנהל/ת המחלקה", goal: "לראות סטטוס ולקבל החלטות בלי לרדוף אחרי מידע", success: "פחות בירורים ידניים" },
    ],
    workflows,
    userStories: workflows.map((w) => ({ as: audience, want: w, soThat: success })),
    scope: {
      in: workflows,
      out: ["Provisioning אוטומטי של סביבות", "אינטגרציות שלא צוינו בראיון"],
      phase2: ["הרחבה לארגונים נוספים (multi-tenant)", "דשבורד מדדים"],
    },
    functionalRequirements: workflows.map((w, i) => ({ id: `FR-${String(i + 1).padStart(2, "0")}`, text: `המערכת תאפשר: ${w}` })),
    architecture: {
      stack: proto?.provider
        ? [`פרוטוטייפ קיים ב-${proto.provider}`, "מעבר לסטאק הארגוני: Frontend + API בצד השרת + מסד נתונים פנימי"]
        : ["Frontend פנימי", "API בצד השרת", "מסד נתונים פנימי", "SSO ארגוני"],
      flow: ["המשתמש מזין או מעלה מידע", "המערכת מעבדת ומאמתת", ...workflows.slice(0, 2), "התוצאה נשמרת ומוצגת"],
    },
    dataSources: items(s.data_sources),
    kpis: [{ name: success, target: "בסיס ויעד ייקבעו ב-30 הימים הראשונים" }],
    risks: [
      { risk: "אימוץ נמוך", impact: "הכלי לא מחליף את התהליך הידני", mitigation: "פיילוט עם צוות אחד לפני הרחבה" },
      ...(machine.piiCategories.length
        ? [{ risk: "חשיפת מידע אישי", impact: "פגיעה בפרטיות ובאמון", mitigation: "צמצום שדות, הרשאות לפי תפקיד והצפנה" }]
        : []),
    ],
    prototype: proto
      ? { url: proto.externalUrl ?? "", provider: proto.provider ?? "", notes: first(s.gaps) }
      : undefined,
    ...machine,
  };
  return prdContentSchema.parse(content);
}

export const mockProvider: AiProvider = {
  name: "mock",
  start: async (ctx) => startInterview(ctx),
  turn: async (ctx, state, message) => interviewTurn(ctx, state, message),
  synthesize: async (input) => mockSynthesize(input),
  semanticReview: async (content, codeFindings) => mockSemanticReview(content, codeFindings),
  wireframe: async (content) => wireframeFromContent(content),
};
