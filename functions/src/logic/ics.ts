import { CONFERENCE } from "../config.js";
import type { Session } from "../data/agenda.types.js";
import { venueToUtc } from "./time.js";

function icsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/[,;]/g, (separator) => `\\${separator}`);
}

/** Folds lines to 75 octets as required by RFC 5545. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) {
    return line;
  }

  const folded: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    const limit = folded.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentBytes + characterBytes > limit) {
      folded.push(current);
      current = "";
      currentBytes = 0;
    }

    current += character;
    currentBytes += characterBytes;
  }
  folded.push(current);

  return folded.join("\r\n ");
}

function eventLines({ session, now }: { session: Session; now: Date }): string[] {
  const speakers = session.speakers.map((speaker) => speaker.name).join(", ");
  const description = [
    speakers && `Speakers: ${speakers}`,
    session.track && `Track: ${session.track}`,
    session.url,
    session.description,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    "BEGIN:VEVENT",
    `UID:${session.id}@summit2026.reversim.com`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(venueToUtc(session.startsAt))}`,
    `DTEND:${icsDate(venueToUtc(session.endsAt))}`,
    `SUMMARY:${escape(`${CONFERENCE.shortName}: ${session.title}`)}`,
    `LOCATION:${escape(`${session.room} – ${CONFERENCE.name}`)}`,
    `DESCRIPTION:${escape(description)}`,
    ...(session.url ? [`URL:${session.url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT5M",
    `DESCRIPTION:${escape(session.title)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

/** An iCalendar file with one event (and a 5-minute reminder) per session. */
export function buildIcs({ sessions, now = new Date() }: { sessions: Session[]; now?: Date }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reversim Summit 2026 MCP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(`${CONFERENCE.shortName} – my schedule`)}`,
    `X-WR-TIMEZONE:${CONFERENCE.timezone}`,
    ...sessions.flatMap((session) => eventLines({ session, now })),
    "END:VCALENDAR",
  ];

  return lines.map(fold).join("\r\n") + "\r\n";
}
