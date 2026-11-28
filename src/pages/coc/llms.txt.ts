import type { APIRoute } from "astro";
import { sectionLlmsTxt } from "../../helpers/agents/llms";

export const GET: APIRoute = () =>
  new Response(
    `${sectionLlmsTxt({
      title: "code of conduct",
      summary:
        "The conduct rules every attendee, speaker, sponsor and volunteer agrees to.",
      links: [
        {
          name: "Code of conduct (markdown)",
          path: "/coc.md",
          description: "The full text, quick and less-quick versions.",
        },
        {
          name: "Code of conduct (HTML)",
          path: "/coc",
          description: "The same text on the site.",
        },
      ],
    })}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
