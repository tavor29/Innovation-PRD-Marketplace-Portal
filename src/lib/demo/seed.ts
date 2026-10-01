// Demo data for the fictional company Meridian Dynamics: departments, one
// user per role (password "password123", PRD README), the seed policy rules,
// and a few submissions already at different stages so the marketplace and
// review queue aren't empty. Wipes everything first. Used by `npm run
// db:seed` and by the nightly reset of the public demo (/api/demo/reset).
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { seedRules } from "../policy/rules";
import { getAi } from "../ai/registry";
import { generatePrd } from "../prd/generate";

export async function seedDemo(log: (msg: string) => void = () => {}) {
  await db.execute(
    sql`truncate audit_log, assignments, comments, wireframes, security_flags, prds, attachments, wizard_messages, wizard_sessions, submissions, policy_rules, users, departments restart identity cascade`,
  );

  const depts = await db
    .insert(schema.departments)
    .values([
      { nameHe: "תפעול", nameEn: "Operations" },
      { nameHe: "משאבי אנוש", nameEn: "People" },
      { nameHe: "כספים", nameEn: "Finance" },
      { nameHe: "מחקר ופיתוח", nameEn: "R&D" },
    ])
    .returning();
  const dept = (en: string) => depts.find((d) => d.nameEn === en)!.id;

  const passwordHash = await bcrypt.hash("password123", 10);
  const people = await db
    .insert(schema.users)
    .values([
      { email: "submitter@meridian.demo", fullName: "נועה לוי", role: "submitter", departmentId: dept("Operations"), passwordHash },
      { email: "manager@meridian.demo", fullName: "אבי כהן", role: "manager", departmentId: dept("Operations"), passwordHash },
      { email: "dev@meridian.demo", fullName: "מאיה פרץ", role: "dev", departmentId: dept("R&D"), passwordHash },
      { email: "admin@meridian.demo", fullName: "יוסי מזרחי", role: "admin", departmentId: dept("R&D"), passwordHash },
      { email: "people.submitter@meridian.demo", fullName: "רון אברהם", role: "submitter", departmentId: dept("People"), passwordHash },
      { email: "finance.submitter@meridian.demo", fullName: "שירה גל", role: "submitter", departmentId: dept("Finance"), passwordHash },
    ])
    .returning();
  const user = (email: string) => people.find((p) => p.email === email)!;
  await db.update(schema.departments).set({ managerId: user("manager@meridian.demo").id }).where(eq(schema.departments.id, dept("Operations")));

  await db.insert(schema.policyRules).values(
    seedRules.map((r) => ({
      code: r.code,
      titleHe: r.titleHe,
      category: r.type === "hard_ban" ? "חסימות" : r.type === "requires_mitigation" ? "מיטיגציה" : "המלצות",
      severity: r.severity,
      type: r.type,
      detector: r.detector,
      mitigationTemplateMd: r.mitigationTemplateMd,
      isActive: r.isActive,
    })),
  );

  // Example submissions, run through the real interview and generator.
  type Example = {
    by: string;
    branch: "idea" | "problem" | "prototype";
    title: string;
    raw: string;
    link?: { url: string; provider: string; label: string; title: string };
    answers: string[];
    status?: "in_review" | "approved" | "assigned";
    priority?: number;
  };

  const examples: Example[] = [
    {
      by: "submitter@meridian.demo",
      branch: "idea",
      title: "מעקב בקשות רכש",
      raw: "טופס אחד לבקשות רכש עם אישור מנהל ומעקב סטטוס, במקום שרשורי מיילים שאף אחד לא מוצא",
      answers: [
        "בקשות רכש מגיעות במייל ונאבדות. כל בקשה לוקחת בממוצע חמישה ימים ואין דרך לדעת איפה היא עומדת",
        "כ-40 עובדי התפעול ומנהלי הצוותים שמאשרים",
        "העובד ממלא טופס בקשה, המנהל מאשר או דוחה, צוות הרכש מקבל הודעה ומעדכן סטטוס",
        "רשימת הספקים המאושרים מקובץ אקסל של הרכש",
        "רק קריאה מהרשימה, בלי כתיבה למערכות אחרות",
        "לא, רק שמות העובדים שמגישים",
        "זמן אישור ממוצע יורד מחמישה ימים ליומיים, ופחות מיילים של 'מה הסטטוס'",
      ],
      status: "approved",
      priority: 80,
    },
    {
      by: "people.submitter@meridian.demo",
      branch: "prototype",
      title: "בוט שאלות על נהלי משאבי אנוש",
      raw: "בניתי ב-Lovable בוט שעונה לעובדים על שאלות מתוך מסמכי הנהלים: חופשות, הוצאות, עבודה מהבית",
      link: { url: "https://hr-policy-bot.lovable.app", provider: "lovable", label: "Lovable", title: "hr policy bot" },
      answers: [
        "צוות משאבי אנוש, שישה אנשים, משתמש בו היום. בפרודקשן הוא אמור לשרת את כל העובדים",
        "מסמכי הנהלים ב-SharePoint",
        "רק קריאה מהמסמכים",
        "כן, בחלק מהמסמכים יש מספרי תעודת זהות ונתוני שכר לדוגמה. הבוט משתמש במודל AI חיצוני",
        "הרשאות לפי מחלקה, חיבור ל-SSO, ומי מעדכן את המסמכים כשנוהל משתנה",
        "פחות פניות חוזרות למשאבי אנוש על אותן שאלות",
      ],
      status: "in_review",
    },
    {
      by: "finance.submitter@meridian.demo",
      branch: "problem",
      title: "סגירת חודש בכספים",
      raw: "בכל סוף חודש אנחנו מעתיקים ידנית נתונים מאקסל לדוח לחשבונות, וזה לוקח יומיים ומלא טעויות",
      answers: [
        "צוות הכספים, חמישה אנשים, כל סוף חודש",
        "מעתיקים מאקסל, בודקים בעיניים, שולחים במייל למנהלת הכספים",
        "1",
        "מייצאים את נתוני החודש, המערכת מאחדת אותם לדוח, מנהלת הכספים מאשרת",
        "קבצי האקסל של הצוות ומערכת הכספים",
        "הכלי צריך לעדכן את מערכת הכספים עם הסכומים המאושרים, ולהריץ SQL ישירות מהדפדפן כדי לחסוך שרת",
        "לא",
        "סגירת חודש ביום אחד במקום יומיים",
      ],
    },
  ];

  const ai = getAi();
  for (const ex of examples) {
    const u = user(ex.by);
    const [sub] = await db
      .insert(schema.submissions)
      .values({ submitterId: u.id, departmentId: u.departmentId, branch: ex.branch, title: ex.title, rawInput: ex.raw, status: "in_wizard" })
      .returning();
    const attachments = ex.link
      ? [{ provider: ex.link.label, externalUrl: ex.link.url, metadata: { title: ex.link.title } }]
      : [];
    if (ex.link) {
      await db.insert(schema.attachments).values({ submissionId: sub.id, kind: "link", externalUrl: ex.link.url, provider: ex.link.provider, extractedMetadata: { title: ex.link.title } });
    }
    const ctx = { branch: ex.branch, title: ex.title, rawInput: ex.raw, attachments };
    let turn = await ai.start(ctx);
    const [session] = await db.insert(schema.wizardSessions).values({ submissionId: sub.id, branch: ex.branch, state: turn.state, completenessScore: turn.completeness }).returning();
    const messages: { role: "user" | "assistant"; content: string }[] = [{ role: "assistant", content: turn.reply }];
    for (const a of ex.answers) {
      turn = await ai.turn(ctx, turn.state, a);
      messages.push({ role: "user", content: a }, { role: "assistant", content: turn.reply });
    }
    await db.insert(schema.wizardMessages).values(messages.map((m) => ({ sessionId: session.id, ...m })));
    await db.update(schema.wizardSessions).set({ state: turn.state, completenessScore: turn.completeness }).where(eq(schema.wizardSessions.id, session.id));

    const prdId = await generatePrd(session.id, u.id);
    if (ex.status) {
      await db.update(schema.prds).set({ status: ex.status, publishedAt: new Date(), priorityScore: ex.priority ?? null }).where(eq(schema.prds.id, prdId));
    }
    log(`seeded: ${ex.title} (${turn.completeness}% complete, ${ex.status ?? "draft"})`);
  }
}
