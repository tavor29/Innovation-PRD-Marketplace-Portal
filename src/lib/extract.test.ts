import { describe, expect, it } from "vitest";
import { extractFile, extractLink } from "./extract";

describe("prototype links (FR-33)", () => {
  it.each([
    ["https://expense-tracker.lovable.app", "lovable"],
    ["bolt.new/~/sb1-abc", "bolt"],
    ["https://my-app.base44.app/home", "base44"],
    ["https://v0.dev/chat/xyz", "v0"],
    ["https://github.com/acme/expense-tracker", "github"],
    ["https://example.com/thing", "other"],
  ])("%s → %s", (url, provider) => {
    expect(extractLink(url)?.provider).toBe(provider);
  });

  it("names a GitHub prototype after its repo", () => {
    expect(extractLink("https://github.com/acme/expense-tracker")?.title).toBe("expense tracker");
  });

  it("rejects things that aren't links", () => {
    expect(extractLink("not a url")).toBeNull();
    expect(extractLink("javascript:alert(1)")).toBeNull();
  });
});

describe("files", () => {
  it("keeps an excerpt of text files only", () => {
    const md = extractFile("notes.md", "text/markdown", new TextEncoder().encode("# Notes\nline 2"));
    expect(md.excerpt).toContain("# Notes");
    expect(extractFile("a.png", "image/png", new Uint8Array([1, 2, 3])).excerpt).toBe("");
  });
});
