// FR-14: policy rules, editable without a deploy. "The rules and prompts are
// the brain; the code only enforces them" (PRD 7.4).
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/guard";
import { PolicyRulesEditor } from "@/components/admin/policyruleseditor";

export default async function PolicyRulesPage() {
  await requireUser(["admin"]);
  const rules = await db.select().from(schema.policyRules).orderBy(asc(schema.policyRules.code));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">כללי מדיניות</h1>
        <p className="max-w-3xl text-ink-muted">
          כללי הקוד רצים על השדות המובנים של כל PRD. שינוי כאן חל מיד: ב-PRD בטיוטה לוחצים &quot;הרצת בדיקה מחדש&quot; ורואים את
          הדגלים משתנים. גרסאות שכבר פורסמו לא משתנות.
        </p>
      </div>
      <PolicyRulesEditor rules={rules.map((r) => ({ ...r, detector: JSON.stringify(r.detector, null, 2) }))} />
    </div>
  );
}
