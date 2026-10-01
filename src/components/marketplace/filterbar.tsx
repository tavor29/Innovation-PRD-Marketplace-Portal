"use client";
// Filters live in the URL, so a filtered view can be shared or bookmarked.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";
import { prdStatusLabel, riskLabel, branchLabel } from "@/components/ui/badge";

export function FilterBar({
  departments,
  statuses,
  defaults = {},
}: {
  departments: { id: string; name: string }[];
  statuses: string[];
  /** Filters applied when the URL doesn't set them (the review queue defaults to my department). */
  defaults?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    // Choosing "all" over a default has to be explicit, or the default comes back.
    else if (key in defaults) next.set(key, "");
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };
  const field = (key: string, label: string, options: [string, string][]) => (
    <label className="flex flex-col gap-1 text-xs font-semibold">
      {label}
      <Select value={params.get(key) ?? defaults[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
        <option value="">הכל</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      {field("department", "מחלקה", departments.map((d) => [d.id, d.name]))}
      {field("status", "סטטוס", statuses.map((s) => [s, prdStatusLabel[s] ?? s]))}
      {field("risk", "סיכון", Object.entries(riskLabel))}
      {field("branch", "מסלול", Object.entries(branchLabel))}
    </div>
  );
}
