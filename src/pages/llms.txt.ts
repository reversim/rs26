import type { APIRoute } from "astro";
import { getSessions } from "../helpers/data/getSessions";
import { getSpeakers } from "../helpers/data/getSpeakers";
import { llmsTxt } from "../helpers/agents/llms";

export const GET: APIRoute = async () => {
  const [{ rawSessionsList }, speakers] = await Promise.all([
    getSessions(),
    getSpeakers(),
  ]);

  return new Response(
    `${llmsTxt({
      talks: rawSessionsList.filter((session) => session.description).length,
      speakers: speakers.length,
    })}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
