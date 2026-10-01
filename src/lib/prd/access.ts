// Shared loading and permission checks for the /api/prds/[id]/* routes.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SessionUser } from "../auth/guard";

export async function loadPrdFor(user: SessionUser, id: string) {
  const prd = await db.query.prds.findFirst({ where: eq(schema.prds.id, id) });
  if (!prd) return { error: NextResponse.json({ error: "לא נמצא" }, { status: 404 }) } as const;
  const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, prd.submissionId) });
  if (!sub) return { error: NextResponse.json({ error: "לא נמצא" }, { status: 404 }) } as const;
  const isOwner = sub.submitterId === user.id;
  if (prd.status === "draft" && !isOwner && user.role !== "admin") {
    return { error: NextResponse.json({ error: "לא נמצא" }, { status: 404 }) } as const;
  }
  return { prd, sub, isOwner, error: null } as const;
}

export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
