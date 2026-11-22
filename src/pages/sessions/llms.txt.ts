import type { APIRoute } from "astro";
import { sectionLlmsTxt } from "../../helpers/agents/llms";

export const GET: APIRoute = () =>
  new Response(
    `${sectionLlmsTxt({
      title: "sessions",
      summary:
        "Every talk, with its abstract, day, time, room, track and speakers.",
      links: [
        {
          name: "Sessions (markdown)",
          path: "/sessions.md",
          description: "All talks with abstracts, in running order.",
        },
        {
          name: "Sessions (HTML)",
          path: "/sessions",
          description: "The browsable lineup, filterable by day.",
        },
        {
          name: "One session",
          path: "/session/<slug>.md",
          description: "A single talk with full speaker bios.",
        },
        {
          name: "Session feed",
          path: "/feeds/sessions.jsonl",
          description: "One schema.org Event per line.",
        },
      ],
    })}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
