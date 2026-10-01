import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth/guard";
import { extractLink } from "@/lib/extract";

export async function POST(req: Request) {
  const { error } = await apiUser();
  if (error) return error;
  const body = z.object({ url: z.string().max(500) }).safeParse(await req.json().catch(() => null));
  const info = body.success ? extractLink(body.data.url) : null;
  if (!info) return NextResponse.json({ error: "קישור לא תקין" }, { status: 400 });
  return NextResponse.json(info);
}
