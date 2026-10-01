// The interview flow. It decides what to ask next, catches shallow answers
// (FR-21), proposes solution patterns on the problem track (FR-32) and reads
// prototype links (FR-33). The flow is deterministic; a real model only
// changes how questions are phrased, never which field is being filled.
import {
  completeness,
  fieldsByBranch,
  followedKey,
  isShallow,
  nextField,
  shallowKey,
  type WizardField,
} from "./scorer";
import type { WizardContext, WizardState, WizardTurn } from "./types";

const PENDING = "_pending";
const PATTERNS = "_patterns";

const trackIntro: Record<WizardContext["branch"], string> = {
  idea: "נתחיל מהפתרון שאת/ה מדמיין/ת, ואז נשלים את מה שחסר ל-PRD.",
  problem: "נתחיל מהבעיה. אחרי שאבין אותה אציע אחד או שניים כיווני פתרון.",
  prototype: "נתחיל מהפרוטוטייפ שכבר בנית, ונשלים את מה שצריך כדי להעביר אותו לפרודקשן.",
};

/** FR-32: one or two realistic solution patterns, from what the problem sounds like. */
export function solutionPatterns(text: string): string[] {
  const t = text.toLowerCase();
  const patterns: string[] = [];
  if (/אקסל|excel|ידני|העתק|הקלד|copy/.test(t)) patterns.push("אוטומציה שמעבירה את הנתונים בין המערכות במקום ההעתקה הידנית");
  if (/דוח|דיווח|report|סטטוס|לראות/.test(t)) patterns.push("דשבורד שמתעדכן לבד ומחליף את הדוח הידני");
  if (/בקש|פני|מייל|email|טופס|אישור/.test(t)) patterns.push("טופס פניות אחד עם ניתוב ואישור אוטומטי לגורם הנכון");
  if (/חיפוש|למצוא|מסמך|נוהל|ידע|שאלות/.test(t)) patterns.push("עוזר חיפוש שעונה על שאלות מתוך המסמכים והנהלים הקיימים");
  if (patterns.length === 0) patterns.push("טופס אחד עם תהליך אישור מסודר", "דשבורד שמרכז את המידע במקום אחד");
  return patterns.slice(0, 2);
}

/** FR-33: what a prototype link tells us before the user says anything. */
export function describePrototype(ctx: WizardContext): string | null {
  const link = ctx.attachments.find((a) => a.externalUrl);
  if (!link) return null;
  const tool = link.provider && link.provider !== "other" ? link.provider : "כלי לא מזוהה";
  const title = typeof link.metadata?.title === "string" ? ` ("${link.metadata.title}")` : "";
  return `זיהיתי פרוטוטייפ שנבנה ב-${tool}${title}. אשלים ממנו מה שאפשר, ואשאל רק על מה שחסר.`;
}

function ask(field: WizardField, state: WizardState): string {
  if (field.id === "solution_choice") {
    const options = JSON.parse(state[PATTERNS] ?? "[]") as string[];
    return [
      "תודה, עכשיו הבעיה ברורה. הנה שני כיוונים ריאליים:",
      ...options.map((o, i) => `${i + 1}. ${o}`),
      "איזה מהם מתאים יותר? אפשר גם לתאר כיוון אחר.",
    ].join("\n");
  }
  return field.question;
}

function result(ctx: WizardContext, state: WizardState, reply: string, shallow: boolean): WizardTurn {
  const next = nextField(ctx.branch, state);
  const done = !next;
  return { reply, state, shallow, completeness: completeness(ctx.branch, state), done };
}

export function startInterview(ctx: WizardContext): WizardTurn {
  const state: WizardState = {};
  // The free-text description on the submit form answers the first question.
  const first = fieldsByBranch[ctx.branch][0];
  const lines = [`שלום! ${trackIntro[ctx.branch]}`];
  const proto = ctx.branch === "prototype" ? describePrototype(ctx) : null;
  if (proto) lines.push(proto);
  if (ctx.rawInput.trim()) {
    state[first.id] = ctx.rawInput.trim();
    if (isShallow(first, ctx.rawInput)) state[shallowKey(first.id)] = "1";
    lines.push("קראתי את התיאור ששלחת.");
  }
  const next = nextField(ctx.branch, state)!;
  if (next.id === "solution_choice") state[PATTERNS] = JSON.stringify(solutionPatterns(Object.values(state).join(" ")));
  state[PENDING] = next.id;
  lines.push(ask(next, state));
  return result(ctx, state, lines.join("\n\n"), false);
}

export function interviewTurn(ctx: WizardContext, prev: WizardState, message: string): WizardTurn {
  const state = { ...prev };
  const fields = fieldsByBranch[ctx.branch];
  const field = fields.find((f) => f.id === state[PENDING]) ?? nextField(ctx.branch, state);
  if (!field) return result(ctx, state, "יש לי את כל מה שצריך. אפשר להפיק את ה-PRD.", false);

  let answer = message.trim();
  if (field.id === "solution_choice") {
    const options = JSON.parse(state[PATTERNS] ?? "[]") as string[];
    const pick = answer.match(/^\s*([12])\b/);
    if (pick && options[Number(pick[1]) - 1]) answer = options[Number(pick[1]) - 1];
  }

  const shallow = isShallow(field, message);
  const alreadyFollowed = !!state[followedKey(field.id)];
  state[field.id] = state[field.id] && alreadyFollowed ? `${state[field.id]} ${answer}` : answer;

  if (shallow && !alreadyFollowed) {
    // One focused follow-up, then move on either way.
    state[shallowKey(field.id)] = "1";
    state[followedKey(field.id)] = "1";
    return result(ctx, state, `${field.followUp}`, true);
  }
  if (shallow) state[shallowKey(field.id)] = "1";
  else delete state[shallowKey(field.id)];

  const next = nextField(ctx.branch, state);
  if (!next) {
    delete state[PENDING];
    return result(
      ctx,
      state,
      "מצוין, יש לי מספיק כדי לכתוב PRD מלא עם מטריצת אבטחה ו-wireframe. לחץ/י על \"הפקת PRD\".",
      false,
    );
  }
  if (next.id === "solution_choice") state[PATTERNS] = JSON.stringify(solutionPatterns(Object.values(state).join(" ")));
  state[PENDING] = next.id;
  return result(ctx, state, ask(next, state), false);
}
