import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Schema changes go over a direct connection when one exists (Neon sets
    // DATABASE_URL_UNPOOLED); the app itself uses the pooled DATABASE_URL.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "postgres://portal:portal@localhost:5432/portal",
  },
  verbose: true,
  strict: true,
});
