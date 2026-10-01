"use client";
// FR-23: edit the PRD inline before publishing. The text fields and the
// machine-checkable fields are both editable; saving re-runs the policy, so
// a submitter can see a flag disappear when the requirement changes.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  authModels,
  dataAccessPatterns,
  integrationIds,
  machineLabels,
  piiCategoryIds,
  writeTargetIds,
  type PrdContent,
} from "@/lib/prd/schema";

const lines = (xs: string[]) => xs.join("\n");
const unlines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Checks<T extends string>({ legend, all, value, onChange }: { legend: string; all: readonly T[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {all.map((id) => (
          <label key={id} className="flex items-center gap-1 rounded-full border border-ink-rule px-2 py-1 text-xs">
            <input type="checkbox" checked={value.includes(id)} onChange={(e) => onChange(e.target.checked ? [...value, id] : value.filter((x) => x !== id))} />
            {machineLabels[id] ?? id}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PrdEditor({ content, onSave, onCancel, busy }: { content: PrdContent; onSave: (c: PrdContent) => void; onCancel: () => void; busy: boolean }) {
  const [c, setC] = useState(content);
  const set = <K extends keyof PrdContent>(k: K, v: PrdContent[K]) => setC((x) => ({ ...x, [k]: v }));

  return (
    <form
      className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-ink-rule bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...c,
          functionalRequirements: c.workflows.map((w, i) => ({ id: `FR-${String(i + 1).padStart(2, "0")}`, text: `המערכת תאפשר: ${w}` })),
          scope: { ...c.scope, in: c.workflows },
          userStories: c.workflows.map((w) => ({ as: c.targetAudience, want: w, soThat: c.kpis[0]?.name ?? c.summary.solution })),
        });
      }}
    >
      <div>
        <Label htmlFor="t">שם</Label>
        <Input id="t" value={c.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="p">הבעיה</Label>
          <Textarea id="p" value={c.summary.problem} onChange={(e) => set("summary", { ...c.summary, problem: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="s">הפתרון</Label>
          <Textarea id="s" value={c.summary.solution} onChange={(e) => set("summary", { ...c.summary, solution: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="a">קהל יעד</Label>
        <Input id="a" value={c.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="w">תהליכים (שורה לכל תהליך)</Label>
          <Textarea id="w" rows={5} value={lines(c.workflows)} onChange={(e) => set("workflows", unlines(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="d">מקורות מידע (שורה לכל מקור)</Label>
          <Textarea id="d" rows={5} value={lines(c.dataSources)} onChange={(e) => set("dataSources", unlines(e.target.value))} />
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-[var(--radius-sm)] bg-ink-wash p-4">
        <div>
          <h2 className="font-bold">שדות לבדיקת מדיניות</h2>
          <p className="text-sm text-ink-muted">מנוע המדיניות קורא רק את השדות האלה. שינוי כאן ושמירה מריצים את הבדיקה מחדש.</p>
        </div>
        <Checks legend="אינטגרציות (קריאה)" all={integrationIds} value={c.integrations} onChange={(v) => set("integrations", v)} />
        <Checks legend="כתיבה למערכות" all={writeTargetIds} value={c.writeTargets} onChange={(v) => set("writeTargets", v)} />
        <Checks legend="מידע אישי" all={piiCategoryIds} value={c.piiCategories} onChange={(v) => set("piiCategories", v)} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="dap">גישה לנתונים</Label>
            <Select id="dap" value={c.dataAccessPattern} onChange={(e) => set("dataAccessPattern", e.target.value as PrdContent["dataAccessPattern"])}>
              {dataAccessPatterns.map((x) => (
                <option key={x} value={x}>
                  {machineLabels[x]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="auth">אימות</Label>
            <Select id="auth" value={c.authModel} onChange={(e) => set("authModel", e.target.value as PrdContent["authModel"])}>
              {authModels.map((x) => (
                <option key={x} value={x}>
                  {machineLabels[x]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "שומר ובודק…" : "שמירה ובדיקת מדיניות"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
