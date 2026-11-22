import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Agenda } from "../../data/agenda.types.js";
import { full } from "../../format.js";
import { READ_ONLY, sessionId } from "../args.js";
import { existingIds } from "../insight.js";
import { wrap } from "../wrap.js";
import type { GetSessionsArgs } from "./get-sessions.types.js";

function getSessions({ args, agenda }: { args: GetSessionsArgs; agenda: Agenda }) {
  const byId = new Map(agenda.sessions.map((session) => [session.id, session]));

  return {
    sessions: args.ids.filter((id) => byId.has(id)).map((id) => full({ session: byId.get(id)!, agenda })),
    notFound: args.ids.filter((id) => !byId.has(id)),
  };
}

export function registerGetSessions(server: McpServer): void {
  server.registerTool(
    "get_sessions",
    {
      title: "Session details",
      description: "Full details for one or more sessions by id: abstract, time, room, track, link, and speaker bios.",
      inputSchema: {
        ids: z.array(sessionId).min(1).max(20).describe("Session ids (from search/recommend results)."),
      },
      annotations: READ_ONLY,
    },
    wrap({
      tool: "get_sessions",
      handler: getSessions,
      insight: ({ args, agenda, result }) => ({
        resultCount: result.sessions.length,
        params: { requested: args.ids.length },
        selected: { source: "get_sessions", ids: existingIds({ agenda, ids: args.ids }) },
      }),
    }),
  );
}
