import type { APIRoute } from "astro";
import { cocMarkdown, markdown } from "../helpers/agents/markdown";

export const GET: APIRoute = () => markdown(cocMarkdown());
