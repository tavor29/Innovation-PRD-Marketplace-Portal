// A policy rule's detector is data, not code, so an admin can edit it in the
// UI without a deploy (FR-14). It is a small condition tree over the PRD's
// machine-checkable fields.
import { z } from "zod";

export const detectorFields = ["integrations", "writeTargets", "dataAccessPattern", "authModel", "piiCategories"] as const;
export type DetectorField = (typeof detectorFields)[number];

export type Detector =
  | { field: DetectorField; op: "includes_any" | "equals_any"; values: string[] }
  | { field: DetectorField; op: "nonempty" }
  | { all: Detector[] }
  | { any: Detector[] };

export const detectorSchema: z.ZodType<Detector> = z.lazy(() =>
  z.union([
    z.object({
      field: z.enum(detectorFields),
      op: z.enum(["includes_any", "equals_any"]),
      values: z.array(z.string().min(1)).min(1),
    }),
    z.object({ field: z.enum(detectorFields), op: z.literal("nonempty") }),
    z.object({ all: z.array(detectorSchema).min(1) }),
    z.object({ any: z.array(detectorSchema).min(1) }),
  ]),
);

export type RuleType = "hard_ban" | "requires_mitigation" | "advisory";
export type Severity = "low" | "medium" | "high" | "critical";

export interface RuleInput {
  code: string;
  titleHe: string;
  type: RuleType;
  severity: Severity;
  detector: Detector;
  mitigationTemplateMd: string;
  isActive: boolean;
}

export interface Finding {
  ruleCode: string;
  ruleType: RuleType;
  severity: Severity;
  title: string;
  evidence: string;
  mitigationMd: string;
  source: "code" | "llm";
}

export type RiskLevel = "none" | "low" | "medium" | "high" | "blocked";
