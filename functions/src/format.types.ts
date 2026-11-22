import type { SpeakerLink } from "./data/agenda.types.js";

/** Compact view of a session, used in lists. */
export type SessionBrief = {
  id: string;
  title: string;
  /** e.g. "Day 1 (Mon, Nov 30) 10:20–11:00" */
  when: string;
  room: string;
  track?: string;
  speakers: string[];
};

/** A brief plus a shortened abstract, for recommendation candidates. */
export type SessionWithAbstract = SessionBrief & {
  abstract?: string;
};

/** A speaker as shown in session details, bio included. */
export type SpeakerDetails = {
  id: string;
  name: string;
  tagLine?: string;
  bio?: string;
  url?: string;
  links?: SpeakerLink[];
};

/** Everything about one session. */
export type SessionDetails = Omit<SessionBrief, "speakers"> & {
  startsAt: string;
  endsAt: string;
  lengthMinutes: number;
  isPlenary: boolean;
  description?: string;
  url?: string;
  speakers: SpeakerDetails[];
};
