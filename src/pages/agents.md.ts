import type { APIRoute } from "astro";
import { getSessions } from "../helpers/data/getSessions";
import { getSpeakers } from "../helpers/data/getSpeakers";
import { agentsMarkdown } from "../helpers/agents/llms";
import { markdown } from "../helpers/agents/markdown";

export const GET: APIRoute = async () => {
  const [{ rawSessionsList }, speakers] = await Promise.all([
    getSessions(),
    getSpeakers(),
  ]);

  return markdown(
    agentsMarkdown({
      talks: rawSessionsList.filter((session) => session.description).length,
      speakers: speakers.length,
    }),
  );
};
