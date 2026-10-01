// The internal marketplace: every published PRD, sorted by priority, with
// filters (PRD 9.1, "gallery").
import { requireUser } from "@/lib/auth/guard";
import { departmentsList, listPrds } from "@/lib/prd/listing";
import { FilterBar } from "@/components/marketplace/filterbar";
import { PrdCard } from "@/components/marketplace/prdcard";

const statuses = ["in_review", "revision_requested", "approved", "assigned", "built", "rejected"];

export default async function Marketplace(props: PageProps<"/marketplace">) {
  await requireUser();
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const [rows, departments] = await Promise.all([
    listPrds({ department: one("department"), status: one("status"), risk: one("risk"), branch: one("branch") }),
    departmentsList(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-ink-muted">כל ה-PRDs שפורסמו, לפי עדיפות. מנהלים מתעדפים ומקצים מכאן לבונים.</p>
      </div>
      <FilterBar departments={departments} statuses={statuses} />
      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-ink-rule bg-white p-6 text-center text-ink-muted">אין PRDs שמתאימים לסינון.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <li key={p.id}>
              <PrdCard p={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
