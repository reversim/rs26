import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFERENCE } from "../../config.js";
import type { Agenda } from "../../data/agenda.types.js";
import { dataNote, dayLabel } from "../../format.js";
import { hhmm } from "../../logic/time.js";
import { READ_ONLY } from "../args.js";
import { wrap } from "../wrap.js";
import type { DayOverview } from "./conference-info.types.js";

function dayOverview({ day, agenda }: { day: string; agenda: Agenda }): DayOverview {
  const daySessions = agenda.sessions.filter((session) => session.day === day);
  const lastEnd = daySessions
    .map((session) => session.endsAt)
    .sort()
    .at(-1)!;

  return {
    date: day,
    label: dayLabel({ day, agenda }),
    talks: daySessions.filter((session) => !session.isService).length,
    from: hhmm(daySessions[0].startsAt),
    to: hhmm(lastEnd),
  };
}

export function registerConferenceInfo(server: McpServer): void {
  server.registerTool(
    "get_conference_info",
    {
      title: "Conference overview",
      description:
        "Overview of Reversim Summit 2026: dates, website, registration, tracks (with talk counts), rooms and number of sessions.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    wrap({
      tool: "get_conference_info",
      handler: ({ agenda }: { args: Record<string, never>; agenda: Agenda }) => {
        const talks = agenda.sessions.filter((session) => !session.isService);

        return {
          ...CONFERENCE,
          days: agenda.days.map((day) => dayOverview({ day, agenda })),
          tracks: agenda.tracks.map((track) => ({
            name: track,
            talks: talks.filter((session) => session.track === track).length,
          })),
          rooms: agenda.rooms,
          totalTalks: talks.length,
          totalSpeakers: agenda.speakers.size,
          data: dataNote(agenda),
        };
      },
    }),
  );
}
