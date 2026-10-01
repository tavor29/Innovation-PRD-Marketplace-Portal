// Dashboard: my submissions and where each one stands (PRD 9.1).
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/guard";
import { Card } from "@/components/ui/card";
import { Badge, RiskBadge, StatusBadge, branchLabel } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function Dashboard(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { denied } = await props.searchParams;
  const subs = await db
    .select()
    .from(schema.submissions)
    .where(eq(schema.submissions.submitterId, user.id))
    .orderBy(desc(schema.submissions.createdAt));
  const ids = subs.map((s) => s.id);
  const sessions = ids.length ? await db.select().from(schema.wizardSessions).where(inArray(schema.wizardSessions.submissionId, ids)) : [];
  const prds = ids.length
    ? await db.select().from(schema.prds).where(inArray(schema.prds.submissionId, ids)).orderBy(desc(schema.prds.version))
    : [];

  return (
    <div className="flex flex-col gap-6">
      {denied && (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-status-warning/60 bg-status-warning/15 p-3 text-sm">
          לתפקיד שלך אין גישה לעמוד הזה.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ההגשות שלי</h1>
          <p className="text-ink-muted">כל רעיון, בעיה או פרוטוטייפ שהגשת, והסטטוס שלו.</p>
        </div>
        <Link href="/submit" className={buttonVariants()}>
          הגשה חדשה
        </Link>
      </div>

      {subs.length === 0 ? (
        <Card className="text-center">
          <p className="mb-4">עוד לא הגשת כלום.</p>
          <Link href="/submit" className={buttonVariants()}>
            להגשה הראשונה
          </Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {subs.map((s) => {
            const prd = prds.find((p) => p.submissionId === s.id);
            const session = sessions.find((x) => x.submissionId === s.id);
            const href = prd ? `/prd/${prd.id}` : session ? `/wizard/${session.id}` : "#";
            return (
              <li key={s.id}>
                <Link href={href} className="block rounded-[var(--radius-md)] border border-ink-rule bg-white p-4 hover:border-ink">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{s.title}</span>
                    <Badge>{branchLabel[s.branch]}</Badge>
                    {prd ? (
                      <>
                        <StatusBadge status={prd.status} />
                        <RiskBadge risk={prd.riskLevel} />
                        <span className="text-xs text-ink-muted">גרסה {prd.version}</span>
                      </>
                    ) : (
                      <Badge tone="info">בראיון · {session?.completenessScore ?? 0}%</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">הוגש {formatDate(s.createdAt)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
