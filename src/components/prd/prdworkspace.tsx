"use client";
// The PRD screen (PRD 9.1): header with status, risk and priority; the
// actions the viewer's role allows; and tabs for the document, security,
// wireframe, and discussion & history.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/lib/markdown";
import { Badge, RiskBadge, StatusBadge, branchLabel } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Role } from "@/lib/auth/roles";
import type { WireframeSpec } from "@/lib/ai/types";
import type { PrdContent } from "@/lib/prd/schema";
import { SecurityMatrix, type Flag } from "./securitymatrix";
import { WireframePreview } from "./wireframepreview";
import { PrdEditor } from "./prdeditor";
import { ManagerActionBar } from "@/components/manager/manageractionbar";
import { CommentThread, type Comment } from "@/components/common/commentthread";
import { formatDate } from "@/lib/utils";

export interface PrdView {
  id: string;
  title: string;
  version: number;
  status: string;
  riskLevel: string;
  priorityScore: number | null;
  contentMd: string;
  content: PrdContent;
  branch: string;
  author: string;
}

const tabs = [
  { id: "doc", label: "מסמך" },
  { id: "security", label: "אבטחה" },
  { id: "wireframe", label: "Wireframe" },
  { id: "history", label: "דיון והיסטוריה" },
] as const;

const actionLabel: Record<string, string> = {
  generated: "PRD הופק",
  edited: "נערך ונבדק מחדש",
  policy_rechecked: "בדיקת מדיניות הורצה מחדש",
  published: "פורסם ל-marketplace",
  approved: "אושר",
  revision_requested: "נדרש תיקון",
  rejected: "נדחה",
  priority_set: "נקבעה עדיפות",
  assigned: "הוקצה",
  new_version: "נוצרה גרסה חדשה",
  flag_updated: "עודכן דגל אבטחה",
  wireframe_regenerated: "wireframe נוצר מחדש",
  status_changed: "סטטוס עודכן",
};

export function PrdWorkspace(props: {
  prd: PrdView;
  flags: Flag[];
  wireframe: WireframeSpec | null;
  comments: Comment[];
  versions: { id: string; version: number; status: string }[];
  history: { action: string; diff: unknown; createdAt: string; actor: string | null }[];
  assignment: { id: string; dueDate: string | null; status: string; assignee: string | null } | null;
  devs: { id: string; name: string }[];
  viewer: { role: Role; isOwner: boolean };
}) {
  const { prd, viewer } = props;
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("doc");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canEdit = viewer.isOwner && prd.status === "draft";
  const blocked = prd.riskLevel === "blocked";

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setNotice(null);
    const r = await fetch(`/api/prds/${prd.id}/${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setNotice(j.error ?? "הפעולה נכשלה");
      return null;
    }
    return j;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span>{branchLabel[prd.branch]}</span>·<span>{prd.author}</span>·<span>גרסה {prd.version}</span>
        </div>
        <h1 className="text-2xl font-bold">{prd.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={prd.status} />
          <RiskBadge risk={prd.riskLevel} />
          {prd.priorityScore !== null && <Badge tone="info">עדיפות {prd.priorityScore}</Badge>}
          {props.assignment && (
            <Badge tone="good">
              הוקצה ל{props.assignment.assignee} {props.assignment.dueDate ? `· עד ${formatDate(props.assignment.dueDate)}` : ""}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && !editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                עריכה
              </Button>
              <Button
                disabled={busy || blocked}
                title={blocked ? "יש חסימת מדיניות. ערוך/י את הדרישה כדי להסיר אותה." : undefined}
                onClick={async () => {
                  if (await post("publish")) router.refresh();
                }}
              >
                פרסום ל-marketplace
              </Button>
            </>
          )}
          {viewer.isOwner && prd.status === "revision_requested" && (
            <Button
              disabled={busy}
              onClick={async () => {
                const j = await post("generate");
                if (j?.prdId) router.push(`/prd/${j.prdId}`);
              }}
            >
              יצירת גרסה מתוקנת
            </Button>
          )}
          <a href={`/api/prds/${prd.id}/export.md`} className={buttonVariants({ variant: "outline" })}>
            הורדת ‎.md
          </a>
          {props.versions.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink-muted">גרסאות:</span>
              <select
                className="rounded border border-ink-rule bg-white px-2 py-1"
                value={prd.id}
                onChange={(e) => router.push(`/prd/${e.target.value}`)}
              >
                {props.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {canEdit && blocked && (
          <p className="rounded-[var(--radius-sm)] border border-status-critical/40 bg-status-critical/10 p-3 text-sm">
            ה-PRD חסום בגלל כלל מדיניות (ראו לשונית אבטחה). ערוך/י את הדרישה, למשל דרך API בצד השרת במקום גישה ישירה, והבדיקה תרוץ מחדש.
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-[var(--radius-sm)] border border-ink-rule bg-white p-3 text-sm">
            {notice}
          </p>
        )}
      </header>

      <ManagerActionBar prd={prd} viewer={viewer} devs={props.devs} assignment={props.assignment} post={post} />

      {editing ? (
        <PrdEditor
          content={prd.content}
          onCancel={() => setEditing(false)}
          onSave={async (content) => {
            const j = await post("validate-policy", { content });
            if (!j) return;
            setEditing(false);
            const parts = [
              j.added?.length ? `נוספו דגלים: ${j.added.join(", ")}` : "",
              j.removed?.length ? `הוסרו דגלים: ${j.removed.join(", ")}` : "",
            ].filter(Boolean);
            setNotice(`נשמר ונבדק מחדש. ${parts.join(" · ") || "אין שינוי בדגלים."}`);
            router.refresh();
          }}
          busy={busy}
        />
      ) : (
        <>
          <div role="tablist" aria-label="חלקי ה-PRD" className="flex gap-1 border-b border-ink-rule">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                id={`tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t.id ? "border-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
              >
                {t.label}
                {t.id === "security" && props.flags.length > 0 && <span className="ms-1 text-xs">({props.flags.length})</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="rounded-[var(--radius-md)] border border-ink-rule bg-white p-6">
            {tab === "doc" && <Markdown source={prd.contentMd} />}
            {tab === "security" && (
              <SecurityMatrix
                flags={props.flags}
                canManage={viewer.role === "manager" || viewer.role === "admin"}
                canRecheck={(viewer.isOwner || viewer.role === "admin") && prd.status === "draft"}
                onRecheck={async () => {
                  const j = await post("validate-policy");
                  if (j) {
                    setNotice(`הבדיקה רצה מחדש. ${j.added?.length ? `נוספו: ${j.added.join(", ")}. ` : ""}${j.removed?.length ? `הוסרו: ${j.removed.join(", ")}.` : ""}`);
                    router.refresh();
                  }
                }}
                onUpdate={async (flagId, status, reason) => {
                  if (await post("review", { action: "flag", flagId, status, reason })) router.refresh();
                }}
              />
            )}
            {tab === "wireframe" && <WireframePreview spec={props.wireframe} />}
            {tab === "history" && (
              <div className="grid gap-8 md:grid-cols-2">
                <CommentThread prdId={prd.id} comments={props.comments} />
                <section>
                  <h2 className="mb-3 font-bold">היסטוריה (audit log)</h2>
                  <ol className="flex flex-col gap-2 text-sm">
                    {props.history.map((h, i) => (
                      <li key={i} className="border-b border-ink-rule pb-2">
                        <span className="font-semibold">{actionLabel[h.action] ?? h.action}</span>
                        <span className="text-ink-muted"> · {h.actor ?? "מערכת"} · {formatDate(h.createdAt)}</span>
                        {h.diff ? <pre className="mt-1 overflow-x-auto text-xs text-ink-muted" dir="ltr">{JSON.stringify(h.diff)}</pre> : null}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
