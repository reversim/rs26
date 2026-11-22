import type { APIRoute } from "astro";
import { sectionLlmsTxt } from "../../helpers/agents/llms";
import { ORG } from "../../config/agentResources";

export const GET: APIRoute = () =>
  new Response(
    `${sectionLlmsTxt({
      title: "about",
      summary: ORG.description,
      links: [
        {
          name: "Team (markdown)",
          path: "/about.md",
          description: "The volunteers organising the summit.",
        },
        {
          name: "Team (HTML)",
          path: "/about",
          description: "The same team with photos and links.",
        },
        {
          name: "Sponsors",
          path: "/sponsors.md",
          description: "The companies backing the summit, by tier.",
        },
        {
          name: "Source code",
          path: ORG.repo,
          description: "The site and the MCP server.",
        },
      ],
    })}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
