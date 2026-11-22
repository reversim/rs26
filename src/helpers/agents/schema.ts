// JSON-LD for the pages that describe a real-world thing: the event itself,
// its sessions and its speakers. Rendered by components/shared/jsonLd.astro.
//
// Everything here comes from the same data the page renders, so the markup an
// agent reads and the page a human reads can never disagree.

import slugify from "slug";
import { event } from "../../config/event";
import { venue } from "../../config/venue";
import { ORG, SITE_URL } from "../../config/agentResources";
import type { AgendaSession, AgendaSpeaker } from "../../types/agenda";
import type { Talk } from "../../types/session";
import { getTrackName } from "../data/getAgenda";
import { plain } from "./markdown";

const url = (path: string) => `${SITE_URL}${path}`;

// Sessionize hands us venue-local wall time with no offset. Israel is UTC+2 in
// winter, which is when the summit runs.
const VENUE_OFFSET = "+02:00";
const withOffset = (wallTime: string) => `${wallTime}${VENUE_OFFSET}`;

const PLACE = {
  "@type": "Place",
  name: venue.place,
  address: {
    "@type": "PostalAddress",
    streetAddress: venue.street,
    addressLocality: venue.city,
    addressCountry: venue.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: venue.lat,
    longitude: venue.lng,
  },
};

export const ORGANIZATION = {
  "@type": "Organization",
  "@id": url("/#organization"),
  name: ORG.name,
  legalName: ORG.legalName,
  url: `${SITE_URL}/`,
  description: ORG.description,
  email: ORG.email,
  foundingDate: "2013",
  logo: {
    "@type": "ImageObject",
    url: url("/apple-touch-icon.png"),
    width: 180,
    height: 180,
  },
  image: url("/og-image-2026.png"),
  address: {
    "@type": "PostalAddress",
    addressLocality: venue.city,
    addressCountry: venue.country,
  },
  sameAs: [...ORG.sameAs],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sponsorship",
    email: ORG.email,
    availableLanguage: ["en", "he"],
  },
};

const WEBSITE = {
  "@type": "WebSite",
  "@id": url("/#website"),
  url: `${SITE_URL}/`,
  name: event.name,
  inLanguage: "en",
  publisher: { "@id": url("/#organization") },
};

/** The summit itself: dates taken from the first and last session on the grid. */
export function eventSchema({
  sessions,
  speakers,
}: {
  sessions: Talk[];
  speakers: AgendaSpeaker[];
}) {
  const times = sessions.map((session) => session.startsAt).sort();
  const ends = sessions.map((session) => session.endsAt).sort();
  const tracks = [
    ...new Set(sessions.map(getTrackName).filter(Boolean)),
  ] as string[];

  return {
    "@type": "Event",
    "@id": url("/#event"),
    name: event.name,
    alternateName: event.shortName,
    url: `${SITE_URL}/`,
    description: event.description,
    startDate: times[0] ? withOffset(times[0]) : "2026-11-30T09:00:00+02:00",
    endDate: ends.at(-1)
      ? withOffset(ends.at(-1)!)
      : "2026-12-01T18:00:00+02:00",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    inLanguage: "he",
    image: url("/og-image-2026.png"),
    location: PLACE,
    organizer: { "@id": url("/#organization") },
    isAccessibleForFree: false,
    about: tracks,
    offers: {
      "@type": "Offer",
      name: "Attendee ticket",
      url: event.registration.url,
      availability: event.registration.display
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      category: "primary",
    },
    performer: speakers.slice(0, 50).map((speaker) => ({
      "@type": "Person",
      name: speaker.fullName,
      url: speaker.slug ? url(`/speaker/${speaker.slug}`) : undefined,
    })),
  };
}

/** The homepage carries the whole graph; inner pages reference it by @id. */
export function homeGraph({
  sessions,
  speakers,
}: {
  sessions: Talk[];
  speakers: AgendaSpeaker[];
}) {
  return [ORGANIZATION, WEBSITE, eventSchema({ sessions, speakers })];
}

/**
 * `AgendaSession` rather than `Talk`: the session page resolves its speakers to
 * full `AgendaSpeaker`s before rendering, and both shapes satisfy this.
 */
export function sessionSchema({
  session,
  speakers,
}: {
  session: AgendaSession;
  speakers: AgendaSpeaker[];
}) {
  const path = `/session/${slugify(session.title)}`;

  return {
    "@type": "Event",
    "@id": url(path),
    name: session.title,
    url: url(path),
    description: plain(session.description),
    startDate: withOffset(session.startsAt),
    endDate: withOffset(session.endsAt),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    inLanguage: "he",
    about: getTrackName(session),
    image: url(`/og/session/${slugify(session.title)}.jpg`),
    location: {
      ...PLACE,
      name: `${venue.place} — ${session.room}`,
    },
    organizer: { "@id": url("/#organization") },
    superEvent: {
      "@type": "Event",
      "@id": url("/#event"),
      name: event.name,
      url: `${SITE_URL}/`,
    },
    performer: speakers.map((speaker) => ({
      "@type": "Person",
      name: speaker.fullName || "",
      description: speaker.tagLine,
      url: speaker.slug ? url(`/speaker/${speaker.slug}`) : undefined,
    })),
  };
}

export function speakerSchema({
  speaker,
  talks,
}: {
  speaker: AgendaSpeaker;
  talks: Talk[];
}) {
  const path = `/speaker/${speaker.slug}`;

  return {
    "@type": "Person",
    "@id": url(path),
    name: speaker.fullName || "",
    url: url(path),
    jobTitle: speaker.tagLine,
    description: plain(speaker.bio),
    image: speaker.profilePicture,
    // The speaker's own profiles, as they gave them to us.
    sameAs: (speaker.links || []).map((entry) => entry.url).filter(Boolean),
    performerIn: talks.map((talk) => ({
      "@type": "Event",
      "@id": url(`/session/${slugify(talk.title)}`),
      name: talk.title,
      url: url(`/session/${slugify(talk.title)}`),
      startDate: withOffset(talk.startsAt),
      location: { ...PLACE, name: `${venue.place} — ${talk.room}` },
      superEvent: { "@id": url("/#event") },
    })),
  };
}

/** An ItemList of the speaker lineup, for the speakers index page. */
export function speakerListSchema(speakers: AgendaSpeaker[]) {
  return {
    "@type": "ItemList",
    "@id": url("/speakers#list"),
    name: `${event.name} speakers`,
    numberOfItems: speakers.length,
    itemListElement: speakers.map((speaker, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: url(`/speaker/${speaker.slug}`),
      name: speaker.fullName || "",
    })),
  };
}

/** An ItemList of the talks, for the agenda and sessions index pages. */
export function sessionListSchema({
  sessions,
  page,
  name,
}: {
  sessions: AgendaSession[];
  page: string;
  name: string;
}) {
  return {
    "@type": "ItemList",
    "@id": `${url(page)}#list`,
    name,
    numberOfItems: sessions.length,
    itemListElement: sessions.map((session, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: url(`/session/${slugify(session.title)}`),
      name: session.title,
    })),
  };
}
