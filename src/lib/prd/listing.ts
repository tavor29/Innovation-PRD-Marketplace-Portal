// Shared query for the marketplace and the review queue: the latest
// published version of each PRD, with its submission, department and author,
// filtered by department, status, risk and track (FR-10).
import { and, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";

export interface ListFilters {
  department?: string;
  status?: string;
  risk?: string;
  branch?: string;
}

const published = ["in_review", "revision_requested", "approved", "assigned", "built", "rejected"] as const;

export async function listPrds(filters: ListFilters, statuses: readonly string[] = published) {
  const where: SQL[] = [inArray(schema.prds.status, statuses as (typeof published)[number][]), ne(schema.prds.status, "draft")];
  if (filters.status && statuses.includes(filters.status)) where.push(eq(schema.prds.status, filters.status as (typeof published)[number]));
  if (filters.risk) where.push(eq(schema.prds.riskLevel, filters.risk as "none"));
  if (filters.branch) where.push(eq(schema.submissions.branch, filters.branch as "idea"));
  if (filters.department) where.push(eq(schema.submissions.departmentId, filters.department));
  // Only the newest version of each submission.
  where.push(
    sql`${schema.prds.version} = (select max(p2.version) from ${schema.prds} p2 where p2.submission_id = ${schema.prds.submissionId} and p2.status <> 'draft')`,
  );

  return db
    .select({
      id: schema.prds.id,
      title: schema.prds.title,
      status: schema.prds.status,
      risk: schema.prds.riskLevel,
      priority: schema.prds.priorityScore,
      version: schema.prds.version,
      publishedAt: schema.prds.publishedAt,
      summary: sql<string>`${schema.prds.contentJson}->'summary'->>'solution'`,
      branch: schema.submissions.branch,
      department: schema.departments.nameHe,
      author: schema.users.fullName,
    })
    .from(schema.prds)
    .innerJoin(schema.submissions, eq(schema.prds.submissionId, schema.submissions.id))
    .leftJoin(schema.departments, eq(schema.submissions.departmentId, schema.departments.id))
    .leftJoin(schema.users, eq(schema.submissions.submitterId, schema.users.id))
    .where(and(...where))
    .orderBy(sql`${schema.prds.priorityScore} desc nulls last`, desc(schema.prds.publishedAt));
}

export async function departmentsList() {
  return db.select({ id: schema.departments.id, name: schema.departments.nameHe }).from(schema.departments);
}
