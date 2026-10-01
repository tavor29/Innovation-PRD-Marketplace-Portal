// Nightly reset of the public demo (vercel.json cron). Vercel calls it with
// "Authorization: Bearer $CRON_SECRET"; without that secret configured it
// refuses every call.
import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/demo/seed";

export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await seedDemo();
  return NextResponse.json({ ok: true, resetAt: new Date().toISOString() });
}
