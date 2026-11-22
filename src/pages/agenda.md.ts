import type { APIRoute } from "astro";
import { getSessions } from "../helpers/data/getSessions";
import { agendaMarkdown, markdown } from "../helpers/agents/markdown";

export const GET: APIRoute = async () => {
  const { rawSessionsList } = await getSessions();

  return markdown(agendaMarkdown(rawSessionsList));
};
