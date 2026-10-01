// NFR-04/06: every manager action, status change and policy decision is
// written to audit_log.
import { db, schema } from "@/db";

export async function audit(
  actorId: string | null,
  entityType: "prd" | "submission" | "policy_rule" | "user" | "assignment" | "security_flag",
  entityId: string | null,
  action: string,
  diff?: Record<string, unknown>,
) {
  await db.insert(schema.auditLog).values({ actorId, entityType, entityId, action, diff: diff ?? null });
}
