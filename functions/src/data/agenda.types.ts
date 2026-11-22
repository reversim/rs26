/** One item of a Sessionize category, e.g. the "AI/ML" item of "Track". */
export type RawCategoryItem = {
  id: number;
  name: string;
};

/** A Sessionize category (we only read "Track"). Feeds: https://sessionize.com/api/v2/1saptwag/view/GridSmart */
export type RawCategory = {
  id: number;
  name: string;
  categoryItems: RawCategoryItem[];
};

/** A speaker as listed on a grid session. */
export type RawSessionSpeaker = {
  id: string;
  name: string;
};

/** A session in the Sessionize GridSmart feed (only the fields we use). */
export type RawGridSession = {
  id: string;
  title: string;
  description: string | null;
  /** Venue-local wall time without an offset, e.g. "2026-11-30T10:20:00". */
  startsAt: string;
  endsAt: string;
  isServiceSession: boolean;
  isPlenumSession: boolean;
  speakers: RawSessionSpeaker[];
  categories: RawCategory[];
  roomId: number;
  room: string;
};

/** A room of one grid day, with its sessions. */
export type RawGridRoom = {
  id: number;
  name: string;
  sessions: RawGridSession[];
};

/** One day of the GridSmart feed. */
export type RawGridDay = {
  date: string;
  rooms: RawGridRoom[];
};

/** A link on a speaker's Sessionize profile. */
export type RawSpeakerLink = {
  title: string;
  url: string;
  linkType: string;
};

/** A session listed on a speaker's Sessionize profile. */
export type RawSpeakerSession = {
  id: string | number;
  name: string;
};

/** A speaker in the Sessionize Speakers feed. Feed: https://sessionize.com/api/v2/1saptwag/view/Speakers */
export type RawSpeaker = {
  id: string;
  fullName: string;
  bio: string | null;
  tagLine: string | null;
  profilePicture: string | null;
  links: RawSpeakerLink[];
  sessions: RawSpeakerSession[];
};

/** Both Sessionize feeds, after allowlist validation. */
export type RawFeeds = {
  grid: RawGridDay[];
  speakers: RawSpeaker[];
};

/** Which Sessionize feed to fetch (the URLs are fixed in config.ts). */
export type FeedName = "grid" | "speakers";

/** A safe link on a speaker's profile. */
export type SpeakerLink = {
  title: string;
  url: string;
};

/** A speaker as the server exposes it. */
export type Speaker = {
  id: string;
  name: string;
  tagLine?: string;
  bio?: string;
  photo?: string;
  links: SpeakerLink[];
  sessionIds: string[];
  url: string;
};

/** A speaker as listed on a session. */
export type SessionSpeaker = {
  id: string;
  name: string;
};

/** A session (talk or break) as the server exposes it. */
export type Session = {
  id: string;
  title: string;
  description?: string;
  /** Venue-local time (Asia/Jerusalem), ISO without offset. */
  startsAt: string;
  endsAt: string;
  /** YYYY-MM-DD */
  day: string;
  lengthMinutes: number;
  room: string;
  /** "AI/ML", "Craft", "Frontend/Product", "Ignites", "Keynote" — undefined for breaks. */
  track?: string;
  speakers: SessionSpeaker[];
  /** Breaks, registration, opening words etc. */
  isService: boolean;
  /** Everyone is in one room for this slot. */
  isPlenum: boolean;
  /** Absent for service sessions, which have no page on the site. */
  url?: string;
};

/** Where an agenda came from: the live feeds or the bundled snapshot. */
export type AgendaSource = "live" | "snapshot";

/** The normalized agenda every tool works on. */
export type Agenda = {
  sessions: Session[];
  speakers: Map<string, Speaker>;
  days: string[];
  tracks: string[];
  rooms: string[];
  fetchedAt: string;
  source: AgendaSource;
};

/** A live agenda and when it stops being fresh. */
export type CachedAgenda = {
  agenda: Agenda;
  expiresAt: number;
};
