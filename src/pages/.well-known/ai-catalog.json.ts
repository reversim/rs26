import type { APIRoute } from "astro";
import { ardCatalog, json } from "../../helpers/agents/discovery";

// The older name for the same catalog; MCP clients still look here first.
export const GET: APIRoute = () => json(ardCatalog());
