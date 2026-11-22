// The conference tracks and the pair of team members moderating each, for the
// moderator kit (/moderator-kit).
//
// `track` is the track's name in Sessionize, as resolveTrack() returns it.
// `moderators` are names exactly as on /about (the backoffice team list).

export interface TrackConfig {
  track: string;
  slug: string;
  moderators: string[];
}

export const TRACKS: TrackConfig[] = [
  {
    track: "Frontend/Product",
    slug: "frontend",
    moderators: ["Opher Vishnia", "Itay Maman"],
  },
  {
    track: "Backend",
    slug: "backend",
    moderators: ["Avi Youkhananov", "Ayelet Dekel"],
  },
  {
    track: "Infrastructure",
    slug: "infrastructure",
    moderators: ["Noa Kurman", "Tomer Gabel"],
  },
  {
    track: "AI/ML",
    slug: "ai-ml",
    moderators: ["Aielet Efrati", "Yanir Marmor"],
  },
  {
    track: "Craft",
    slug: "craft",
    moderators: ["Maor Hayun", "Benjamin Gruenbaum"],
  },
  {
    track: "Culture",
    slug: "culture",
    moderators: ["Dafna Mordechai", "Einat Mahat"],
  },
  {
    track: "Ignites",
    slug: "ignites",
    moderators: ["Efrat Aran", "Rachel Wities"],
  },
];
