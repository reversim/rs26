import type { APIRoute } from "astro";
import { getSessions } from "../helpers/data/getSessions";
import { getSpeakers } from "../helpers/data/getSpeakers";
import {
  agendaMarkdown,
  homeMarkdown,
  markdown,
  sessionsMarkdown,
  speakersMarkdown,
} from "../helpers/agents/markdown";

/**
 * The whole site as one markdown document, for agents that would rather make a
 * single request than follow /llms.txt link by link.
 */
export const GET: APIRoute = async () => {
  const [{ rawSessionsList }, speakers] = await Promise.all([
    getSessions(),
    getSpeakers(),
  ]);
  const talks = rawSessionsList.filter((session) => session.description);

  return markdown(
    [
      homeMarkdown({ talks: talks.length, speakers: speakers.length }),
      agendaMarkdown(rawSessionsList),
      speakersMarkdown(speakers),
      sessionsMarkdown(talks),
    ].join("\n\n---\n\n"),
  );
};
