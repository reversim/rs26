import type { APIRoute } from "astro";
import { ardCatalog, json } from "../../helpers/agents/discovery";

export const GET: APIRoute = () => json(ardCatalog());
