import { loginAs } from "@/app/actions/session";
import { LoginForm } from "@/components/common/loginform";
import { DemoBanner } from "@/components/common/demobanner";
import { roleLabel } from "@/lib/auth/roles";

const quick = [
  { email: "submitter@meridian.demo", role: "submitter", text: "מגיש/ה רעיון, בעיה או פרוטוטייפ" },
  { email: "manager@meridian.demo", role: "manager", text: "סוקר/ת, מתעדפ/ת ומקצה" },
  { email: "dev@meridian.demo", role: "dev", text: "מקבל/ת PRD מאושר ובונה" },
  { email: "admin@meridian.demo", role: "admin", text: "עורך/ת את כללי המדיניות" },
] as const;

export default function LoginPage() {
  return (
    <>
      <DemoBanner />
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Meridian Dynamics · פורטל פנימי</p>
          <h1 className="text-3xl font-bold">פורטל חדשנות ו-PRD Marketplace</h1>
          <p className="text-ink-muted">
            מגישים רעיון, בעיה או פרוטוטייפ, עונים לאשף AI, ומקבלים PRD עם מטריצת אבטחה ו-wireframe. מנהלים מתעדפים ומקצים
            לבונים.
          </p>
        </header>

        <section aria-labelledby="quick">
          <h2 id="quick" className="mb-3 font-bold">
            כניסה מהירה לדמו
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {quick.map((q) => (
              <li key={q.email}>
                <form action={loginAs}>
                  <input type="hidden" name="email" value={q.email} />
                  <button
                    type="submit"
                    className="flex w-full flex-col items-start gap-1 rounded-[var(--radius-md)] border border-ink-rule bg-white p-4 text-start transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-ink"
                  >
                    <span className="font-bold">{roleLabel[q.role]}</span>
                    <span className="text-sm text-ink-muted">{q.text}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <details className="rounded-[var(--radius-md)] border border-ink-rule bg-white p-4">
          <summary className="cursor-pointer font-semibold">כניסה עם אימייל וסיסמה</summary>
          <div className="mt-4">
            <LoginForm />
          </div>
        </details>
      </main>
    </>
  );
}
