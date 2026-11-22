import type { APIRoute } from "astro";
import { sectionLlmsTxt } from "../../helpers/agents/llms";

export const GET: APIRoute = () =>
  new Response(
    `${sectionLlmsTxt({
      title: "speakers",
      summary:
        "The speaker lineup: who is speaking, what they do, and which talks are theirs.",
      links: [
        {
          name: "Speakers (markdown)",
          path: "/speakers.md",
          description: "Every speaker with their tagline.",
        },
        {
          name: "Speakers (HTML)",
          path: "/speakers",
          description: "The browsable grid, filterable by day.",
        },
        {
          name: "One speaker",
          path: "/speaker/<slug>.md",
          description: "A single speaker: bio, talks and links.",
        },
      ],
    })}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
