"use client";
// FR-42: an interactive low-fidelity mockup from the wireframe spec. Screens
// switch like an app would; every element is a grey box with its label.
import { useState } from "react";
import type { WireframeComponent, WireframeSpec } from "@/lib/ai/types";

function Block({ c }: { c: WireframeComponent }) {
  const box = "rounded border border-dashed border-ink/30 bg-ink-wash p-3";
  switch (c.kind) {
    case "header":
      return <div className="rounded bg-ink/80 px-3 py-2 font-bold text-paper">{c.text}</div>;
    case "form":
      return (
        <div className={`${box} flex flex-col gap-2`}>
          {c.fields.map((f) => (
            <label key={f} className="flex flex-col gap-1 text-xs">
              {f}
              <span className="h-7 rounded border border-ink/20 bg-white" />
            </label>
          ))}
        </div>
      );
    case "table":
      return (
        <div className={box}>
          <div className="grid gap-2 text-xs font-semibold" style={{ gridTemplateColumns: `repeat(${c.columns.length}, 1fr)` }}>
            {c.columns.map((col) => (
              <span key={col}>{col}</span>
            ))}
          </div>
          {[0, 1, 2].map((r) => (
            <div key={r} className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${c.columns.length}, 1fr)` }}>
              {c.columns.map((col) => (
                <span key={col} className="h-3 rounded bg-ink/10" />
              ))}
            </div>
          ))}
        </div>
      );
    case "filters":
      return (
        <div className="flex flex-wrap gap-2">
          {c.items.map((i) => (
            <span key={i} className="rounded-full border border-ink/20 bg-white px-3 py-1 text-xs">
              {i} ▾
            </span>
          ))}
        </div>
      );
    case "stats":
      return (
        <div className="grid grid-cols-3 gap-2">
          {c.items.map((i) => (
            <div key={i} className={`${box} text-center text-xs`}>
              <div className="mb-1 text-lg font-bold">—</div>
              {i}
            </div>
          ))}
        </div>
      );
    case "chat":
      return (
        <div className={`${box} flex flex-col gap-2`}>
          <span className="w-2/3 self-end rounded bg-white p-2 text-xs">תשובה של העוזר…</span>
          <span className="w-1/2 self-start rounded bg-ink/70 p-2 text-xs text-paper">שאלה של משתמש</span>
          <span className="h-8 rounded border border-ink/20 bg-white px-2 py-1 text-xs text-ink-muted">{c.prompt}</span>
        </div>
      );
    case "timeline":
      return (
        <ol className={`${box} flex flex-col gap-2 text-xs`}>
          {c.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-ink/70 text-[10px] text-paper">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      );
    case "button":
      return <span className="self-start rounded bg-ink px-4 py-2 text-xs font-semibold text-paper">{c.text}</span>;
  }
}

export function WireframePreview({ spec }: { spec: WireframeSpec | null }) {
  const [i, setI] = useState(0);
  if (!spec?.screens.length) return <p className="text-ink-muted">אין wireframe עדיין.</p>;
  const screen = spec.screens[i];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="מסכים">
        {spec.screens.map((s, k) => (
          <button
            key={s.name}
            role="tab"
            aria-selected={k === i}
            onClick={() => setI(k)}
            className={`rounded-full border px-3 py-1 text-sm ${k === i ? "border-ink bg-ink text-paper" : "border-ink-rule"}`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-muted">{screen.purpose}</p>
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-[var(--radius-md)] border-4 border-ink/80 bg-white p-4 shadow-sm">
        {screen.components.map((c, k) => (
          <Block key={k} c={c} />
        ))}
      </div>
      <p className="text-center text-xs text-ink-muted">Wireframe נמוך-נאמנות שנוצר מה-PRD. לחיצה על שם מסך מחליפה מסך.</p>
    </div>
  );
}
