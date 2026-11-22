import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFERENCE } from "../../config.js";
import type { Agenda, Session } from "../../data/agenda.types.js";
import { brief, dayLabel } from "../../format.js";
import { applyFilters } from "../../logic/search/filters.js";
import { hhmm, toVenueWallTime, venueNow } from "../../logic/time.js";
import { dayArg, tracksArg } from "../args.js";
import { knownDay, knownTracks } from "../insight.js";
import { wrap } from "../wrap.js";
import type { WhatsOnArgs } from "./whats-on.types.js";

/** Whole minutes from venue wall time `from` to `to`. */
function minutesBetween({ from, to }: { from: string; to: string }): number {
  return Math.round((Date.parse(`${to}Z`) - Date.parse(`${from}Z`)) / 60000);
}

function beforeConference({ now, pool, agenda }: { now: string; pool: Session[]; agenda: Agenda }) {
  const first = agenda.sessions[0];
  const days = Math.ceil((Date.parse(`${first.startsAt}Z`) - Date.parse(`${now}Z`)) / 86_400_000);
  const firstSlot = pool.filter((session) => session.day === first.day && !session.isService).slice(0, 4);

  return {
    now,
    status: "before the conference",
    startsIn: `${days} day(s) — ${dayLabel({ day: first.day, agenda })}, doors open ${hhmm(first.startsAt)}`,
    firstTalks: firstSlot.map((session) => brief({ session, agenda })),
  };
}

function duringConference({ now, pool, agenda }: { now: string; pool: Session[]; agenda: Agenda }) {
  const happening = pool.filter((session) => session.startsAt <= now && now < session.endsAt);
  const upcoming = pool.filter((session) => session.startsAt > now);
  const nextStart = upcoming.map((session) => session.startsAt).sort()[0];
  const next = nextStart ? upcoming.filter((session) => session.startsAt === nextStart) : [];

  return {
    now,
    happeningNow: happening.map((session) => ({
      ...brief({ session, agenda }),
      minutesLeft: minutesBetween({ from: now, to: session.endsAt }),
    })),
    nextUp: next.map((session) => ({
      ...brief({ session, agenda }),
      startsInMinutes: minutesBetween({ from: now, to: session.startsAt }),
    })),
  };
}

function whatsOn({ args, agenda }: { args: WhatsOnArgs; agenda: Agenda }) {
  const dayIso = args.day
    ? applyFilters({ agenda, filters: { day: args.day, includeService: true } })[0]?.day
    : undefined;
  const now = args.at ? toVenueWallTime({ input: args.at, day: dayIso }) : venueNow();
  const pool = applyFilters({
    agenda,
    filters: { tracks: args.tracks, includeService: !args.tracks?.length },
  });
  const last = agenda.sessions
    .map((session) => session.endsAt)
    .sort()
    .at(-1)!;
  if (now < agenda.sessions[0].startsAt) {
    return beforeConference({ now, pool, agenda });
  }

  if (now >= last) {
    return { now, status: "the conference is over", see: CONFERENCE.website };
  }

  return duringConference({ now, pool, agenda });
}

export function registerWhatsOn(server: McpServer): void {
  server.registerTool(
    "whats_on",
    {
      title: "What's on now / next",
      description:
        "What is happening at a given moment (default: right now, venue time) and what starts next. " +
        "Before the conference it says when it starts.",
      inputSchema: {
        at: z
          .string()
          .optional()
          .describe(
            'ISO time ("2026-11-30T11:15" venue time, or with Z/offset), or "HH:MM" together with day. Default: now.',
          ),
        day: dayArg,
        tracks: tracksArg,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrap({
      tool: "whats_on",
      handler: whatsOn,
      insight: ({ args, agenda, result }) => ({
        params: {
          has_at: Boolean(args.at),
          day: knownDay({ agenda, input: args.day }),
          track: knownTracks({ agenda, inputs: args.tracks }),
          status: "status" in result ? result.status : "during the conference",
        },
      }),
    }),
  );
}
