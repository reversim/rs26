import type { APIRoute } from "astro";
import slugify from "slug";
import { getSessions } from "../../helpers/data/getSessions";
import { getTrackName } from "../../helpers/data/getAgenda";
import { event } from "../../config/event";
import { venue } from "../../config/venue";
import { SITE_URL } from "../../config/agentResources";
import { plain } from "../../helpers/agents/markdown";

/**
 * One schema.org Event per line, so an agent can ingest the whole programme in
 * a single request instead of crawling 100-odd pages. Referenced from
 * /schemamap.xml and the ARD catalog.
 */
export const GET: APIRoute = async () => {
  const { rawSessionsList } = await getSessions();

  const lines = rawSessionsList
    .filter((session) => session.description)
    .sort(
      (a, b) =>
        (a.day ?? 1) - (b.day ?? 1) || a.startsAt.localeCompare(b.startsAt),
    )
    .map((session) =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Event",
        "@id": `${SITE_URL}/session/${slugify(session.title)}`,
        url: `${SITE_URL}/session/${slugify(session.title)}`,
        name: session.title,
        description: plain(session.description),
        // Sessionize gives venue-local wall time; Israel is UTC+2 in winter.
        startDate: `${session.startsAt}+02:00`,
        endDate: `${session.endsAt}+02:00`,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        inLanguage: "he",
        about: getTrackName(session),
        location: {
          "@type": "Place",
          name: `${venue.place} — ${session.room}`,
          address: {
            "@type": "PostalAddress",
            streetAddress: venue.street,
            addressLocality: venue.city,
            addressCountry: venue.country,
          },
        },
        performer: session.speakers.map((speaker) => ({
          "@type": "Person",
          name: speaker.name,
        })),
        superEvent: {
          "@type": "Event",
          name: event.name,
          url: `${SITE_URL}/`,
        },
      }),
    );

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "application/jsonl; charset=utf-8" },
  });
};
