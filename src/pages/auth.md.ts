import type { APIRoute } from "astro";
import { authMarkdown } from "../helpers/agents/llms";
import { markdown } from "../helpers/agents/markdown";

export const GET: APIRoute = () => markdown(authMarkdown());
