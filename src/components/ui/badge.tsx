// Status and risk badges. Each carries its word, so colour is never the only
// signal (PRD 9.3 colours: red blocked, yellow mitigation, green approved).
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "warning" | "critical" | "info" | "serious";

const tones: Record<Tone, string> = {
  neutral: "border-ink-rule text-ink-muted",
  good: "border-status-good/40 bg-status-good/10 text-[#087a08]",
  warning: "border-status-warning/60 bg-status-warning/15 text-[#8a5d00]",
  serious: "border-status-serious/50 bg-status-serious/10 text-[#a2461f]",
  critical: "border-status-critical/40 bg-status-critical/10 text-status-critical",
  info: "border-mark-half/40 bg-mark-half/10 text-mark-half",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export const prdStatusLabel: Record<string, string> = {
  draft: "טיוטה",
  in_review: "בסקירה",
  revision_requested: "נדרש תיקון",
  approved: "מאושר",
  assigned: "הוקצה",
  built: "נבנה",
  rejected: "נדחה",
};

const prdStatusTone: Record<string, Tone> = {
  draft: "neutral",
  in_review: "info",
  revision_requested: "warning",
  approved: "good",
  assigned: "good",
  built: "good",
  rejected: "critical",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={prdStatusTone[status] ?? "neutral"}>{prdStatusLabel[status] ?? status}</Badge>;
}

export const riskLabel: Record<string, string> = {
  none: "ללא סיכון",
  low: "סיכון נמוך",
  medium: "דורש מיטיגציה",
  high: "סיכון גבוה",
  blocked: "חסום",
};

const riskTone: Record<string, Tone> = { none: "good", low: "neutral", medium: "warning", high: "serious", blocked: "critical" };

export function RiskBadge({ risk }: { risk: string }) {
  return (
    <Badge tone={riskTone[risk] ?? "neutral"}>
      <span aria-hidden="true">{risk === "blocked" ? "■" : risk === "none" ? "✓" : "▲"}</span>
      {riskLabel[risk] ?? risk}
    </Badge>
  );
}

export const branchLabel: Record<string, string> = { idea: "רעיון", problem: "בעיה", prototype: "פרוטוטייפ" };
