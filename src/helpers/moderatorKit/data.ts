// Build-time data for the moderator kit: each track with its moderators and its
// lineup, only what the kit draws or links to. src/pages/moderator-kit/index.astro
// embeds it for startModeratorWizard().

import { event } from "../../config/event";
import {
  getTracks,
  trackDates,
  trackSpeakers,
  type TrackSpeaker,
} from "../data/getTracks";
import logo from "../../assets/logo-white.png";
import xIcon from "../../assets/socials/x-twitter.svg?raw";
import linkedinIcon from "../../assets/socials/linkedin.svg?raw";
import facebookIcon from "../../assets/socials/facebook.svg?raw";
import instagramIcon from "../../assets/socials/instagram.svg?raw";
import type { KitPerson, ModKitData } from "./types";

const SITE = "https://summit2026.reversim.com";

const isoDate = (day: number) => {
  const d = new Date(event.days.dates[day as 1 | 2]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// "יום שלישי, 1 בדצמבר", or the two days for a track on both.
function datesHe(days: number[]) {
  if (days.length !== 1) return "30.11–1.12";
  return new Date(event.days.dates[days[0] as 1 | 2]).toLocaleDateString(
    "he-IL",
    { weekday: "long", month: "long", day: "numeric" },
  );
}

const person = (s: TrackSpeaker): KitPerson => ({
  name: s.name,
  photo: s.photo ?? "",
  twitter: s.twitter,
});

// The team list keeps an X link (or a bare handle) per member.
const handle = (x?: string) =>
  x?.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/@?([A-Za-z0-9_]+)/,
  )?.[1] ??
  x?.match(/^@?([A-Za-z0-9_]{1,15})$/)?.[1] ??
  null;

export async function getModKitData(): Promise<ModKitData> {
  const tracks = await getTracks();
  return {
    tracks: tracks.map((t) => ({
      slug: t.slug,
      name: t.track,
      color: t.color,
      // No page per track yet: posts link to the full lineup.
      url: `${SITE}/sessions`,
      date: isoDate(t.days[0] ?? 1),
      dates: trackDates(t),
      datesHe: datesHe(t.days),
      moderators: t.moderators.map((m) => ({
        name: m.name,
        slug: m.slug,
        photo: m.picture,
        twitter: handle(m.x),
      })),
      sessions: t.sessions.map((s) => ({
        title: s.title,
        speakers: s.speakers.map(person),
      })),
      speakers: trackSpeakers(t).map(person),
    })),
    logo: logo.src,
    icons: {
      "x-twitter": xIcon,
      linkedin: linkedinIcon,
      facebook: facebookIcon,
      instagram: instagramIcon,
    },
  };
}
