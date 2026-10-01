"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { roleLabel, roles } from "@/lib/auth/roles";

export function UserRow({
  user,
  departments,
}: {
  user: { id: string; name: string; email: string; role: string; departmentId: string | null; isActive: boolean };
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const save = async (patch: Record<string, unknown>) => {
    const r = await fetch(`/api/admin/users`, { method: "POST", body: JSON.stringify({ id: user.id, ...patch }) });
    if (r.ok) router.refresh();
  };
  return (
    <tr className="border-b border-ink-rule last:border-0">
      <td className="p-3 font-semibold">{user.name}</td>
      <td className="p-3" dir="ltr">
        {user.email}
      </td>
      <td className="p-3">
        <Select aria-label={`תפקיד של ${user.name}`} value={user.role} onChange={(e) => save({ role: e.target.value })}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel[r]}
            </option>
          ))}
        </Select>
      </td>
      <td className="p-3">
        <Select aria-label={`מחלקה של ${user.name}`} value={user.departmentId ?? ""} onChange={(e) => save({ departmentId: e.target.value || null })}>
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </td>
      <td className="p-3">
        <input type="checkbox" aria-label={`${user.name} פעיל`} checked={user.isActive} onChange={(e) => save({ isActive: e.target.checked })} />
      </td>
    </tr>
  );
}
