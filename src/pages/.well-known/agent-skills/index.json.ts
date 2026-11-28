import type { APIRoute } from "astro";
import { agentSkillsIndex, json } from "../../../helpers/agents/discovery";

export const GET: APIRoute = () => json(agentSkillsIndex());
