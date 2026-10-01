// FR-41: download the PRD as a .md file.
import { apiUser } from "@/lib/auth/guard";
import { loadPrdFor } from "@/lib/prd/access";

export async function GET(_req: Request, ctx: RouteContext<"/api/prds/[id]/export.md">) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await loadPrdFor(user, (await ctx.params).id);
  if (r.error) return r.error;
  const name = `PRD-${r.prd.title.replace(/[^\w֐-׿-]+/g, "-")}-v${r.prd.version}.md`;
  return new Response(r.prd.contentMd, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="prd-v${r.prd.version}.md"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
