import type { APIRoute } from "astro";
import { getSpeakers } from "../helpers/data/getSpeakers";
import { markdown, speakersMarkdown } from "../helpers/agents/markdown";

export const GET: APIRoute = async () => {
  return markdown(speakersMarkdown(await getSpeakers()));
};
