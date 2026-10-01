// FR-42: a wireframe spec from the PRD. Rendered as an interactive mockup by
// components/prd/wireframepreview.tsx. Deterministic in the mock provider.
import type { PrdContent } from "../prd/schema";
import type { WireframeComponent, WireframeSpec } from "./types";

export function wireframeFromContent(c: PrdContent): WireframeSpec {
  const fields = (c.dataSources.length ? c.dataSources : ["כותרת", "תיאור", "קובץ מצורף"]).slice(0, 4);
  const conversational = c.integrations.includes("external_ai") || /שאל|חיפוש|עוזר/.test(c.summary.solution);

  const input: WireframeComponent[] = conversational
    ? [{ kind: "header", text: c.title }, { kind: "chat", prompt: "שאל/י שאלה…" }]
    : [{ kind: "header", text: c.title }, { kind: "form", fields }, { kind: "button", text: "שליחה" }];

  return {
    screens: [
      { name: "מסך ראשי", purpose: c.workflows[0] ?? c.summary.solution, components: input },
      {
        name: "רשימה ומעקב",
        purpose: "כל הפריטים והסטטוס שלהם",
        components: [
          { kind: "header", text: "מעקב" },
          { kind: "stats", items: ["פתוחים", "בטיפול", "הושלמו"] },
          { kind: "filters", items: ["סטטוס", "תאריך", "אחראי/ת"] },
          { kind: "table", columns: ["פריט", "סטטוס", "אחראי/ת", "עודכן"] },
        ],
      },
      {
        name: "פרטי פריט",
        purpose: c.workflows[1] ?? "צפייה בפרטים ועדכון",
        components: [
          { kind: "header", text: "פרטים" },
          { kind: "timeline", steps: c.workflows.slice(0, 4) },
          { kind: "button", text: "עדכון סטטוס" },
        ],
      },
    ],
  };
}
