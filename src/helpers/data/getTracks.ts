// Build-time data for the moderator kit: each configured track
// (src/config/tracks.ts) with its moderators and its sessions, in agenda order.

import slug from "slug";
import { TRACKS, type TrackConfig } from "../../config/tracks";
import { getTrackColor } from "../../config/trackColors";
import { event } from "../../config/event";
import { resolveTrack } from "../agenda/resolveTrack";
import { getSessions } from "./getSessions";
import { getSpeakers } from "./getSpeakers";
import { getTeamMembers } from "./getTeam";
import type { TeamMember } from "../../types/team";

export interface TrackSpeaker {
  name: string;
  /** For /speaker/[slug]. */
  slug: string;
  photo?: string;
  tagLine?: string;
  twitter: string | null;
}

export interface TrackSession {
  id: string;
  title: string;
  /** For /session/[slug]. */
  slug: string;
  description: string;
  day: number;
  speakers: TrackSpeaker[];
}

export interface Track extends Omit<TrackConfig, "moderators"> {
  /** The accent color the site uses for this track. */
  color: string;
  moderators: TeamMember[];
  sessions: TrackSession[];
  /** The conference days the track's sessions are on, ascending. */
  days: number[];
}

function twitterHandle(links?: { linkType: string; url: string }[]) {
  const link = links?.find((l) => l.linkType === "Twitter");
  return link?.url.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]+)/)?.[1] ?? null;
}

export async function getTracks(): Promise<Track[]> {
  const [{ rawSessionsList }, speakers, team] = await Promise.all([
    getSessions(),
    getSpeakers(),
    getTeamMembers(),
  ]);
  const speakersById = new Map(speakers.map((s) => [String(s.id), s]));
  const teamByName = new Map(team.map((m) => [m.name.trim().toLowerCase(), m]));

  return TRACKS.map((config) => {
    const moderators = config.moderators.flatMap((name) => {
      const member = teamByName.get(name.toLowerCase());
      if (!member)
        console.warn(
          `[tracks] No team member named "${name}" (moderator of ${config.track}).`,
        );
      return member ? [member] : [];
    });

    const sessions: TrackSession[] = rawSessionsList
      .filter(
        (s) =>
          !s.isServiceSession &&
          s.speakers.length > 0 &&
          resolveTrack(s) === config.track,
      )
      .sort(
        (a, b) =>
          (a.day ?? 1) - (b.day ?? 1) ||
          a.startsAt.localeCompare(b.startsAt) ||
          a.title.localeCompare(b.title),
      )
      .map((s) => ({
        id: s.id,
        title: s.title.trim(),
        slug: slug(s.title),
        description: s.description ?? "",
        day: s.day ?? 1,
        speakers: s.speakers.map(({ id, name }) => {
          const sp = speakersById.get(String(id));
          const fullName = (sp?.fullName ?? name).trim();
          return {
            name: fullName,
            slug: sp?.slug ?? slug(fullName),
            photo: sp?.profilePicture,
            tagLine: sp?.tagLine?.trim(),
            twitter: twitterHandle(sp?.links),
          };
        }),
      }));

    return {
      ...config,
      color: getTrackColor(config.track),
      moderators,
      sessions,
      days: [...new Set(sessions.map((s) => s.day))].sort((a, b) => a - b),
    };
  });
}

/** Every speaker in the track once, in session order. */
export function trackSpeakers(track: Pick<Track, "sessions">): TrackSpeaker[] {
  const seen = new Set<string>();
  return track.sessions
    .flatMap((s) => s.speakers)
    .filter((s) => !seen.has(s.slug) && !!seen.add(s.slug));
}

/** "Mon, Nov 30", or "Nov 30 – Dec 1, 2026" when the track spans both days. */
export function trackDates(track: Pick<Track, "days">): string {
  if (track.days.length !== 1) return event.dates;
  const date = new Date(event.days.dates[track.days[0] as 1 | 2]);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
