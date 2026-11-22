import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Agenda } from "../../data/agenda.types.js";
import { UserError } from "../../errors.js";
import { buildIcs } from "../../logic/ics.js";
import { READ_ONLY, sessionId } from "../args.js";
import { existingIds } from "../insight.js";
import { wrap } from "../wrap.js";
import type { ExportCalendarArgs } from "./export-calendar.types.js";

function exportCalendar({ args, agenda }: { args: ExportCalendarArgs; agenda: Agenda }): CallToolResult {
  const byId = new Map(agenda.sessions.map((session) => [session.id, session]));
  const sessions = [...new Set(args.sessionIds)]
    .filter((id) => byId.has(id))
    .map((id) => byId.get(id)!)
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const missing = args.sessionIds.filter((id) => !byId.has(id));
  if (sessions.length === 0) {
    throw new UserError(`None of these ids exist: ${missing.join(", ")}`);
  }

  const ics = buildIcs({ sessions });

  return {
    content: [
      {
        type: "text",
        text:
          `Calendar with ${sessions.length} session(s)` +
          (missing.length ? ` (unknown ids skipped: ${missing.join(", ")})` : "") +
          ". Save the following as rs26.ics and open it with your calendar app:\n\n" +
          ics,
      },
      {
        type: "resource",
        resource: { uri: "reversim://calendar/rs26.ics", mimeType: "text/calendar", text: ics },
      },
    ],
  };
}

export function registerExportCalendar(server: McpServer): void {
  server.registerTool(
    "export_calendar",
    {
      title: "Export to calendar (.ics)",
      description:
        "Creates an iCalendar (.ics) file for the chosen sessions, with correct times, rooms, links and a 5-minute reminder. " +
        "Give the attendee the file content to save as rs26.ics and open in Google Calendar / Outlook / Apple Calendar.",
      inputSchema: {
        sessionIds: z
          .array(sessionId)
          .min(1)
          .max(60)
          .describe("Session ids, e.g. the sessionIds returned by build_schedule."),
      },
      annotations: READ_ONLY,
    },
    wrap({
      tool: "export_calendar",
      handler: exportCalendar,
      insight: ({ args, agenda }) => {
        const ids = existingIds({ agenda, ids: args.sessionIds });

        return {
          resultCount: ids.length,
          selected: { source: "export_calendar", ids },
          milestones: [{ name: "calendar_exported", params: { session_count: ids.length } }],
        };
      },
    }),
  );
}
