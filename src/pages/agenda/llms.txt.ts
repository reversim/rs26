import type { APIRoute } from "astro";
import { sectionLlmsTxt } from "../../helpers/agents/llms";
import { event } from "../../config/event";

export const GET: APIRoute = () =>
  new Response(
    `${sectionLlmsTxt({
      title: "agenda",
      summary: `The two-day schedule for ${event.name} (${event.dates}), by day, time and room.`,
      links: [
        {
          name: "Agenda (markdown)",
          path: "/agenda.md",
          description: "Every session with time, room, track and speakers.",
        },
        {
          name: "Agenda (HTML)",
          path: "/agenda",
          description: "The interactive grid, filterable by day.",
        },
        {
          name: "Sessions",
          path: "/sessions.md",
          description: "The same talks with their full abstracts.",
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
