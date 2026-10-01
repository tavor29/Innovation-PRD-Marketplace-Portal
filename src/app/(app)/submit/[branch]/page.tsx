import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { SubmitForm } from "@/components/submit/submitform";
import { branchLabel } from "@/components/ui/badge";

export default async function SubmitBranch(props: PageProps<"/submit/[branch]">) {
  await requireUser(["submitter", "manager", "admin"]);
  const { branch } = await props.params;
  if (branch !== "idea" && branch !== "problem" && branch !== "prototype") notFound();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm text-ink-muted">מסלול: {branchLabel[branch]}</p>
        <h1 className="text-2xl font-bold">ספר/י בכמה מילים</h1>
        <p className="text-ink-muted">אחר כך האשף ישאל שאלות המשך ממוקדות. לא צריך לנסח מושלם.</p>
      </div>
      <SubmitForm branch={branch} />
    </div>
  );
}
