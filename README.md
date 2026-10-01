# פורטל חדשנות ו-PRD Marketplace

פורטל פנים-ארגוני שבו כל עובד מגיש רעיון, בעיה או פרוטוטייפ, עונה לאשף AI שמראיין אותו וממלא פערים, ומקבל PRD לפי התבנית
הארגונית עם מטריצת אבטחה ותאימות ו-wireframe. ה-PRD מתפרסם ל-marketplace פנימי שבו מנהלים מתעדפים, מבקשים תיקונים ומקצים
ל-vibe-coders או למפתחים.

> **דמו עם נתונים סינתטיים.** Meridian Dynamics היא חברה בדויה. ה-AI רץ במצב `mock` דטרמיניסטי (ללא מפתחות, ללא עלות).
> פרויקט מתוך [The Sanctioned Path](https://tavor29.github.io/projects/citizen-ai-governance/).

## מה יש בפנים

- **שלושה מסלולי הגשה:** Solution-first, Problem-first (האשף מציע 1–2 כיווני פתרון), ופרוטוטייפ (זיהוי אוטומטי של Lovable, Bolt,
  Base44, v0, Replit ו-GitHub מהקישור).
- **אשף:** שאלות המשך ממוקדות על תשובות שטחיות, ו-completeness meter.
- **PRD:** JSON מובנה שעובר ולידציה ב-Zod, ומרונדר ל-Markdown לפי התבנית. עריכה inline לפני פרסום, וייצוא `.md`.
- **מנוע מדיניות:** כללי קוד רצים קודם על שדות שניתנים לבדיקת מכונה (`integrations`, `writeTargets`, `dataAccessPattern`,
  `authModel`, `piiCategories`). אחריהם בדיקה סמנטית שיכולה רק **להוסיף** דגלים. שלוש רמות: חסימה, דורש מיטיגציה, המלצה. הכללים
  חיים בטבלת `policy_rules` ונערכים בממשק האדמין בלי deploy.
- **Marketplace ולוח מנהל:** סינון לפי מחלקה, סטטוס, סיכון ומסלול; אישור, בקשת תיקון או דחייה; ציון עדיפות; הקצאה עם תאריך יעד.
- **Wireframe:** mockup אינטראקטיבי נמוך-נאמנות מתוך ה-PRD.
- **Audit log** לכל פעולת מנהל, שינוי סטטוס והחלטת מדיניות. גרסאות PRD שפורסמו לא משתנות; בקשת תיקון יוצרת גרסה חדשה.

## Tech stack

- **Next.js 16 (App Router)** + TypeScript, `output: standalone`, ממשק עברית RTL מלא (CSS logical properties)
- **Tailwind v4**, רכיבי UI בסגנון shadcn
- **Postgres + Drizzle ORM**, **Zod**
- **Auth.js v5:** Credentials בפיתוח ובדמו; provider ארגוני (Entra ID/SAML) מתחבר ב-`auth.ts`
- **Vercel AI SDK** מאחורי provider registry (`AI_PROVIDER=mock|anthropic|openai|azure`). כרגע רק `mock` ממומש.
- **pg-boss** לעבודות רקע (אופציונלי, `JOBS_MODE=queue`)
- **Vitest** (מנוע המדיניות, scorer, renderer, חילוץ קישורים), **Playwright** (שלושת המסלולים מקצה לקצה)

## הרצה מקומית

```bash
npm install

# Postgres מקומי בלי Docker (embedded). או: docker compose up -d db
npm run pg:local

# בטרמינל אחר: הגדרת סביבה
cp .env.example .env.local      # ולהחליף את AUTH_SECRET

# סכימה + נתוני דמו
DATABASE_URL=postgres://portal:portal@localhost:5432/portal npm run db:push
npm run db:seed

npm run dev                      # http://localhost:3000
```

משתמשי הדמו (סיסמה `password123`): `submitter@` / `manager@` / `dev@` / `admin@meridian.demo`. בעמוד הכניסה יש כפתור כניסה
מהירה לכל תפקיד, ובתוך האפליקציה "החלפת תפקיד (דמו)".

## בדיקות

```bash
npm test          # unit: מנוע המדיניות (hard bans, add-only), scorer, renderer, חילוץ קישורים
npm run test:e2e  # Playwright מול אפליקציה רצה עם DB מאוכלס; משתמש ב-Chrome המותקן
```

## פריסה (Vercel + Neon)

1. לייבא את הריפו ב-Vercel.
2. להוסיף את Neon Postgres מה-Marketplace של Vercel (מגדיר את `DATABASE_URL`).
3. להגדיר משתני סביבה: `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_TRUST_HOST=true`, `AI_PROVIDER=mock`,
   `STORAGE_LOCAL_DIR=/tmp/storage`, ו-`CRON_SECRET`.
4. Deploy. ה-build מריץ `npm run db:setup`: יוצר את הסכימה ומאכלס נתוני דמו אם ה-DB ריק.
5. Cron לילי (`vercel.json`) מאפס את נתוני הדמו דרך `/api/demo/reset`, שמוגן ב-`CRON_SECRET`.

## עקרון ליבה

מנוע המדיניות **דטרמיניסטי תחילה**: ה-synthesizer מפיק שדות שניתנים לבדיקת מכונה, וחסימות נאכפות בקוד, לא בשיקול דעת של
מודל. מעבר ה-LLM רץ אחריו ויכול רק להוסיף דגלים. הכללים והפרומפטים הם המוח; הקוד רק אוכף ומריץ.

## מבנה

```
src/
  app/            # App Router: (auth) (app) (manage) (admin) + api/
  components/     # ui, wizard, prd, marketplace, manager, admin, common
  db/             # Drizzle schema, client, seed CLI
  lib/
    ai/           # registry, mock, wizard flow, scorer, semantic-policy, wireframe
    policy/       # types, engine (+ tests), seed rules
    prd/          # Zod schema, markdown renderer, generation, access, listing
    demo/         # demo seed (CLI + nightly reset)
    storage/      # storage adapter
    auth/         # roles + server-side guards
    jobs/         # pg-boss queue + worker
e2e/              # Playwright: three submission tracks
proxy.ts          # Next 16 proxy (formerly middleware): redirect to /login
```
