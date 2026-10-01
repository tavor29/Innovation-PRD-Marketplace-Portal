"use server";
// Sign-in, demo role switching and sign-out. The demo accounts are seeded
// (src/db/seed.ts) with the PRD's demo password; real deployments swap the
// Credentials provider for corporate SSO in auth.ts (FR-01).
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "../../../auth";

const demoAccounts = [
  { email: "submitter@meridian.demo", role: "submitter" },
  { email: "manager@meridian.demo", role: "manager" },
  { email: "dev@meridian.demo", role: "dev" },
  { email: "admin@meridian.demo", role: "admin" },
] as const;

const DEMO_PASSWORD = "password123";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: "/",
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return "אימייל או סיסמה שגויים";
    throw e;
  }
}

/** Demo only: sign in as one of the seeded accounts in one click. */
export async function loginAs(form: FormData) {
  const email = String(form.get("email") ?? "");
  if (!demoAccounts.some((a) => a.email === email)) redirect("/login");
  await signIn("credentials", { email, password: DEMO_PASSWORD, redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
