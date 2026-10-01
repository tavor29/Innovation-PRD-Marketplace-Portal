// MVP Definition of Done (PRD 13.2): each of the three tracks produces a
// valid PRD. Runs against a seeded app with AI_PROVIDER=mock.
import { expect, test, type Page } from "@playwright/test";

async function loginAsSubmitter(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /מגיש\/ה רעיון/ }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function answerAll(page: Page, answers: string[]) {
  const box = page.getByRole("textbox", { name: "התשובה שלך" });
  const writing = page.getByText("האשף כותב…");
  for (const a of answers) {
    await expect(writing).toHaveCount(0);
    const before = await page.locator("ol[aria-live] > li").count();
    await box.fill(a);
    await box.press("Enter");
    // The reply has landed when the indicator is gone and two items were
    // added (the answer and the reply).
    await expect(writing).toHaveCount(0);
    await expect(page.locator("ol[aria-live] > li")).toHaveCount(before + 2, { timeout: 15_000 });
  }
}

async function generate(page: Page) {
  await page.getByRole("button", { name: "הפקת PRD" }).click();
  await expect(page).toHaveURL(/\/prd\//, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 2, name: "1. סיכום מנהלים" })).toBeVisible();
  await expect(page.getByText("טיוטה").first()).toBeVisible();
}

test("solution-first: idea → PRD, with a shallow-answer follow-up", async ({ page }) => {
  await loginAsSubmitter(page);
  await page.goto("/submit/idea");
  await page.getByLabel("שם קצר").fill("E2E תיאום חדרי ישיבות");
  await page.getByLabel("תיאור").fill("מערכת קטנה שמראה איזה חדר פנוי ומאפשרת להזמין אותו בלי לחפש ביומנים של כולם");
  await page.getByRole("button", { name: "המשך לאשף" }).click();
  await expect(page).toHaveURL(/wizard/);

  await answerAll(page, ["לא יודע"]);
  await expect(page.getByText("התשובה קצרה מדי")).toBeVisible();
  await answerAll(page, [
    "אנשים מחפשים חדר פנוי עשר דקות כל פעם ופגישות מתנגשות",
    "כל עובדי המשרד, בערך מאה ועשרים איש",
    "בודקים איזה חדר פנוי, מזמינים חדר, מקבלים תזכורת",
    "יומני החדרים הקיימים",
    "רק קריאה מהיומן",
    "לא, אין מידע אישי",
    "פחות התנגשויות ופחות זמן חיפוש לכל פגישה",
  ]);
  await expect(page.getByText("100%")).toBeVisible();
  await generate(page);
});

test("problem-first: proposes solution patterns, then a PRD", async ({ page }) => {
  await loginAsSubmitter(page);
  await page.goto("/submit/problem");
  await page.getByLabel("שם קצר").fill("E2E דוח שעות ידני");
  await page.getByLabel("תיאור").fill("כל חודש מעתיקים ידנית שעות מאקסל לדוח למנהלים, זה לוקח יום שלם");
  await page.getByRole("button", { name: "המשך לאשף" }).click();
  await expect(page).toHaveURL(/wizard/);
  await answerAll(page, ["צוות התפעול, ארבעה אנשים, כל סוף חודש", "מעתיקים מאקסל ושולחים במייל למנהלים"]);
  await expect(page.getByText("הנה שני כיוונים ריאליים")).toBeVisible();
  await answerAll(page, ["1", "מעלים קובץ, המערכת מאחדת, המנהל מאשר", "קבצי האקסל של הצוות", "רק קריאה, בלי כתיבה", "לא, אין מידע אישי", "הדוח מוכן תוך שעה במקום יום"]);
  await generate(page);
});

test("prototype: recognizes the builder from the link, then a PRD with a security matrix", async ({ page }) => {
  await loginAsSubmitter(page);
  await page.goto("/submit/prototype");
  await page.getByLabel("שם קצר").fill("E2E בוט נהלים");
  await page.getByLabel("תיאור").fill("בניתי בוט שעונה לעובדים על שאלות מתוך מסמכי הנהלים של החברה");
  await page.getByLabel("קישור לפרוטוטייפ").fill("https://policy-helper.lovable.app");
  await expect(page.getByText("זוהה: Lovable")).toBeVisible();
  await page.getByRole("button", { name: "המשך לאשף" }).click();
  await expect(page.getByText(/זיהיתי פרוטוטייפ שנבנה ב-Lovable/)).toBeVisible();
  await answerAll(page, [
    "צוות משאבי אנוש משתמש בו היום, בפרודקשן כל העובדים",
    "מסמכי הנהלים בתיקייה המשותפת",
    "רק קריאה, בלי כתיבה",
    "יש מספרי תעודת זהות בחלק מהמסמכים",
    "הרשאות לפי מחלקה וחיבור ל-SSO",
    "פחות פניות חוזרות למשאבי אנוש",
  ]);
  await generate(page);
  await page.getByRole("tab", { name: /אבטחה/ }).click();
  await expect(page.getByText("MT-01")).toBeVisible();
});
