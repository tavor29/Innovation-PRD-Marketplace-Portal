"use client";
// Manager decisions (FR-11..13): approve, request a revision with a comment,
// or reject; set a priority score; assign an approved PRD to a builder with
// an optional due date.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { Role } from "@/lib/auth/roles";
import type { PrdView } from "@/components/prd/prdworkspace";

export function ManagerActionBar({
  prd,
  viewer,
  devs,
  assignment,
  post,
}: {
  prd: PrdView;
  viewer: { role: Role };
  devs: { id: string; name: string }[];
  assignment: { id: string } | null;
  post: (path: string, body?: unknown) => Promise<unknown>;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState(String(prd.priorityScore ?? ""));
  const [assignee, setAssignee] = useState(devs[0]?.id ?? "");
  const [due, setDue] = useState("");
  const isManager = viewer.role === "manager" || viewer.role === "admin";
  if (!isManager) return null;

  const act = async (path: string, body: unknown) => {
    if (await post(path, body)) {
      setComment("");
      router.refresh();
    }
  };

  if (prd.status === "in_review") {
    return (
      <section aria-label="החלטת מנהל" className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-mark-half/40 bg-mark-half/5 p-4">
        <h2 className="font-bold">החלטת מנהל</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_10rem]">
          <div>
            <Label htmlFor="c">הערה (חובה לבקשת תיקון או דחייה)</Label>
            <Textarea id="c" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pr">ציון עדיפות (0–100)</Label>
            <Input id="pr" type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="good" disabled={prd.riskLevel === "blocked"} onClick={() => act("review", { action: "approve", comment, priority: priority === "" ? null : Number(priority) })}>
            אישור
          </Button>
          <Button variant="outline" disabled={!comment.trim()} onClick={() => act("review", { action: "revise", comment })}>
            בקשת תיקון
          </Button>
          <Button variant="danger" disabled={!comment.trim()} onClick={() => act("review", { action: "reject", comment })}>
            דחייה
          </Button>
        </div>
      </section>
    );
  }

  if (prd.status === "approved" && !assignment) {
    return (
      <section aria-label="הקצאה" className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-status-good/40 bg-status-good/5 p-4">
        <h2 className="font-bold">הקצאה לבונה</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="as">Vibe coder / מפתח/ת</Label>
            <Select id="as" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {devs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="due">תאריך יעד (לא חובה)</Label>
            <Input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pr2">ציון עדיפות</Label>
            <Input id="pr2" type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={!assignee} onClick={() => act("assign", { assigneeId: assignee, dueDate: due || null, priority: priority === "" ? null : Number(priority) })}>
            הקצאה
          </Button>
        </div>
      </section>
    );
  }
  return null;
}
