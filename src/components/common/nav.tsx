// Top navigation, by role, with the demo role switcher (FR-02).
import Link from "next/link";
import { can, roleLabel, type Role } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/guard";
import { loginAs, logout } from "@/app/actions/session";
import { DemoBanner } from "./demobanner";

const links: { href: string; label: string; show: (r: Role) => boolean }[] = [
  { href: "/dashboard", label: "ההגשות שלי", show: (r) => can.submit(r) },
  { href: "/submit", label: "הגשה חדשה", show: (r) => can.submit(r) },
  { href: "/marketplace", label: "Marketplace", show: () => true },
  { href: "/review", label: "תור סקירה", show: (r) => can.review(r) },
  { href: "/assignments", label: "הקצאות", show: (r) => can.seeAssignments(r) },
  { href: "/policy-rules", label: "כללי מדיניות", show: (r) => can.editRules(r) },
  { href: "/users", label: "משתמשים", show: (r) => can.manageUsers(r) },
];

const demo: { email: string; role: Role }[] = [
  { email: "submitter@meridian.demo", role: "submitter" },
  { email: "manager@meridian.demo", role: "manager" },
  { email: "dev@meridian.demo", role: "dev" },
  { email: "admin@meridian.demo", role: "admin" },
];

export function Nav({ user }: { user: SessionUser }) {
  return (
    <>
      <DemoBanner />
      <header className="border-b border-ink-rule bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="font-bold">
            פורטל חדשנות
          </Link>
          <nav aria-label="ראשי" className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
            {links
              .filter((l) => l.show(user.role))
              .map((l) => (
                <Link key={l.href} href={l.href} className="text-ink-muted hover:text-ink">
                  {l.label}
                </Link>
              ))}
          </nav>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              {user.name} · <span className="text-ink-muted">{roleLabel[user.role]}</span>
            </span>
            <details className="relative">
              <summary className="cursor-pointer rounded-[var(--radius-sm)] border border-ink-rule px-2 py-1 text-xs">
                החלפת תפקיד (דמו)
              </summary>
              <div className="absolute end-0 z-10 mt-1 flex w-48 flex-col rounded-[var(--radius-sm)] border border-ink-rule bg-white p-1 shadow-sm">
                {demo
                  .filter((d) => d.role !== user.role)
                  .map((d) => (
                    <form key={d.email} action={loginAs}>
                      <input type="hidden" name="email" value={d.email} />
                      <button type="submit" className="w-full rounded px-2 py-1.5 text-start hover:bg-ink-wash">
                        {roleLabel[d.role]}
                      </button>
                    </form>
                  ))}
              </div>
            </details>
            <form action={logout}>
              <button type="submit" className="text-xs text-ink-muted underline">
                יציאה
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
