import type { Agenda, Session } from "../../data/agenda.types.js";
import { UserError } from "../../errors.js";
import type { SessionFilters } from "./filters.types.js";

/** Lower-cased letters and digits only, so "A2+A3" matches "a2 a3". */
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

function matchesCalendarName({ input, day }: { input: string; day: string }): boolean {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toLowerCase();
  const dayOfMonth = String(date.getUTCDate());

  return [weekday, weekday.slice(0, 3), `${month} ${dayOfMonth}`, `${dayOfMonth} ${month}`, day.slice(5)].includes(
    input,
  );
}

/**
 * Accepts "2026-11-30", "day 1", "1", "mon", "monday", "nov 30", "tue", "dec 1"...
 * Returns the YYYY-MM-DD day or undefined if it can't be resolved.
 */
export function resolveDay({ input, days }: { input: string; days: string[] }): string | undefined {
  const value = input.trim().toLowerCase();
  if (days.includes(value)) {
    return value;
  }

  const dayNumber = value.match(/^(?:day\s*)?(\d)$/);
  if (dayNumber) {
    return days[Number(dayNumber[1]) - 1];
  }

  return days.find((day) => matchesCalendarName({ input: value, day }));
}

/** Loose track match: "ai" matches "AI/ML", and so does "ml". */
export function matchesTrack({ session, track }: { session: Pick<Session, "track">; track: string }): boolean {
  if (!session.track) {
    return false;
  }

  const sessionTrack = normalize(session.track);
  const wanted = normalize(track);

  return (
    sessionTrack === wanted ||
    sessionTrack.startsWith(wanted) ||
    session.track
      .toLowerCase()
      .split("/")
      .some((part) => normalize(part) === wanted)
  );
}

function matchesTrackFilters({ session, filters }: { session: Session; filters: SessionFilters }): boolean {
  if (filters.tracks?.length && !filters.tracks.some((track) => matchesTrack({ session, track }))) {
    return false;
  }

  return !filters.excludeTracks?.some((track) => matchesTrack({ session, track }));
}

function matchesSpeaker({ session, speaker }: { session: Session; speaker: string | undefined }): boolean {
  if (!speaker) {
    return true;
  }

  const wanted = speaker.toLowerCase();

  return session.speakers.some((sessionSpeaker) => sessionSpeaker.name.toLowerCase().includes(wanted));
}

/** Times are compared as venue-local "HH:MM" strings. */
function matchesTimeWindow({ session, filters }: { session: Session; filters: SessionFilters }): boolean {
  if (filters.startsAfter && session.startsAt.slice(11, 16) < filters.startsAfter) {
    return false;
  }

  return !(filters.endsBefore && session.endsAt.slice(11, 16) > filters.endsBefore);
}

/** The agenda's sessions that pass every filter. Throws a UserError for a day it can't resolve. */
export function applyFilters({ agenda, filters }: { agenda: Agenda; filters: SessionFilters }): Session[] {
  const day = filters.day ? resolveDay({ input: filters.day, days: agenda.days }) : undefined;
  if (filters.day && !day) {
    throw new UserError(
      `Unknown day "${filters.day}". Conference days: ${agenda.days.join(", ")} (or "day 1"/"day 2").`,
    );
  }

  return agenda.sessions.filter((session) => {
    if (!filters.includeService && session.isService) {
      return false;
    }

    if (day && session.day !== day) {
      return false;
    }

    if (filters.room && normalize(session.room) !== normalize(filters.room)) {
      return false;
    }

    return (
      matchesTrackFilters({ session, filters }) &&
      matchesSpeaker({ session, speaker: filters.speaker }) &&
      matchesTimeWindow({ session, filters })
    );
  });
}
