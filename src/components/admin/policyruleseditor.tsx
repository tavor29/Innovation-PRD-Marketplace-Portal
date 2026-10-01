"use client";
// The admin's rule table: switch a rule on or off, change its tier and
// severity, edit the workaround template and the detector. Each save is
// validated on the server and audited.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export interface RuleRow {
  id: string;
  code: string;
  titleHe: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  type: "hard_ban" | "requires_mitigation" | "advisory";
  detector: string;
  mitigationTemplateMd: string;
  isActive: boolean;
}

const typeLabel = { hard_ban: "חסימה", requires_mitigation: "דורש מיטיגציה", advisory: "המלצה" };
const typeTone = { hard_ban: "critical", requires_mitigation: "warning", advisory: "neutral" } as const;
const severities = ["low", "medium", "high", "critical"] as const;

export function PolicyRulesEditor({ rules }: { rules: RuleRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-3">
      {rules.map((r) => (
        <li key={r.id} className={`rounded-[var(--radius-md)] border bg-white ${r.isActive ? "border-ink-rule" : "border-dashed border-ink-rule opacity-70"}`}>
          <button
            className="flex w-full flex-wrap items-center gap-3 p-4 text-start"
            aria-expanded={open === r.id}
            onClick={() => setOpen(open === r.id ? null : r.id)}
          >
            <span className="font-mono text-sm" dir="ltr">
              {r.code}
            </span>
            <span className="font-semibold">{r.titleHe}</span>
            <Badge tone={typeTone[r.type]}>{typeLabel[r.type]}</Badge>
            {!r.isActive && <Badge>כבוי</Badge>}
            <span className="ms-auto text-sm text-ink-muted">{open === r.id ? "סגירה" : "עריכה"}</span>
          </button>
          {open === r.id && <RuleForm rule={r} onDone={() => setOpen(null)} />}
        </li>
      ))}
    </ul>
  );
}

function RuleForm({ rule, onDone }: { rule: RuleRow; onDone: () => void }) {
  const router = useRouter();
  const [r, setR] = useState(rule);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4 border-t border-ink-rule p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/admin/policy-rules", { method: "POST", body: JSON.stringify(r) });
        const j = await res.json();
        setBusy(false);
        if (!res.ok) return setError(j.error ?? "השמירה נכשלה");
        router.refresh();
        onDone();
      }}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label htmlFor={`t-${r.id}`}>שם</Label>
          <Input id={`t-${r.id}`} value={r.titleHe} onChange={(e) => setR({ ...r, titleHe: e.target.value })} />
        </div>
        <div>
          <Label htmlFor={`ty-${r.id}`}>סוג</Label>
          <Select id={`ty-${r.id}`} value={r.type} onChange={(e) => setR({ ...r, type: e.target.value as RuleRow["type"] })}>
            {Object.entries(typeLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`s-${r.id}`}>חומרה</Label>
          <Select id={`s-${r.id}`} value={r.severity} onChange={(e) => setR({ ...r, severity: e.target.value as RuleRow["severity"] })}>
            {severities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor={`m-${r.id}`}>תבנית מעקף / מיטיגציה ({"{{evidence}}"} מוחלף בממצא)</Label>
        <Textarea id={`m-${r.id}`} rows={3} value={r.mitigationTemplateMd} onChange={(e) => setR({ ...r, mitigationTemplateMd: e.target.value })} />
      </div>
      <div>
        <Label htmlFor={`d-${r.id}`}>תנאי (JSON)</Label>
        <Textarea id={`d-${r.id}`} rows={6} dir="ltr" className="font-mono text-xs" value={r.detector} onChange={(e) => setR({ ...r, detector: e.target.value })} />
        <p className="mt-1 text-xs text-ink-muted" dir="ltr">
          {"{ field, op: includes_any | equals_any | nonempty, values } · { all: [...] } · { any: [...] }"}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={r.isActive} onChange={(e) => setR({ ...r, isActive: e.target.checked })} />
        הכלל פעיל
      </label>
      {error && (
        <p role="alert" className="text-sm text-status-critical">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          שמירה
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
