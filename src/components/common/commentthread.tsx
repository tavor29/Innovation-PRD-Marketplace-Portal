"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export interface Comment {
  id: string;
  body: string;
  kind: "comment" | "revision_request" | "system";
  createdAt: string;
  author: string | null;
}

const kindLabel = { comment: "", revision_request: "בקשת תיקון", system: "מערכת" };

export function CommentThread({ prdId, comments }: { prdId: string; comments: Comment[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section>
      <h2 className="mb-3 font-bold">דיון</h2>
      <ol className="mb-4 flex flex-col gap-3">
        {comments.length === 0 && <li className="text-sm text-ink-muted">אין תגובות עדיין.</li>}
        {comments.map((c) => (
          <li key={c.id} className={`rounded-[var(--radius-sm)] p-3 text-sm ${c.kind === "revision_request" ? "bg-status-warning/15" : "bg-ink-wash"}`}>
            <div className="mb-1 text-xs text-ink-muted">
              {c.author ?? "מערכת"} · {formatDate(c.createdAt)} {kindLabel[c.kind] && `· ${kindLabel[c.kind]}`}
            </div>
            <p className="whitespace-pre-line">{c.body}</p>
          </li>
        ))}
      </ol>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await fetch(`/api/prds/${prdId}/comments`, { method: "POST", body: JSON.stringify({ body }) });
          setBusy(false);
          if (r.ok) {
            setBody("");
            router.refresh();
          }
        }}
      >
        <Textarea aria-label="תגובה" rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="הוספת תגובה…" />
        <Button size="sm" disabled={busy || !body.trim()} className="self-start">
          שליחה
        </Button>
      </form>
    </section>
  );
}
