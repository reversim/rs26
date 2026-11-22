import type { APIRoute } from "astro";
import { getSessions } from "../helpers/data/getSessions";
import { getSpeakers } from "../helpers/data/getSpeakers";
import { homeMarkdown, markdown } from "../helpers/agents/markdown";

export const GET: APIRoute = async () => {
  const [{ rawSessionsList }, speakers] = await Promise.all([
    getSessions(),
    getSpeakers(),
  ]);

  return markdown(
    homeMarkdown({
      talks: rawSessionsList.filter((session) => session.description).length,
      speakers: speakers.length,
    }),
  );
};
