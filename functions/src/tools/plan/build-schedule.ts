import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Agenda, Session } from "../../data/agenda.types.js";
import { brief, dayLabel } from "../../format.js";
import { buildSchedule } from "../../logic/schedule/schedule.js";
import type { DaySchedule, ScheduleEntry, ScheduleRequest } from "../../logic/schedule/schedule.types.js";
import { hhmm } from "../../logic/time.js";
import { excludeTracksArg, READ_ONLY, sessionId, text } from "../args.js";
import { existingIds, knownDay, knownTracks } from "../insight.js";
import { wrap } from "../wrap.js";

const mini = (session: Session) => ({
  id: session.id,
  title: session.title,
  room: session.room,
  track: session.track,
});

function timelineEntry(entry: ScheduleEntry) {
  const time = `${hhmm(entry.session.startsAt)}–${hhmm(entry.session.endsAt)}`;
  if (entry.why === "break") {
    return { time, break: entry.session.title, room: entry.session.room };
  }

  return {
    time,
    ...mini(entry.session),
    speakers: entry.session.speakers.map((speaker) => speaker.name),
    why: entry.why,
    ...(entry.matched?.length ? { matched: entry.matched } : {}),
    ...(entry.alternatives.length ? { alsoAtThisTime: entry.alternatives.map(mini) } : {}),
  };
}

function dayView({ day, agenda }: { day: DaySchedule; agenda: Agenda }) {
  return {
    day: dayLabel({ day: day.day, agenda }),
    timeline: day.entries.map(timelineEntry),
    openSlots: day.openSlots.map((slot) => ({
      time: `${hhmm(slot.startsAt)}–${hhmm(slot.endsAt)}`,
      options: slot.options.map(mini),
    })),
  };
}

function schedule({ args, agenda }: { args: ScheduleRequest; agenda: Agenda }) {
  const result = buildSchedule({ agenda, request: args });
  const pickedIds = result.days.flatMap((day) =>
    day.entries.filter((entry) => entry.why !== "break").map((entry) => entry.session.id),
  );

  return {
    days: result.days.map((day) => dayView({ day, agenda })),
    conflicts: result.conflicts.map((conflict) => ({
      wanted: { ...mini(conflict.wanted), when: brief({ session: conflict.wanted, agenda }).when },
      clashesWith: conflict.clashesWith.map(mini),
    })),
    ...(result.unknownIds.length ? { unknownIds: result.unknownIds } : {}),
    sessionIds: pickedIds,
    next: "Review with the attendee, swap via alsoAtThisTime/openSlots if they prefer, then call export_calendar with sessionIds.",
  };
}

export function registerBuildSchedule(server: McpServer): void {
  server.registerTool(
    "build_schedule",
    {
      title: "Build a personal schedule",
      description:
        "Builds a clash-free personal schedule. Sessions in mustSee are prioritised in the order given; remaining slots are filled " +
        "with the best matches for `interests` (plenary keynotes are included when nothing better fits). Returns the timeline per day " +
        "with breaks, alternatives running at the same time, open slots, and any must-see sessions that clash.",
      inputSchema: {
        mustSee: z
          .array(sessionId)
          .max(40)
          .optional()
          .describe("Session ids the attendee wants, most important first."),
        interests: text(500).optional().describe("Free-text interests used to fill the remaining slots."),
        days: z
          .array(text(20))
          .max(2)
          .optional()
          .describe('Restrict to these days, e.g. ["day 1"]. Default: both days.'),
        excludeTracks: excludeTracksArg,
      },
      annotations: READ_ONLY,
    },
    wrap({
      tool: "build_schedule",
      handler: schedule,
      insight: ({ args, agenda, result }) => {
        const params = {
          must_see_count: args.mustSee?.length ?? 0,
          has_interests: Boolean(args.interests),
          days: args.days?.map((day) => knownDay({ agenda, input: day })).join(","),
          exclude_track: knownTracks({ agenda, inputs: args.excludeTracks }),
          conflicts: result.conflicts.length,
        };

        return {
          resultCount: result.sessionIds.length,
          params,
          selected: { source: "must_see", ids: existingIds({ agenda, ids: args.mustSee }) },
          milestones: [{ name: "schedule_built", params: { ...params, session_count: result.sessionIds.length } }],
        };
      },
    }),
  );
}
