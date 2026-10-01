// The PRD as structured JSON (FR-34). The synthesizer must produce exactly
// this; Markdown is rendered from it (lib/prd/render.ts), never written by
// hand. The machine-checkable fields at the bottom are what the policy
// engine reads, so policy never depends on parsing prose.
import { z } from "zod";

export const integrationIds = [
  "email",
  "calendar",
  "chat",
  "crm",
  "erp",
  "hr_system",
  "finance_system",
  "endpoint_management",
  "directory",
  "document_store",
  "external_ai",
  "internal_db",
  "public_web",
] as const;

export const writeTargetIds = [
  "internal_db",
  "directory",
  "endpoint_management",
  "finance_system",
  "hr_system",
  "external_saas",
  "documents",
] as const;

export const dataAccessPatterns = ["backend_api", "frontend_sql", "direct_db_read", "none"] as const;
export const authModels = ["sso", "shared_password", "none"] as const;
export const piiCategoryIds = ["contact", "national_id", "health", "financial", "salary", "location"] as const;

const text = z.string().trim().min(1);

export const prdContentSchema = z.object({
  title: text,
  branch: z.enum(["idea", "problem", "prototype"]),
  department: z.string().default(""),
  submitter: z.string().default(""),
  summary: z.object({
    problem: text,
    solution: text,
    deliverables: z.array(text).min(1),
    phase1: text,
    phase2: z.string().default(""),
  }),
  problem: z.object({
    pains: z.array(z.object({ pain: text, impact: text })).min(1),
    opportunities: z.array(text).default([]),
  }),
  targetAudience: text,
  personas: z.array(z.object({ name: text, goal: text, success: text })).min(1),
  workflows: z.array(text).min(1),
  userStories: z.array(z.object({ as: text, want: text, soThat: text })).min(1),
  scope: z.object({
    in: z.array(text).min(1),
    out: z.array(text).default([]),
    phase2: z.array(text).default([]),
  }),
  functionalRequirements: z.array(z.object({ id: text, text })).min(1),
  architecture: z.object({
    stack: z.array(text).default([]),
    flow: z.array(text).min(1),
  }),
  dataSources: z.array(text).default([]),
  kpis: z.array(z.object({ name: text, target: text })).default([]),
  risks: z.array(z.object({ risk: text, impact: text, mitigation: text })).default([]),
  prototype: z
    .object({ url: z.string().default(""), provider: z.string().default(""), notes: z.string().default("") })
    .optional(),

  // Machine-checkable fields for the policy engine.
  integrations: z.array(z.enum(integrationIds)).default([]),
  writeTargets: z.array(z.enum(writeTargetIds)).default([]),
  dataAccessPattern: z.enum(dataAccessPatterns).default("backend_api"),
  authModel: z.enum(authModels).default("sso"),
  piiCategories: z.array(z.enum(piiCategoryIds)).default([]),
});

export type PrdContent = z.infer<typeof prdContentSchema>;

/** Hebrew labels for the machine fields, used in the PRD and the security matrix. */
export const machineLabels: Record<string, string> = {
  email: "דואר אלקטרוני",
  calendar: "יומן",
  chat: "צ'אט ארגוני",
  crm: "CRM",
  erp: "ERP",
  hr_system: "מערכת משאבי אנוש",
  finance_system: "מערכת כספים",
  endpoint_management: "מערכת ניהול תחנות קצה",
  directory: "ספריית המשתמשים הארגונית",
  document_store: "מאגר מסמכים",
  external_ai: "שירות AI חיצוני",
  internal_db: "מסד נתונים פנימי",
  public_web: "אתר ציבורי",
  external_saas: "שירות SaaS חיצוני",
  documents: "מסמכים",
  backend_api: "דרך API בצד השרת",
  frontend_sql: "SQL ישיר מצד הלקוח",
  direct_db_read: "קריאה ישירה ממסד הנתונים",
  none: "ללא",
  sso: "SSO ארגוני",
  shared_password: "סיסמה משותפת",
  contact: "פרטי קשר",
  national_id: "מספר תעודת זהות",
  health: "מידע רפואי",
  financial: "מידע פיננסי",
  salary: "נתוני שכר",
  location: "מיקום",
};
