import type { APIRoute } from "astro";
import skill from "../../../../skills/answer-reversim-2026-questions/SKILL.md?raw";
import { markdown } from "../../../helpers/agents/markdown";

export const GET: APIRoute = () => markdown(skill);
