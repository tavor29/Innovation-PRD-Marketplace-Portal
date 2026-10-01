import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/guard";
import { WizardShell } from "@/components/wizard/wizardshell";
import { branchLabel } from "@/components/ui/badge";

export default async function WizardPage(props: PageProps<"/wizard/[sessionid]">) {
  const user = await requireUser();
  const { sessionid } = await props.params;
  const session = await db.query.wizardSessions.findFirst({ where: eq(schema.wizardSessions.id, sessionid) });
  if (!session) notFound();
  const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, session.submissionId) });
  if (!sub || (sub.submitterId !== user.id && user.role !== "admin")) notFound();
  const messages = await db
    .select({ role: schema.wizardMessages.role, content: schema.wizardMessages.content })
    .from(schema.wizardMessages)
    .where(eq(schema.wizardMessages.sessionId, session.id))
    .orderBy(asc(schema.wizardMessages.createdAt));
  const prd = await db.query.prds.findFirst({ where: eq(schema.prds.submissionId, sub.id) });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-ink-muted">אשף · מסלול {branchLabel[sub.branch]}</p>
        <h1 className="text-2xl font-bold">{sub.title}</h1>
      </div>
      <WizardShell
        sessionId={session.id}
        initialMessages={messages.filter((m) => m.role !== "system") as { role: "user" | "assistant"; content: string }[]}
        initialScore={session.completenessScore}
        initialDone={!session.state._pending && session.completenessScore > 0}
        existingPrdId={prd?.id ?? null}
      />
    </div>
  );
}
