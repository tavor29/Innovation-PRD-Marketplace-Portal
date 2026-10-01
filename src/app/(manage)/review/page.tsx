// FR-10 / FR-04: the review queue, filtered to the manager's own department
// by default.
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { departmentsList, listPrds } from "@/lib/prd/listing";
import { FilterBar } from "@/components/marketplace/filterbar";
import { RiskBadge, StatusBadge, branchLabel } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function ReviewQueue(props: PageProps<"/review">) {
  const user = await requireUser(["manager", "admin"]);
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  // Default to my department; "?department=" (all) is a deliberate choice.
  const department = "department" in sp ? one("department") : user.departmentId;
  const [rows, departments] = await Promise.all([
    listPrds({ department, status: one("status"), risk: one("risk"), branch: one("branch") }, ["in_review", "revision_requested"]),
    departmentsList(),
  ]);
  const mine = departments.find((d) => d.id === department);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">תור סקירה</h1>
          <p className="text-ink-muted">{mine ? `מחלקת ${mine.name}` : "כל המחלקות"} · PRDs שמחכים להחלטה</p>
        </div>
        {mine && (
          <Link href="/review?department=" className="text-sm underline">
            הצגת כל המחלקות
          </Link>
        )}
      </div>
      <FilterBar departments={departments} statuses={["in_review", "revision_requested"]} defaults={user.departmentId ? { department: user.departmentId } : {}} />
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-ink-rule bg-white">
        <table className="w-full text-sm">
          <thead className="text-start text-ink-muted">
            <tr className="border-b border-ink-rule">
              <th className="p-3 text-start font-semibold">PRD</th>
              <th className="p-3 text-start font-semibold">מסלול</th>
              <th className="p-3 text-start font-semibold">מגיש/ה</th>
              <th className="p-3 text-start font-semibold">סטטוס</th>
              <th className="p-3 text-start font-semibold">סיכון</th>
              <th className="p-3 text-start font-semibold">פורסם</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink-muted">
                  התור ריק.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-ink-rule last:border-0">
                <td className="p-3">
                  <Link href={`/prd/${p.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {p.title}
                  </Link>
                  <span className="ms-2 text-xs text-ink-muted">v{p.version}</span>
                </td>
                <td className="p-3">{branchLabel[p.branch]}</td>
                <td className="p-3">{p.author}</td>
                <td className="p-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="p-3">
                  <RiskBadge risk={p.risk} />
                </td>
                <td className="p-3 text-ink-muted">{formatDate(p.publishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
