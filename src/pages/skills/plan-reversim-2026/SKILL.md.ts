import type { APIRoute } from "astro";
// The repo's `skills/` directory is the source of truth: the same file ships in
// the agent plugin (see plugin.json) and is served here.
import skill from "../../../../skills/plan-reversim-2026/SKILL.md?raw";
import { markdown } from "../../../helpers/agents/markdown";

export const GET: APIRoute = () => markdown(skill);
