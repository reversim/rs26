import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Agenda, Session } from "./data/agenda.types.js";
import type { SessionBrief, SessionDetails, SessionWithAbstract } from "./format.types.js";
import { hhmm } from "./logic/time.js";

/** "Day 1 (Mon, Nov 30)", or just the date for a day outside the agenda. */
export function dayLabel({ day, agenda }: { day: string; agenda: Agenda }): string {
  const dayNumber = agenda.days.indexOf(day) + 1;
  const date = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return dayNumber > 0 ? `Day ${dayNumber} (${date})` : date;
}

function truncate({ text, max }: { text: string | undefined; max: number }): string | undefined {
  if (!text) {
    return undefined;
  }

  const flat = text.replace(/\s+/g, " ").trim();

  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Compact view used in lists. */
export function brief({ session, agenda }: { session: Session; agenda: Agenda }): SessionBrief {
  return {
    id: session.id,
    title: session.title,
    when: `${dayLabel({ day: session.day, agenda })} ${hhmm(session.startsAt)}–${hhmm(session.endsAt)}`,
    room: session.room,
    track: session.track,
    speakers: session.speakers.map((speaker) => speaker.name),
  };
}

/** Brief + a shortened abstract, for recommendation candidates. */
export function withAbstract({
  session,
  agenda,
  max = 420,
}: {
  session: Session;
  agenda: Agenda;
  max?: number;
}): SessionWithAbstract {
  return { ...brief({ session, agenda }), abstract: truncate({ text: session.description, max }) };
}

/** Full details, including speaker bios. */
export function full({ session, agenda }: { session: Session; agenda: Agenda }): SessionDetails {
  return {
    ...brief({ session, agenda }),
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    lengthMinutes: session.lengthMinutes,
    isPlenary: session.isPlenum,
    description: session.description,
    url: session.url,
    speakers: session.speakers.map((sessionSpeaker) => {
      const speaker = agenda.speakers.get(sessionSpeaker.id);

      return {
        id: sessionSpeaker.id,
        name: sessionSpeaker.name,
        tagLine: speaker?.tagLine,
        bio: speaker?.bio,
        url: speaker?.url,
        links: speaker?.links,
      };
    }),
  };
}

/** A tool result holding `value` as pretty-printed JSON. */
export function json(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

/** A tool result the client shows as an error. */
export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** One line saying whether the data is live or the snapshot, and how fresh it is. */
export function dataNote(agenda: Agenda): string {
  return agenda.source === "live"
    ? `Live data from Sessionize (fetched ${agenda.fetchedAt}).`
    : `Using the bundled snapshot from ${agenda.fetchedAt} (live Sessionize feed unavailable).`;
}

/** Plain-text agenda, used for the agenda resource. */
export function agendaMarkdown(agenda: Agenda): string {
  const lines: string[] = [];
  for (const day of agenda.days) {
    lines.push(`## ${dayLabel({ day, agenda })}`, "");
    for (const session of agenda.sessions.filter((candidate) => candidate.day === day)) {
      const speakers = session.speakers.map((speaker) => speaker.name).join(", ");
      const details = [session.room, session.track, speakers].filter(Boolean).join(" · ");
      lines.push(
        `- ${hhmm(session.startsAt)}–${hhmm(session.endsAt)} **${session.title}** (${details}) [id: ${session.id}]`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
