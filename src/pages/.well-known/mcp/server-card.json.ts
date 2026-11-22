import type { APIRoute } from "astro";
import { json, serverCard } from "../../../helpers/agents/discovery";

export const GET: APIRoute = () => json(serverCard());
