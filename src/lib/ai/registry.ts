// Provider registry (NFR-07, PRD 2.3 open decisions): AI_PROVIDER picks the
// implementation. Only the deterministic mock exists so far; the real
// providers (anthropic | openai | azure) plug in here with the same
// AiProvider shape. Until they do, any other value falls back to the mock
// and says so in the server log.
import { mockProvider } from "./mock";
import type { AiProvider } from "./types";

let warned = false;

export function getAi(): AiProvider {
  const name = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (name !== "mock" && !warned) {
    warned = true;
    console.warn(`[ai] AI_PROVIDER=${name} is not wired yet; using the deterministic mock.`);
  }
  return mockProvider;
}
