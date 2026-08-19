import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Assumes the app is running on :3000 with a seeded DB and
 * AI_PROVIDER=mock (so the wizard/synthesizer run without external keys).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "he-IL",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
