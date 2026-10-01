// Serve an uploaded attachment to signed-in users who can see its submission.
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/auth/guard";
import { storage } from "@/lib/storage/adapter";

export async function GET(_req: Request, ctx: RouteContext<"/api/storage/[...key]">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const key = (await ctx.params).key.join("/");
  const [att] = await db.select().from(schema.attachments).where(eq(schema.attachments.storagePath, key));
  if (!att) return new Response("not found", { status: 404 });
  const sub = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, att.submissionId) });
  if (!sub || (sub.submitterId !== user.id && user.role === "submitter")) return new Response("not found", { status: 404 });
  const bytes = await storage().get(key);
  if (!bytes) return new Response("not found", { status: 404 });
  const meta = (att.extractedMetadata ?? {}) as { mime?: string; name?: string };
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": meta.mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.name ?? "file")}`,
    },
  });
}
