// FR-33: what an attachment tells us without opening a repo (full repo
// analysis is Phase 2). Links are matched to the AI app builder that hosts
// them; small text files contribute their first lines.
export const builders: { id: string; label: string; hosts: RegExp }[] = [
  { id: "lovable", label: "Lovable", hosts: /(^|\.)lovable\.(app|dev)$/ },
  { id: "bolt", label: "Bolt", hosts: /(^|\.)bolt\.(new|host)$/ },
  { id: "base44", label: "Base44", hosts: /(^|\.)base44\.(app|com)$/ },
  { id: "v0", label: "v0", hosts: /(^|\.)v0\.(dev|app)$/ },
  { id: "replit", label: "Replit", hosts: /(^|\.)replit\.(app|dev|com)$/ },
  { id: "github", label: "GitHub", hosts: /(^|\.)github\.(com|io)$/ },
];

export interface LinkInfo {
  provider: string;
  providerLabel: string;
  url: string;
  host: string;
  title: string;
}

export function extractLink(raw: string): LinkInfo | null {
  let url: URL;
  try {
    url = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
  const host = url.hostname.toLowerCase();
  const builder = builders.find((b) => b.hosts.test(host));
  // A readable name from the subdomain or path, e.g. "expense-tracker".
  const slug = builder?.id === "github" ? url.pathname.split("/").filter(Boolean)[1] : host.split(".")[0];
  const title = (slug ?? host).replace(/[-_]+/g, " ").trim();
  return { provider: builder?.id ?? "other", providerLabel: builder?.label ?? host, url: url.toString(), host, title };
}

export interface FileInfo {
  name: string;
  size: number;
  mime: string;
  excerpt: string;
}

const textual = /^(text\/|application\/(json|xml|x-yaml|yaml|markdown))/;

export function extractFile(name: string, mime: string, bytes: Uint8Array): FileInfo {
  const excerpt = textual.test(mime) || /\.(md|txt|csv|json)$/i.test(name) ? new TextDecoder().decode(bytes.slice(0, 4000)).split("\n").slice(0, 20).join("\n") : "";
  return { name, size: bytes.byteLength, mime, excerpt };
}
