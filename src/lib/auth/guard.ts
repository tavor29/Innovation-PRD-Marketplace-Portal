// FR-03: authorization runs on the server for every page, route and action.
// Pages call requireUser(); route handlers call apiUser() and return its
// error response when there is one.
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "../../../auth";
import type { Role } from "./roles";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
}

/**
 * The session only proves who signed in. Role, department and id are read
 * from the database on every request, so an admin's role change applies at
 * once, a deactivated user is locked out, and a demo reset (which recreates
 * every row) doesn't leave sessions pointing at ids that no longer exist.
 */
async function current(): Promise<SessionUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
  if (!u || !u.isActive) return null;
  return { id: u.id, name: u.fullName, email: u.email, role: u.role, departmentId: u.departmentId ?? undefined };
}

export async function requireUser(allowed?: Role[]): Promise<SessionUser> {
  const user = await current();
  if (!user) redirect("/login");
  if (allowed && !allowed.includes(user.role)) redirect("/dashboard?denied=1");
  return user;
}

export async function apiUser(allowed?: Role[]): Promise<{ user: SessionUser; error: null } | { user: null; error: NextResponse }> {
  const user = await current();
  if (!user) return { user: null, error: NextResponse.json({ error: "לא מחובר/ת" }, { status: 401 }) };
  if (allowed && !allowed.includes(user.role)) return { user: null, error: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }) };
  return { user, error: null };
}
