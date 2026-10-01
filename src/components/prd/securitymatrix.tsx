"use client";
// Security & Compliance Matrix (FR-50..52): red = blocked, yellow = needs a
// mitigation, grey = advisory, each with its workaround. Managers can mark a
// flag mitigated, accept the risk or waive it, with a reason.
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/lib/markdown";

export interface Flag {
  id: string;
  ruleCode: string;
  ruleType: "hard_ban" | "requires_mitigation" | "advisory";
  severity: string;
  evidence: string;
  mitigationMd: string;
  status: "open" | "mitigated" | "accepted_risk" | "waived";
  source: "code" | "llm";
  waivedReason: string | null;
}

const typeView = {
  hard_ban: { label: "חסום", tone: "critical" as const, mark: "■" },
  requires_mitigation: { label: "דורש מיטיגציה", tone: "warning" as const, mark: "▲" },
  advisory: { label: "המלצה", tone: "neutral" as const, mark: "●" },
};

const statusLabel = { open: "פתוח", mitigated: "טופל", accepted_risk: "סיכון מקובל", waived: "בוטל בהחלטת מנהל" };

export function SecurityMatrix({
  flags,
  canManage,
  canRecheck,
  onRecheck,
  onUpdate,
}: {
  flags: Flag[];
  canManage: boolean;
  canRecheck: boolean;
  onRecheck: () => void;
  onUpdate: (flagId: string, status: Flag["status"], reason: string) => void;
}) {
  const order = { hard_ban: 0, requires_mitigation: 1, advisory: 2 };
  const sorted = [...flags].sort((a, b) => order[a.ruleType] - order[b.ruleType]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          כללי קוד רצים קודם. בדיקה סמנטית רצה אחריהם ויכולה רק להוסיף דגלים, לעולם לא להסיר דגל של כלל קוד.
        </p>
        {canRecheck && (
          <Button variant="outline" size="sm" onClick={onRecheck}>
            הרצת בדיקה מחדש
          </Button>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-[var(--radius-sm)] border border-status-good/40 bg-status-good/10 p-4">✓ לא נמצאו הפרות מדיניות.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((f) => (
            <FlagRow key={f.id} flag={f} canManage={canManage && f.ruleType !== "hard_ban"} onUpdate={onUpdate} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FlagRow({ flag, canManage, onUpdate }: { flag: Flag; canManage: boolean; onUpdate: (id: string, s: Flag["status"], r: string) => void }) {
  const v = typeView[flag.ruleType];
  const [reason, setReason] = useState("");
  return (
    <li
      className={`rounded-[var(--radius-sm)] border p-4 ${
        flag.ruleType === "hard_ban" ? "border-status-critical/40 bg-status-critical/5" : flag.ruleType === "requires_mitigation" ? "border-status-warning/60 bg-status-warning/10" : "border-ink-rule"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={v.tone}>
          <span aria-hidden="true">{v.mark}</span>
          {v.label}
        </Badge>
        <span className="font-mono text-xs" dir="ltr">
          {flag.ruleCode}
        </span>
        <Badge>{flag.source === "code" ? "כלל קוד" : "בדיקה סמנטית"}</Badge>
        <Badge tone={flag.status === "open" ? "neutral" : "good"}>{statusLabel[flag.status]}</Badge>
      </div>
      <p className="mt-2 font-semibold">{flag.evidence}</p>
      <div className="mt-1 text-sm">
        <Markdown source={flag.mitigationMd} />
      </div>
      {flag.waivedReason && <p className="mt-1 text-xs text-ink-muted">נימוק: {flag.waivedReason}</p>}
      {canManage && flag.status === "open" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            aria-label="נימוק"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="נימוק (חובה)"
            className="min-w-48 flex-1 rounded border border-ink-rule px-2 py-1 text-sm"
          />
          <Button size="sm" variant="good" disabled={!reason.trim()} onClick={() => onUpdate(flag.id, "mitigated", reason)}>
            טופל
          </Button>
          <Button size="sm" variant="outline" disabled={!reason.trim()} onClick={() => onUpdate(flag.id, "accepted_risk", reason)}>
            סיכון מקובל
          </Button>
        </div>
      )}
    </li>
  );
}
