// Admin: users, roles and departments (FR-02, FR-04).
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/guard";
import { UserRow } from "@/components/admin/userrow";

export default async function UsersPage() {
  await requireUser(["admin"]);
  const [users, departments] = await Promise.all([
    db
      .select({ id: schema.users.id, name: schema.users.fullName, email: schema.users.email, role: schema.users.role, departmentId: schema.users.departmentId, isActive: schema.users.isActive })
      .from(schema.users)
      .orderBy(asc(schema.users.fullName)),
    db.select({ id: schema.departments.id, name: schema.departments.nameHe, managerId: schema.departments.managerId }).from(schema.departments),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">משתמשים</h1>
        <p className="text-ink-muted">תפקיד ומחלקה לכל משתמש. מנהל רואה כברירת מחדל את תור המחלקה שלו.</p>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-ink-rule bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-rule text-ink-muted">
              <th className="p-3 text-start font-semibold">שם</th>
              <th className="p-3 text-start font-semibold">אימייל</th>
              <th className="p-3 text-start font-semibold">תפקיד</th>
              <th className="p-3 text-start font-semibold">מחלקה</th>
              <th className="p-3 text-start font-semibold">פעיל</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} departments={departments} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
