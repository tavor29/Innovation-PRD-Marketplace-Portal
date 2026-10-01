"use client";
// The submission form: title, free-text description, and for prototypes a
// link (and optionally a file). The link is checked as you type so you can
// see which builder it was recognized as (FR-33).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

const placeholders = {
  idea: "לדוגמה: טופס אחד לבקשות רכש עם אישור מנהל ומעקב סטטוס, במקום שרשורי מיילים",
  problem: "לדוגמה: כל סוף חודש מעתיקים ידנית נתונים מאקסל לדוח, וזה לוקח יומיים",
  prototype: "לדוגמה: בניתי בוט שעונה לעובדים על שאלות מתוך מסמכי הנהלים",
};

export function SubmitForm({ branch }: { branch: "idea" | "problem" | "prototype" }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!link.trim()) {
      setDetected(null);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch("/api/attachments/extract", { method: "POST", body: JSON.stringify({ url: link }) });
      const j = await r.json();
      setDetected(r.ok ? j.providerLabel : null);
    }, 300);
    return () => clearTimeout(t);
  }, [link]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("branch", branch);
    const r = await fetch("/api/submissions", { method: "POST", body: form });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "משהו השתבש");
      setPending(false);
      return;
    }
    router.push(`/wizard/${j.sessionId}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="title">שם קצר</Label>
        <Input id="title" name="title" required maxLength={120} placeholder="לדוגמה: מעקב בקשות רכש" />
      </div>
      <div>
        <Label htmlFor="raw">תיאור</Label>
        <Textarea id="raw" name="rawInput" required rows={5} placeholder={placeholders[branch]} />
      </div>
      <div>
        <Label htmlFor="link">{branch === "prototype" ? "קישור לפרוטוטייפ" : "קישור (לא חובה)"}</Label>
        <Input
          id="link"
          name="link"
          dir="ltr"
          required={branch === "prototype"}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://my-app.lovable.app"
        />
        {detected && <p className="mt-1 text-sm text-status-good">זוהה: {detected}</p>}
      </div>
      <div>
        <Label htmlFor="file">קובץ מצורף (לא חובה)</Label>
        <Input id="file" name="file" type="file" accept=".md,.txt,.csv,.json,.pdf,.png,.jpg" />
        <p className="mt-1 text-xs text-ink-muted">עד 5MB. בדמו קבצים נשמרים זמנית בלבד.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-critical">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "פותח את האשף…" : "המשך לאשף"}
      </Button>
    </form>
  );
}
