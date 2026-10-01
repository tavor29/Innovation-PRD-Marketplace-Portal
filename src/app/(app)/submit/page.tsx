// FR-20: pick one of three submission tracks.
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";

const tracks = [
  {
    branch: "idea",
    title: "יש לי רעיון לפתרון",
    sub: "Solution-first",
    text: "את/ה יודע/ת מה רוצים לבנות. האשף ישלים קהל יעד, תהליכים ומקורות מידע.",
  },
  {
    branch: "problem",
    title: "יש לי בעיה",
    sub: "Problem-first",
    text: "יודעים מה כואב, עוד לא יודעים מה הפתרון. האשף יציע אחד או שניים כיוונים ריאליים.",
  },
  {
    branch: "prototype",
    title: "כבר בניתי פרוטוטייפ",
    sub: "Citizen Developer",
    text: "בנית משהו ב-Lovable, Bolt, Base44, v0 או כלי דומה. האשף יחלץ ממנו מפרט וישלים מה שחסר לפרודקשן.",
  },
] as const;

export default async function SubmitPage() {
  await requireUser(["submitter", "manager", "admin"]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">הגשה חדשה</h1>
        <p className="text-ink-muted">בחר/י מסלול. אין צורך בידע טכני.</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {tracks.map((t) => (
          <li key={t.branch}>
            <Link
              href={`/submit/${t.branch}`}
              className="flex h-full flex-col gap-2 rounded-[var(--radius-md)] border border-ink-rule bg-white p-5 hover:border-ink"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted" dir="ltr">
                {t.sub}
              </span>
              <span className="text-lg font-bold">{t.title}</span>
              <span className="text-sm text-ink-muted">{t.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
