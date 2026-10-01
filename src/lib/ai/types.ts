import type { PrdContent } from "../prd/schema";
import type { Finding } from "../policy/types";

export type Branch = "idea" | "problem" | "prototype";

/** Answers collected so far. Keys starting with "_" are wizard bookkeeping. */
export type WizardState = Record<string, string>;

export interface WizardContext {
  branch: Branch;
  title: string;
  rawInput: string;
  attachments: { provider: string | null; externalUrl: string | null; metadata: Record<string, unknown> | null }[];
}

export interface WizardTurn {
  reply: string;
  state: WizardState;
  /** True when the last answer was too thin and a follow-up was asked (FR-21). */
  shallow: boolean;
  completeness: number;
  done: boolean;
}

export interface SynthesisInput extends WizardContext {
  state: WizardState;
  submitterName: string;
  departmentName: string;
}

export interface WireframeSpec {
  screens: { name: string; purpose: string; components: WireframeComponent[] }[];
}

export type WireframeComponent =
  | { kind: "header"; text: string }
  | { kind: "form"; fields: string[] }
  | { kind: "table"; columns: string[] }
  | { kind: "filters"; items: string[] }
  | { kind: "stats"; items: string[] }
  | { kind: "chat"; prompt: string }
  | { kind: "timeline"; steps: string[] }
  | { kind: "button"; text: string };

/**
 * Everything the app asks of a model. The mock implements it
 * deterministically; real providers (lib/ai/registry.ts) implement the same
 * shape, so nothing above this layer knows which one is running.
 */
export interface AiProvider {
  name: string;
  start(ctx: WizardContext): Promise<WizardTurn>;
  turn(ctx: WizardContext, state: WizardState, message: string): Promise<WizardTurn>;
  synthesize(input: SynthesisInput): Promise<PrdContent>;
  /** FR-52: may only add findings; the engine merges them. */
  semanticReview(content: PrdContent, codeFindings: Finding[]): Promise<Finding[]>;
  wireframe(content: PrdContent): Promise<WireframeSpec>;
}
