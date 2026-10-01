// Assignments: managers see all of them; builders see their own and move
// them along (assigned → in progress → done, which marks the PRD built).
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/guard";
import { AssignmentStatus } from "@/components/manager/assignmentstatus";
import { RiskBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function Assignments() {
  const user = await requireUser(["manager", "admin", "dev"]);
  const base = db
    .select({
      id: schema.assignments.id,
      status: schema.assignments.status,
      dueDate: schema.assignments.dueDate,
      prdId: schema.prds.id,
      title: schema.prds.title,
      risk: schema.prds.riskLevel,
      priority: schema.prds.priorityScore,
      assignee: schema.users.fullName,
      assigneeId: schema.assignments.assigneeId,
    })
    .from(schema.assignments)
    .innerJoin(schema.prds, eq(schema.assignments.prdId, schema.prds.id))
    .leftJoin(schema.users, eq(schema.assignments.assigneeId, schema.users.id))
    .orderBy(desc(schema.assignments.createdAt));
  const rows = user.role === "dev" ? await base.where(eq(schema.assignments.assigneeId, user.id)) : await base;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{user.role === "dev" ? "ה-PRDs שהוקצו לי" : "הקצאות"}</h1>
        <p className="text-ink-muted">
          {user.role === "dev" ? "כל PRD כולל מטריצת אבטחה ו-wireframe. עדכן/י סטטוס כשמתקדמים." : "מי בונה מה, ועד מתי."}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-ink-rule bg-white p-6 text-center text-ink-muted">אין הקצאות עדיין.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-ink-rule bg-white p-4">
              <Link href={`/prd/${a.prdId}`} className="font-bold hover:underline">
                {a.title}
              </Link>
              <RiskBadge risk={a.risk} />
              <span className="text-sm text-ink-muted">
                {a.assignee} {a.dueDate ? `· עד ${formatDate(a.dueDate)}` : ""} {a.priority !== null ? `· עדיפות ${a.priority}` : ""}
              </span>
              <span className="ms-auto">
                <AssignmentStatus id={a.id} status={a.status} canChange={user.role !== "dev" || a.assigneeId === user.id} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
