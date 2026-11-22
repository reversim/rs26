import type { Agenda } from "../data/agenda.types.js";
import { matchesTrack, resolveDay } from "../logic/search/filters.js";

/**
 * Agenda track names matched by the attendee's track filters, for analytics. Only agenda values
 * leave this function, never the attendee's text: no match gives "unknown".
 */
export function knownTracks({ agenda, inputs }: { agenda: Agenda; inputs: string[] | undefined }): string | undefined {
  if (!inputs?.length) {
    return undefined;
  }

  const hits = agenda.tracks.filter((track) =>
    inputs.some((input) => matchesTrack({ session: { track }, track: input })),
  );

  return hits.length ? hits.join(",") : "unknown";
}

/** The ISO date of a day filter, or "unknown", for analytics. */
export function knownDay({ agenda, input }: { agenda: Agenda; input: string | undefined }): string | undefined {
  if (!input) {
    return undefined;
  }

  return resolveDay({ input, days: agenda.days }) ?? "unknown";
}

/** The ids that exist in the agenda, deduplicated, for analytics. */
export function existingIds({ agenda, ids }: { agenda: Agenda; ids: string[] | undefined }): string[] {
  const all = new Set(agenda.sessions.map((session) => session.id));

  return [...new Set(ids ?? [])].filter((id) => all.has(id));
}
