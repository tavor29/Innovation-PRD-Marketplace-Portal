"use client";
// The interview (FR-21/22): a chat with the wizard, the completeness meter,
// and the "generate PRD" action.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { CompletenessMeter } from "./completenessmeter";
import { READY_AT } from "@/lib/ai/scorer";

type Msg = { role: "user" | "assistant"; content: string; shallow?: boolean };

export function WizardShell({
  sessionId,
  initialMessages,
  initialScore,
  initialDone,
  existingPrdId,
}: {
  sessionId: string;
  initialMessages: Msg[];
  initialScore: number;
  initialDone: boolean;
  existingPrdId: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [score, setScore] = useState(initialScore);
  const [done, setDone] = useState(initialDone);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<null | "send" | "generate">(null);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    // One message at a time, so replies always line up with their answers.
    if (!text.trim() || busy) return;
    const content = text.trim();
    setMessages((m) => [...m, { role: "user", content }]);
    setText("");
    setBusy("send");
    const r = await fetch(`/api/wizard/${sessionId}/message`, { method: "POST", body: JSON.stringify({ content }) });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) return setError(j.error ?? "משהו השתבש");
    setMessages((m) => [...m, { role: "assistant", content: j.reply, shallow: j.shallow }]);
    setScore(j.completeness);
    setDone(j.done);
  }

  async function generate() {
    if (score < READY_AT && !confirm(`הכיסוי עומד על ${score}%. להפיק בכל זאת? חלקים מה-PRD יהיו דלים.`)) return;
    setBusy("generate");
    const r = await fetch("/api/prds", { method: "POST", body: JSON.stringify({ sessionId }) });
    const j = await r.json();
    if (!r.ok) {
      setBusy(null);
      return setError(j.error ?? "ההפקה נכשלה");
    }
    router.push(`/prd/${j.prdId}`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
      <section aria-label="שיחה עם האשף" className="flex min-h-[28rem] flex-col rounded-[var(--radius-md)] border border-ink-rule bg-white">
        <ol className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
          {messages.map((m, i) => (
            <li
              key={i}
              className={
                m.role === "user"
                  ? "max-w-[85%] self-start rounded-[var(--radius-sm)] bg-ink px-3 py-2 text-paper"
                  : "max-w-[85%] self-end whitespace-pre-line rounded-[var(--radius-sm)] bg-ink-wash px-3 py-2"
              }
            >
              {m.shallow && <span className="mb-1 block text-xs font-semibold text-[#8a5d00]">התשובה קצרה מדי — שאלת המשך:</span>}
              {m.content}
            </li>
          ))}
          {busy === "send" && <li className="self-end text-sm text-ink-muted">האשף כותב…</li>}
          <div ref={end} />
        </ol>
        {!done && !existingPrdId && (
          <form onSubmit={send} className="flex items-end gap-2 border-t border-ink-rule p-3">
            <Textarea
              aria-label="התשובה שלך"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement).requestSubmit();
                }
              }}
              rows={2}
              className="min-h-0"
              placeholder="כתוב/י תשובה… (Enter לשליחה)"
            />
            <Button type="submit" disabled={!!busy || !text.trim()}>
              שליחה
            </Button>
          </form>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <CompletenessMeter score={score} />
        {existingPrdId ? (
          <Button onClick={() => router.push(`/prd/${existingPrdId}`)}>לצפייה ב-PRD</Button>
        ) : (
          <Button onClick={generate} disabled={!!busy} variant={done || score >= READY_AT ? "primary" : "outline"}>
            {busy === "generate" ? "מפיק PRD, בודק מדיניות…" : "הפקת PRD"}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-status-critical">
            {error}
          </p>
        )}
        <p className="text-xs text-ink-muted">
          ההפקה כוללת מסמך PRD לפי התבנית הארגונית, מטריצת אבטחה ותאימות ו-wireframe.
        </p>
      </aside>
    </div>
  );
}
