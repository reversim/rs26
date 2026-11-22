import slug from "slug";
import { CONFERENCE } from "../config.js";
import type {
  Agenda,
  AgendaSource,
  RawFeeds,
  RawGridSession,
  RawSpeaker,
  Session,
  SessionSpeaker,
  Speaker,
} from "./agenda.types.js";
import { cleanText, safeHttpUrl, safePhotoUrl } from "./validate.js";

const ROOM_ORDER = ["Main hall", "A2+A3", "A4+A5", "Dining Hall", "Entrance"];

/** Same track naming the website uses (Sessionize "Frontend" is shown as "Frontend/Product"). */
export function resolveTrack(session: Pick<RawGridSession, "categories">): string | undefined {
  const item = session.categories?.find((category) => category.name === "Track")?.categoryItems?.[0];
  if (!item) {
    return undefined;
  }

  return item.name === "Frontend" ? "Frontend/Product" : item.name;
}

function minutesBetween({ from, to }: { from: string; to: string }): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 60000);
}

function toSession(raw: RawGridSession): Session {
  return {
    id: String(raw.id),
    title: cleanText(raw.title) ?? "(untitled)",
    description: cleanText(raw.description),
    startsAt: raw.startsAt,
    endsAt: raw.endsAt,
    day: raw.startsAt.slice(0, 10),
    lengthMinutes: minutesBetween({ from: raw.startsAt, to: raw.endsAt }),
    room: cleanText(raw.room) ?? "TBA",
    track: resolveTrack(raw),
    speakers: raw.speakers.map((speaker) => ({ id: speaker.id, name: cleanText(speaker.name) ?? "" })),
    isService: raw.isServiceSession,
    isPlenum: raw.isPlenumSession,
    url: raw.isServiceSession ? undefined : `${CONFERENCE.website}/session/${slug(raw.title)}`,
  };
}

function toSpeaker(raw: RawSpeaker): Speaker {
  return {
    id: raw.id,
    name: cleanText(raw.fullName) ?? "",
    tagLine: cleanText(raw.tagLine),
    bio: cleanText(raw.bio),
    photo: safePhotoUrl(raw.profilePicture),
    links: (raw.links ?? []).flatMap((link) => {
      const url = safeHttpUrl(link.url);

      return url ? [{ title: cleanText(link.title) ?? "Link", url }] : [];
    }),
    sessionIds: (raw.sessions ?? []).map((session) => String(session.id)),
    url: `${CONFERENCE.website}/speaker/${slug(raw.fullName)}`,
  };
}

function roomRank(room: string): number {
  const index = ROOM_ORDER.indexOf(room);

  return index === -1 ? ROOM_ORDER.length : index;
}

function uniqueValues(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/** Sessions in agenda order. A session spanning several rooms appears once per room; the first is kept. */
function collectSessions(feeds: RawFeeds): Session[] {
  const byId = new Map<string, Session>();
  const rawSessions = feeds.grid.flatMap((day) => day.rooms.flatMap((room) => room.sessions));
  for (const raw of rawSessions) {
    if (!byId.has(String(raw.id))) {
      byId.set(String(raw.id), toSession(raw));
    }
  }

  return [...byId.values()].sort(
    (first, second) =>
      first.startsAt.localeCompare(second.startsAt) ||
      roomRank(first.room) - roomRank(second.room) ||
      first.title.localeCompare(second.title),
  );
}

function gridOnlySpeaker(speaker: SessionSpeaker): Speaker {
  return {
    id: speaker.id,
    name: speaker.name,
    links: [],
    sessionIds: [],
    url: `${CONFERENCE.website}/speaker/${slug(speaker.name)}`,
  };
}

/** Speakers by id. Speakers that appear on the grid but not in the speakers feed still get an entry. */
function collectSpeakers({ feeds, sessions }: { feeds: RawFeeds; sessions: Session[] }): Map<string, Speaker> {
  const speakers = new Map(feeds.speakers.map((raw) => [raw.id, toSpeaker(raw)]));
  for (const session of sessions) {
    for (const sessionSpeaker of session.speakers) {
      const speaker = speakers.get(sessionSpeaker.id) ?? gridOnlySpeaker(sessionSpeaker);
      speakers.set(sessionSpeaker.id, speaker);
      if (!speaker.sessionIds.includes(session.id)) {
        speaker.sessionIds.push(session.id);
      }
    }
  }

  return speakers;
}

/** Turns validated feeds into the agenda the tools work on. */
export function buildAgenda({
  feeds,
  source,
  fetchedAt,
}: {
  feeds: RawFeeds;
  source: AgendaSource;
  fetchedAt: string;
}): Agenda {
  const sessions = collectSessions(feeds);

  return {
    sessions,
    speakers: collectSpeakers({ feeds, sessions }),
    days: uniqueValues(sessions.map((session) => session.day)).sort(),
    tracks: uniqueValues(sessions.map((session) => session.track)).sort(),
    rooms: uniqueValues(sessions.map((session) => session.room)).sort(
      (first, second) => roomRank(first) - roomRank(second),
    ),
    fetchedAt,
    source,
  };
}
