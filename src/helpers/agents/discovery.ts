// The documents an agent fetches before it knows anything about us: the ARD
// catalog, the MCP server card and the Agent Skills index. All three are built
// from config/mcpTools and config/agentResources so they describe the server
// that `functions/` actually ships.

import { event } from "../../config/event";
import { MCP_ENDPOINT, ORG, SITE_URL } from "../../config/agentResources";
import { mcpExamples, mcpTools } from "../../config/mcpTools";

export const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

export const json = (body: unknown): Response =>
  new Response(`${JSON.stringify(body, null, 2)}\n`, {
    headers: JSON_HEADERS,
  });

const SERVER_CARD_PATH = "/.well-known/mcp/server-card.json";
export const SERVER_CARD_URL = `${SITE_URL}${SERVER_CARD_PATH}`;

/** Branding every registry and client asks for: title, icon, description. */
const ICONS = [
  {
    src: `${SITE_URL}/apple-touch-icon.png`,
    mimeType: "image/png",
    sizes: ["180x180"],
  },
  {
    src: `${SITE_URL}/favicon-dark-mode.png`,
    mimeType: "image/png",
    sizes: ["32x32"],
  },
];

/** The MCP server card, per the mcp-server-card v1 schema. */
export function serverCard() {
  return {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
    name: "com.reversim.summit2026/agenda",
    title: `${event.name} agenda`,
    version: "1.0.0",
    description:
      `Plan your two days at ${event.name} (${event.dates}, Tel Aviv): search the agenda, ` +
      "get talks ranked against your interests, build a clash-free schedule and export it " +
      "to your calendar. Read-only, free, no login.",
    websiteUrl: `${SITE_URL}/mcp-guide`,
    icons: ICONS,
    serverInfo: {
      name: "reversim-2026",
      title: event.name,
      version: "1.0.0",
    },
    protocolVersion: "2025-06-18",
    transport: { type: "streamable-http", endpoint: MCP_ENDPOINT },
    remotes: [{ type: "streamable-http", url: MCP_ENDPOINT }],
    authentication: { required: false, schemes: [] },
    capabilities: { tools: {}, resources: {}, prompts: {} },
    tools: mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.what,
      // Every tool reads the published agenda and nothing else.
      annotations: { readOnlyHint: true, openWorldHint: false },
    })),
    repository: { url: ORG.repo, source: "github" },
  };
}

/**
 * The ARD catalog. Served at both /.well-known/ard.json and the older
 * /.well-known/ai-catalog.json, which MCP clients still read.
 */
export function ardCatalog() {
  return {
    $schema: "https://agenticresourcediscovery.org/schemas/ard.schema.json",
    version: "1.0",
    updatedAt: `${event.year}-01-01T00:00:00Z`,
    publisher: {
      name: ORG.name,
      url: SITE_URL,
      email: ORG.email,
    },
    entries: [
      {
        identifier: "urn:air:summit2026.reversim.com:server:agenda",
        displayName: `${event.name} agenda`,
        type: "application/mcp-server-card+json",
        url: SERVER_CARD_URL,
        description:
          `Read-only MCP server for ${event.name}: search the agenda, rank talks against an ` +
          "attendee's interests, build a clash-free schedule, export an .ics file. " +
          "No authentication.",
        capabilities: mcpTools.map((tool) => tool.name),
        representativeQueries: [...mcpExamples],
        tags: ["conference", "agenda", "scheduling", "israel", "software"],
        version: "1.0.0",
      },
      {
        identifier: "urn:air:summit2026.reversim.com:doc:llms",
        displayName: `${event.name} site index for agents`,
        type: "text/plain",
        url: `${SITE_URL}/llms.txt`,
        description:
          "llms.txt index of every agent-readable resource on this domain: markdown twins of " +
          "each page, the session feed and the MCP server.",
        representativeQueries: [
          "what does the reversim summit 2026 site publish for agents",
          "where is the reversim 2026 agenda in machine-readable form",
        ],
        tags: ["llms.txt", "index"],
      },
      {
        identifier: "urn:air:summit2026.reversim.com:doc:agents",
        displayName: "Agent instructions",
        type: "text/markdown",
        url: `${SITE_URL}/agents.md`,
        description:
          "When to use the MCP server, the markdown pages and the session feed, plus the " +
          "rules we ask agents to follow.",
        representativeQueries: [
          "how should an agent use the reversim 2026 site",
          "which reversim 2026 interface should i call for scheduling",
        ],
        tags: ["instructions", "when-to-use"],
      },
      {
        identifier: "urn:air:summit2026.reversim.com:data:sessions",
        displayName: `${event.name} session feed`,
        type: "application/jsonl",
        url: `${SITE_URL}/feeds/sessions.jsonl`,
        description:
          "Every talk as one schema.org Event per line: title, abstract, start and end time, " +
          "room, track and speakers. For bulk ingest without crawling.",
        representativeQueries: [
          "list every talk at reversim summit 2026",
          "ingest the reversim 2026 schedule as structured data",
        ],
        tags: ["feed", "jsonl", "schema.org"],
      },
      {
        identifier: "urn:air:summit2026.reversim.com:skills:index",
        displayName: "Agent skills index",
        type: "application/json",
        url: `${SITE_URL}/.well-known/agent-skills/index.json`,
        description:
          "The skills this domain publishes for agents helping an attendee plan the conference.",
        representativeQueries: [
          "what skills does reversim summit 2026 publish",
          "help me plan my reversim 2026 days",
        ],
        tags: ["skills"],
      },
    ],
  };
}

/** The Agent Skills index: named capabilities, each with its own SKILL.md. */
export function agentSkillsIndex() {
  return {
    version: "1.0",
    publisher: { name: ORG.name, url: SITE_URL },
    skills: [
      {
        name: "plan-reversim-2026",
        description:
          `Plan an attendee's two days at ${event.name} (${event.dates}, Tel Aviv): work out ` +
          "what fits their role and interests, build a clash-free schedule across both days, " +
          "and export it to their calendar. Use when someone is attending the summit and " +
          "wants to know what to see.",
        path: "/skills/plan-reversim-2026/SKILL.md",
        url: `${SITE_URL}/skills/plan-reversim-2026/SKILL.md`,
        version: "1.0.0",
        license: "MIT",
        mcp: { transport: "streamable-http", url: MCP_ENDPOINT },
      },
      {
        name: "answer-reversim-2026-questions",
        description:
          `Answer questions about ${event.name} itself — dates, venue, travel, registration, ` +
          "tracks, who is speaking, the code of conduct — from the conference's own published " +
          "pages rather than from memory. Use for factual questions about the event.",
        path: "/skills/answer-reversim-2026-questions/SKILL.md",
        url: `${SITE_URL}/skills/answer-reversim-2026-questions/SKILL.md`,
        version: "1.0.0",
        license: "MIT",
      },
    ],
  };
}
