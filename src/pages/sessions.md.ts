import type { APIRoute } from "astro";
import { getSessions } from "../helpers/data/getSessions";
import { markdown, sessionsMarkdown } from "../helpers/agents/markdown";

export const GET: APIRoute = async () => {
  const { rawSessionsList } = await getSessions();

  // Service sessions (breaks, registration) carry no abstract; the sessions
  // page hides them, so the twin does too.
  return markdown(
    sessionsMarkdown(rawSessionsList.filter((session) => session.description)),
  );
};
