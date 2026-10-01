// Data model, PRD section 8. Status and enum values follow 8.3 exactly.
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  date,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["submitter", "manager", "dev", "admin"]);
export const branchEnum = pgEnum("branch", ["idea", "problem", "prototype"]);
export const submissionStatusEnum = pgEnum("submission_status", ["draft", "in_wizard", "synthesized"]);
export const prdStatusEnum = pgEnum("prd_status", [
  "draft",
  "in_review",
  "revision_requested",
  "approved",
  "assigned",
  "built",
  "rejected",
]);
export const riskLevelEnum = pgEnum("risk_level", ["none", "low", "medium", "high", "blocked"]);
export const ruleTypeEnum = pgEnum("rule_type", ["hard_ban", "requires_mitigation", "advisory"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high", "critical"]);
export const flagStatusEnum = pgEnum("flag_status", ["open", "mitigated", "accepted_risk", "waived"]);
export const flagSourceEnum = pgEnum("flag_source", ["code", "llm"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const attachmentKindEnum = pgEnum("attachment_kind", ["file", "link"]);
export const commentKindEnum = pgEnum("comment_kind", ["comment", "revision_request", "system"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["assigned", "in_progress", "done"]);

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en").notNull(),
  managerId: uuid("manager_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  role: roleEnum("role").notNull().default("submitter"),
  isActive: boolean("is_active").notNull().default(true),
  passwordHash: text("password_hash"),
});

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submitterId: uuid("submitter_id")
      .notNull()
      .references(() => users.id),
    departmentId: uuid("department_id").references(() => departments.id),
    branch: branchEnum("branch").notNull(),
    title: text("title").notNull(),
    rawInput: text("raw_input").notNull(),
    status: submissionStatusEnum("status").notNull().default("draft"),
    createdAt: created(),
  },
  (t) => [index("submissions_submitter_idx").on(t.submitterId)],
);

export const wizardSessions = pgTable("wizard_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  branch: branchEnum("branch").notNull(),
  /** Answers collected so far, keyed by wizard field id (lib/ai/wizard.ts). */
  state: jsonb("state").$type<Record<string, string>>().notNull().default({}),
  completenessScore: integer("completeness_score").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const wizardMessages = pgTable("wizard_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => wizardSessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  createdAt: created(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  kind: attachmentKindEnum("kind").notNull(),
  storagePath: text("storage_path"),
  externalUrl: text("external_url"),
  provider: text("provider"),
  extractedMetadata: jsonb("extracted_metadata").$type<Record<string, unknown>>(),
});

export const prds = pgTable(
  "prds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    /** Versions are immutable: a revision request creates version + 1. */
    version: integer("version").notNull().default(1),
    title: text("title").notNull(),
    contentJson: jsonb("content_json").notNull(),
    contentMd: text("content_md").notNull(),
    status: prdStatusEnum("status").notNull().default("draft"),
    riskLevel: riskLevelEnum("risk_level").notNull().default("none"),
    priorityScore: integer("priority_score"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [uniqueIndex("prds_submission_version_idx").on(t.submissionId, t.version)],
);

export const policyRules = pgTable("policy_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  titleHe: text("title_he").notNull(),
  category: text("category").notNull(),
  severity: severityEnum("severity").notNull(),
  type: ruleTypeEnum("type").notNull(),
  /** Machine-checkable condition over the PRD's content_json (lib/policy/types.ts). */
  detector: jsonb("detector").notNull(),
  mitigationTemplateMd: text("mitigation_template_md").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
});

export const securityFlags = pgTable("security_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  prdId: uuid("prd_id")
    .notNull()
    .references(() => prds.id, { onDelete: "cascade" }),
  ruleCode: text("rule_code").notNull(),
  ruleType: ruleTypeEnum("rule_type").notNull(),
  severity: severityEnum("severity").notNull(),
  evidence: text("evidence").notNull(),
  mitigationMd: text("mitigation_md").notNull().default(""),
  status: flagStatusEnum("status").notNull().default("open"),
  source: flagSourceEnum("source").notNull().default("code"),
  waivedBy: uuid("waived_by").references(() => users.id),
  waivedReason: text("waived_reason"),
});

export const wireframes = pgTable("wireframes", {
  id: uuid("id").primaryKey().defaultRandom(),
  prdId: uuid("prd_id")
    .notNull()
    .references(() => prds.id, { onDelete: "cascade" }),
  specJson: jsonb("spec_json").notNull(),
  imagePath: text("image_path"),
  createdAt: created(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  prdId: uuid("prd_id")
    .notNull()
    .references(() => prds.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id),
  parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  kind: commentKindEnum("kind").notNull().default("comment"),
  createdAt: created(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  prdId: uuid("prd_id")
    .notNull()
    .references(() => prds.id, { onDelete: "cascade" }),
  assigneeId: uuid("assignee_id")
    .notNull()
    .references(() => users.id),
  assignedBy: uuid("assigned_by")
    .notNull()
    .references(() => users.id),
  dueDate: date("due_date"),
  status: assignmentStatusEnum("status").notNull().default("assigned"),
  createdAt: created(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  diff: jsonb("diff"),
  createdAt: created(),
});

export type User = typeof users.$inferSelect;
export type Prd = typeof prds.$inferSelect;
export type PolicyRule = typeof policyRules.$inferSelect;
export type SecurityFlag = typeof securityFlags.$inferSelect;
