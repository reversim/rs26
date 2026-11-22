import type { APIRoute } from "astro";
import { markdown, mcpGuideMarkdown } from "../helpers/agents/markdown";

export const GET: APIRoute = () => markdown(mcpGuideMarkdown());
