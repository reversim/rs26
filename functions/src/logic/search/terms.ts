import type { Term } from "./terms.types.js";

const STOPWORDS = new Set(
  "a an and are as at be by for from how i in into is it its me my of on or our so that the this to we what when with you your want like love interested interest about talks talk sessions session stuff things more also".split(
    " ",
  ),
);

/**
 * Small domain thesaurus: a term on the left also matches the terms on the right.
 * Keeps "llm" finding "AI" talks, "k8s" finding "kubernetes", etc.
 */
const SYNONYMS: Record<string, string[]> = {
  ai: ["llm", "llms", "genai", "agent", "agents", "agentic", "ml", "model", "models"],
  llm: ["ai", "llms", "genai", "model", "models", "gpt"],
  llms: ["llm", "ai", "genai"],
  genai: ["ai", "llm", "llms"],
  ml: ["ai", "machine", "learning", "model", "models", "training"],
  agent: ["agents", "agentic", "ai"],
  agents: ["agent", "agentic", "ai"],
  agentic: ["agent", "agents", "ai"],
  frontend: ["web", "react", "browser", "ui", "css", "javascript", "product"],
  web: ["frontend", "browser", "react"],
  react: ["frontend", "javascript", "web"],
  mobile: ["ios", "android", "app", "native"],
  backend: ["server", "microservices", "api", "database", "distributed", "scale", "infrastructure"],
  infra: ["infrastructure", "cloud", "devops", "platform", "kubernetes"],
  infrastructure: ["infra", "cloud", "platform"],
  devops: ["ops", "infrastructure", "cloud", "ci", "deployment", "kubernetes", "sre"],
  sre: ["production", "incidents", "reliability", "on-call", "monitoring", "observability"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s", "cloud"],
  cloud: ["aws", "gcp", "azure", "infrastructure"],
  security: ["secure", "hacker", "attack", "cyber", "guardrails", "vulnerability"],
  cyber: ["security"],
  data: ["database", "analytics", "pipeline", "dataset"],
  database: ["db", "sql", "postgres", "data"],
  performance: ["fast", "latency", "optimization", "cache", "caches", "scale"],
  testing: ["tests", "qa", "evaluation", "evals"],
  evals: ["evaluation", "evaluating", "judge", "testing"],
  evaluation: ["evals", "evaluating", "judge"],
  career: ["leadership", "management", "growth", "layoff", "skill", "skills", "job"],
  leadership: ["management", "manager", "career", "team", "teams", "culture"],
  management: ["leadership", "manager", "team"],
  culture: ["team", "teams", "people"],
  architecture: ["design", "systems", "microservices", "codebase", "codebases"],
  productivity: ["workflow", "tools", "developer", "experience"],
  rag: ["retrieval", "context", "embeddings", "search"],
  context: ["rag", "prompt", "prompts"],
};

/** Lower-cased, accent-free words of a text, without stopwords. "a/b" also yields "a" and "b". */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9+#/]+/)
    .flatMap((token) => (token.includes("/") ? [token, ...token.split("/")] : [token]))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Very light stemming so "agents"/"agent", "testing"/"test" line up. */
export function stem(token: string): string {
  return token.replace(/(ing|ers|er|es|s)$/, "") || token;
}

/** Turns free-text interests into weighted search terms (original terms weigh more than synonyms). */
export function expandTerms(query: string): Term[] {
  const weights = new Map<string, number>();
  for (const token of tokenize(query)) {
    weights.set(token, Math.max(weights.get(token) ?? 0, 1));
    for (const synonym of SYNONYMS[token] ?? []) {
      weights.set(synonym, Math.max(weights.get(synonym) ?? 0, 0.4));
    }
  }

  return [...weights].map(([term, weight]) => ({ term, weight }));
}
