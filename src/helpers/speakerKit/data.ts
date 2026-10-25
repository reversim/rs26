// Build-time data for the speaker kit: only what the kit draws or links to goes
// into the page. src/pages/speaker-kit/index.astro embeds it for startWizard().

import slug from "slug";
import { event } from "../../config/event";
import { getSessions } from "../data/getSessions";
import { getSpeakers } from "../data/getSpeakers";
import logo from "../../assets/logo-white.png";
import xIcon from "../../assets/socials/x-twitter.svg?raw";
import linkedinIcon from "../../assets/socials/linkedin.svg?raw";
import facebookIcon from "../../assets/socials/facebook.svg?raw";
import instagramIcon from "../../assets/socials/instagram.svg?raw";
import type { AgendaSpeaker } from "../../types/agenda";
import type { KitData, KitSession } from "./types";

type DayLabels = Pick<
  KitSession,
  "date" | "dayShort" | "dayLong" | "dayLongHe"
>;

// "Mon, Nov 30" / "Monday, Nov 30" / "יום שני, 30 בנובמבר" for a conference day (1 or 2).
function dayLabels(day: number): DayLabels {
  const date = new Date(event.days.dates[day as 1 | 2]);
  const format = (weekday: "short" | "long") =>
    date.toLocaleDateString("en-US", {
      weekday,
      month: "short",
      day: "numeric",
    });
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    dayShort: format("short"),
    dayLong: format("long"),
    dayLongHe: date.toLocaleDateString("he-IL", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
  };
}

function twitterHandle(speaker?: AgendaSpeaker) {
  const link = speaker?.links?.find((l) => l.linkType === "Twitter");
  return link?.url.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]+)/)?.[1] ?? null;
}

export async function getKitData(): Promise<KitData> {
  const { rawSessionsList } = await getSessions();
  const speakersById = new Map(
    (await getSpeakers()).map((s) => [String(s.id), s]),
  );

  const sessions: KitSession[] = rawSessionsList
    .filter((s) => !s.isServiceSession && s.speakers.length > 0)
    .map((s) => ({
      // Same slug as the session page, src/pages/session/[session].astro.
      slug: slug(s.title),
      title: s.title.trim(),
      room: s.room,
      ...dayLabels(s.day ?? 1),
      speakers: s.speakers.map(({ id, name }) => {
        const sp = speakersById.get(String(id));
        return {
          name: (sp?.fullName ?? name).trim(),
          tagLine: (sp?.tagLine ?? "").trim(),
          photo: sp?.profilePicture ?? "",
          twitter: twitterHandle(sp),
        };
      }),
    }));

  return {
    sessions,
    logo: logo.src,
    icons: {
      "x-twitter": xIcon,
      linkedin: linkedinIcon,
      facebook: facebookIcon,
      instagram: instagramIcon,
    },
  };
}
