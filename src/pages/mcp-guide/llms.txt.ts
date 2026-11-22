import type { APIRoute } from "astro";
import { sectionLlmsTxt } from "../../helpers/agents/llms";
import { MCP_ENDPOINT } from "../../config/agentResources";

export const GET: APIRoute = () =>
  new Response(
    `${sectionLlmsTxt({
      title: "MCP server",
      summary: `The agent interface: a free, read-only MCP server at ${MCP_ENDPOINT} that searches the agenda, ranks talks and builds schedules.`,
      links: [
        {
          name: "MCP guide (markdown)",
          path: "/mcp-guide.md",
          description: "Endpoint, client config, tool list, example prompts.",
        },
        {
          name: "MCP guide (HTML)",
          path: "/mcp-guide",
          description: "The same guide for humans, with copy buttons.",
        },
        {
          name: "Agent instructions",
          path: "/agents.md",
          description: "When to use the server versus the markdown pages.",
        },
        {
          name: "Authentication",
          path: "/auth.md",
          description: "There is none; everything is public and read-only.",
        },
      ],
    })}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
