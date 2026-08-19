# פורטל חדשנות ו-PRD Marketplace

פורטל פנים-ארגוני שבו עובדים מגישים רעיונות / בעיות / פרוטוטייפים, משתפים פעולה עם AI wizard
ליצירת PRD מובנה עם בדיקת אבטחה ומדיניות, ומפרסמים ל-marketplace פנימי לתעדוף והקצאה ע"י מנהלים.

מסמך ה-PRD המלא: [docs/PRD-innovation-portal.md](docs/PRD-innovation-portal.md)

## Tech stack

- **Next.js 16 (App Router)** + TypeScript, `output: standalone` — נפרס ל-Vercel או Docker ללא שינוי קוד
- **Tailwind v4 + shadcn-style UI**, RTL מלא
- **Postgres + Drizzle ORM** — SQL רגיל, ללא תלות ב-vendor
- **Auth.js v5** — provider ניתן להחלפה (Credentials בפיתוח, Entra ID/SAML בפרוד)
- **Vercel AI SDK** מאחורי provider registry (`AI_PROVIDER=mock|openai|azure|anthropic`)
- **pg-boss** ל-jobs ברקע (רינדור wireframe) על גבי אותו Postgres
- **Vitest** למנוע המדיניות, **Playwright** לשלושת מסלולי ההגשה

## החלטות פתוחות (Open decisions)

הקוד נכתב כך שהבחירות האלה הפיכות ואינן חוסמות פיתוח:

- **Hosting:** Vercel+Supabase / Docker on-prem / Azure — נבחר בהמשך.
- **LLM provider:** נקבע דרך `AI_PROVIDER`. ברירת מחדל `mock` (דטרמיניסטי, ללא מפתחות) לפיתוח, CI ו-demo.

## הפעלה מקומית

```bash
# 1. התקנת תלויות
npm install

# 2. הרמת Postgres (או השתמש ב-DATABASE_URL קיים)
docker compose up -d db

# 3. הגדרת סביבה
cp .env.example .env   # ברירת המחדל: AI_PROVIDER=mock

# 4. סכימה + seed (משתמשי דמו + policy rules)
npm run db:push
npm run db:seed

# 5. הרצה
npm run dev            # http://localhost:3000
npm run worker         # (אופציונלי) worker ל-wireframes ברקע
```

משתמשי דמו (סיסמה `password123`): `submitter@` / `manager@` / `dev@` / `admin@corp.local`.

## בדיקות

```bash
npm test          # unit tests — מנוע המדיניות (hard bans), scorer, renderer
npm run test:e2e  # Playwright — דורש אפליקציה רצה + DB seeded
```

## עקרון ליבה

מנוע המדיניות **דטרמיניסטי תחילה**: ה-synthesizer מפיק שדות ניתנים לבדיקת מכונה
(`integrations`, `write_targets`, `data_sources`, `auth_model`, `pii_categories`),
וה-rule engine חוסם hard bans (BigFix, Active Directory, כתיבת SQL מ-frontend) ב-code —
לא בשיקול דעת של מודל. מעבר ה-LLM רץ אחריו ויכול רק **להוסיף** דגלים.
הכללים חיים בטבלת `policy_rules` וניתנים לעריכה ע"י admin ללא deploy.

## מבנה

```
src/
  app/            # App Router: (auth) (app) (manage) (admin) + api/
  components/     # UI: wizard, prd, marketplace, manager, admin
  db/             # Drizzle schema, client, seed
  lib/
    ai/           # registry, prompts, wizard, scorer, synthesizer, semantic-policy, wireframe, mock
    policy/       # types, rules (seed), engine (+ tests)
    prd/          # Zod schema, markdown renderer, generation orchestration
    storage/      # pluggable storage adapter
    auth/         # roles + server-side guards
    jobs/         # pg-boss queue + worker
docs/PRD-innovation-portal.md
```
