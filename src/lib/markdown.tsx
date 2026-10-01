// A small renderer for the PRD Markdown this app generates (lib/prd/render.ts):
// headings, paragraphs, bullet and numbered lists, tables and **bold**. It
// only has to read our own output, so it stays tiny instead of pulling in a
// Markdown library. Text is rendered as React text, never as raw HTML.
import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

export function Markdown({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <div className="prose-prd">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const head = lines[0];
        if (head.startsWith("### ")) return <h3 key={i}>{inline(head.slice(4))}</h3>;
        if (head.startsWith("## ")) return <h2 key={i}>{inline(head.slice(3))}</h2>;
        if (head.startsWith("# ")) return <h1 key={i}>{inline(head.slice(2))}</h1>;
        if (lines.every((l) => l.startsWith("|"))) {
          const [header, , ...rows] = lines;
          return (
            <div key={i} className="overflow-x-auto">
              <table>
                <thead>
                  <tr>{cells(header).map((c, j) => <th key={j}>{inline(c)}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, k) => (
                    <tr key={k}>{cells(r).map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        }
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\.\s/, ""))}</li>)}</ol>;
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}
