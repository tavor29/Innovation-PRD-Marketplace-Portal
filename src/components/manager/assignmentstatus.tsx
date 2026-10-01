"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";

const labels = { assigned: "הוקצה", in_progress: "בעבודה", done: "נבנה" };

export function AssignmentStatus({ id, status, canChange }: { id: string; status: keyof typeof labels; canChange: boolean }) {
  const router = useRouter();
  if (!canChange) return <span className="text-sm">{labels[status]}</span>;
  return (
    <Select
      aria-label="סטטוס הקצאה"
      className="w-36"
      value={status}
      onChange={async (e) => {
        const r = await fetch(`/api/assignments/${id}`, { method: "POST", body: JSON.stringify({ status: e.target.value }) });
        if (r.ok) router.refresh();
      }}
    >
      {Object.entries(labels).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </Select>
  );
}
