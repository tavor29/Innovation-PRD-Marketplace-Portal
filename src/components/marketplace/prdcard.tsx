import Link from "next/link";
import { Badge, RiskBadge, StatusBadge, branchLabel } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface PrdRow {
  id: string;
  title: string;
  status: string;
  risk: string;
  priority: number | null;
  version: number;
  publishedAt: Date | null;
  summary: string | null;
  branch: string;
  department: string | null;
  author: string | null;
}

export function PrdCard({ p }: { p: PrdRow }) {
  return (
    <Link href={`/prd/${p.id}`} className="flex h-full flex-col gap-3 rounded-[var(--radius-md)] border border-ink-rule bg-white p-5 hover:border-ink">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={p.status} />
        <RiskBadge risk={p.risk} />
        {p.priority !== null && <Badge tone="info">עדיפות {p.priority}</Badge>}
      </div>
      <h2 className="text-lg font-bold">{p.title}</h2>
      <p className="line-clamp-3 text-sm text-ink-muted">{p.summary}</p>
      <p className="mt-auto text-xs text-ink-muted">
        {branchLabel[p.branch]} · {p.department ?? "—"} · {p.author} · {formatDate(p.publishedAt)} · v{p.version}
      </p>
    </Link>
  );
}
