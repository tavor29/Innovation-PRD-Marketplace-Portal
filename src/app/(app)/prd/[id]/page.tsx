import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/roles";
import { PrdWorkspace } from "@/components/prd/prdworkspace";
import type { WireframeSpec } from "@/lib/ai/types";
import type { PrdContent } from "@/lib/prd/schema";

export default async function PrdPage(props: PageProps<"/prd/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const prd = await db.query.prds.findFirst({ where: eq(schema.prds.id, id) });
  if (!prd) notFound();
  const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, prd.submissionId) });
  if (!sub) notFound();
  const isOwner = sub.submitterId === user.id;
  // Drafts are private to their author; published versions are visible to everyone in the portal.
  if (prd.status === "draft" && !isOwner && user.role !== "admin") notFound();

  const [flags, wireframe, comments, versions, history, assignment, devs, author] = await Promise.all([
    db.select().from(schema.securityFlags).where(eq(schema.securityFlags.prdId, prd.id)),
    db.select().from(schema.wireframes).where(eq(schema.wireframes.prdId, prd.id)).orderBy(desc(schema.wireframes.createdAt)).limit(1),
    db
      .select({ id: schema.comments.id, body: schema.comments.body, kind: schema.comments.kind, createdAt: schema.comments.createdAt, author: schema.users.fullName })
      .from(schema.comments)
      .leftJoin(schema.users, eq(schema.comments.authorId, schema.users.id))
      .where(eq(schema.comments.prdId, prd.id))
      .orderBy(asc(schema.comments.createdAt)),
    db
      .select({ id: schema.prds.id, version: schema.prds.version, status: schema.prds.status })
      .from(schema.prds)
      .where(eq(schema.prds.submissionId, prd.submissionId))
      .orderBy(desc(schema.prds.version)),
    db
      .select({ action: schema.auditLog.action, diff: schema.auditLog.diff, createdAt: schema.auditLog.createdAt, actor: schema.users.fullName })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.auditLog.actorId, schema.users.id))
      .where(and(eq(schema.auditLog.entityType, "prd"), eq(schema.auditLog.entityId, prd.id)))
      .orderBy(desc(schema.auditLog.createdAt)),
    db
      .select({ id: schema.assignments.id, dueDate: schema.assignments.dueDate, status: schema.assignments.status, assignee: schema.users.fullName })
      .from(schema.assignments)
      .leftJoin(schema.users, eq(schema.assignments.assigneeId, schema.users.id))
      .where(eq(schema.assignments.prdId, prd.id))
      .limit(1),
    can.assign(user.role)
      ? db.select({ id: schema.users.id, name: schema.users.fullName }).from(schema.users).where(eq(schema.users.role, "dev"))
      : Promise.resolve([]),
    db.select({ name: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, sub.submitterId)),
  ]);

  return (
    <PrdWorkspace
      prd={{
        id: prd.id,
        title: prd.title,
        version: prd.version,
        status: prd.status,
        riskLevel: prd.riskLevel,
        priorityScore: prd.priorityScore,
        contentMd: prd.contentMd,
        content: prd.contentJson as PrdContent,
        branch: sub.branch,
        author: author[0]?.name ?? "",
      }}
      flags={flags.map((f) => ({ ...f, waivedBy: undefined }))}
      wireframe={(wireframe[0]?.specJson as WireframeSpec) ?? null}
      comments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      versions={versions}
      history={history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() }))}
      assignment={assignment[0] ?? null}
      devs={devs}
      viewer={{ role: user.role, isOwner }}
    />
  );
}
