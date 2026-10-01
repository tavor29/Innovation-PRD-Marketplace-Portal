// Seed policy rules (PRD 2.3, 7.3). After seeding they live in the
// policy_rules table and an admin edits them in the UI; this file is only the
// starting set. System names are generic on purpose.
import type { RuleInput } from "./types";

export const seedRules: RuleInput[] = [
  {
    code: "HB-01",
    titleHe: "גישה ישירה למערכת ניהול תחנות קצה",
    type: "hard_ban",
    severity: "critical",
    detector: {
      any: [
        { field: "integrations", op: "includes_any", values: ["endpoint_management"] },
        { field: "writeTargets", op: "includes_any", values: ["endpoint_management"] },
      ],
    },
    mitigationTemplateMd:
      "חסום. אפליקציה של אזרח-מפתח לא ניגשת ישירות למערכת ניהול תחנות הקצה ({{evidence}}). **מעקף מוצע:** לפתוח קריאה לצוות ה-IT, או לצרוך דוח מוכן שהצוות מייצא.",
    isActive: true,
  },
  {
    code: "HB-02",
    titleHe: "כתיבה ישירה לספריית המשתמשים הארגונית",
    type: "hard_ban",
    severity: "critical",
    detector: { field: "writeTargets", op: "includes_any", values: ["directory"] },
    mitigationTemplateMd:
      "חסום. שינוי משתמשים, קבוצות או הרשאות בספרייה הארגונית נעשה רק בתהליך IT מבוקר ({{evidence}}). **מעקף מוצע:** קריאה בלבד דרך API מאושר, ובקשת שינוי דרך מערכת הקריאות.",
    isActive: true,
  },
  {
    code: "HB-03",
    titleHe: "כתיבת SQL ישירה מצד הלקוח",
    type: "hard_ban",
    severity: "critical",
    detector: { field: "dataAccessPattern", op: "equals_any", values: ["frontend_sql"] },
    mitigationTemplateMd:
      "חסום. שאילתות SQL מהדפדפן חושפות את מסד הנתונים ({{evidence}}). **מעקף מוצע:** שכבת API בצד השרת עם הרשאות והגבלת קצב.",
    isActive: true,
  },
  {
    code: "MT-01",
    titleHe: "עיבוד מידע אישי רגיש",
    type: "requires_mitigation",
    severity: "high",
    detector: { field: "piiCategories", op: "includes_any", values: ["national_id", "health", "salary", "financial"] },
    mitigationTemplateMd:
      "דורש מיטיגציה ({{evidence}}). **נדרש:** צמצום נתונים למינימום, הצפנה במנוחה, הרשאות לפי תפקיד, ואישור קצין הגנת הפרטיות לפני פרודקשן.",
    isActive: true,
  },
  {
    code: "MT-02",
    titleHe: "שליחת מידע אישי לשירות AI חיצוני",
    type: "requires_mitigation",
    severity: "high",
    detector: {
      all: [
        { field: "integrations", op: "includes_any", values: ["external_ai"] },
        { field: "piiCategories", op: "nonempty" },
      ],
    },
    mitigationTemplateMd:
      "דורש מיטיגציה ({{evidence}}). **נדרש:** שימוש רק בספק AI מאושר עם הסכם עיבוד נתונים, והסרת מזהים אישיים לפני השליחה.",
    isActive: true,
  },
  {
    code: "MT-03",
    titleHe: "כתיבה למערכת כספים או משאבי אנוש",
    type: "requires_mitigation",
    severity: "medium",
    detector: { field: "writeTargets", op: "includes_any", values: ["finance_system", "hr_system"] },
    mitigationTemplateMd:
      "דורש מיטיגציה ({{evidence}}). **נדרש:** כתיבה דרך API רשמי בלבד, יומן ביקורת לכל שינוי, ואישור בעל המערכת.",
    isActive: true,
  },
  {
    code: "MT-04",
    titleHe: "גישה ללא אימות ארגוני",
    type: "requires_mitigation",
    severity: "medium",
    detector: { field: "authModel", op: "equals_any", values: ["none", "shared_password"] },
    mitigationTemplateMd: "דורש מיטיגציה ({{evidence}}). **נדרש:** התחברות דרך ה-SSO הארגוני.",
    isActive: true,
  },
  {
    code: "AD-01",
    titleHe: "חשיפה לרשת הציבורית",
    type: "advisory",
    severity: "low",
    detector: { field: "integrations", op: "includes_any", values: ["public_web"] },
    mitigationTemplateMd: "המלצה ({{evidence}}): לוודא שאין מידע פנימי בעמודים ציבוריים, ולהגדיר הגבלת קצב.",
    isActive: true,
  },
  {
    code: "AD-02",
    titleHe: "פרטי קשר של אנשים",
    type: "advisory",
    severity: "low",
    detector: { field: "piiCategories", op: "includes_any", values: ["contact"] },
    mitigationTemplateMd: "המלצה ({{evidence}}): לשמור רק את השדות הנחוצים ולהגדיר מדיניות מחיקה.",
    isActive: true,
  },
];
