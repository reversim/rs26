import type { Agenda } from "../../data/agenda.types.js";
import { applyFilters } from "./filters.js";
import type { SessionFilters } from "./filters.types.js";
import { scoreSession } from "./score.js";
import type { Scored } from "./score.types.js";
import { expandTerms } from "./terms.js";

/** Free-text search over title, description, track and speakers, best match first. */
export function searchSessions({
  agenda,
  query,
  filters,
}: {
  agenda: Agenda;
  query: string | undefined;
  filters: SessionFilters;
}): Scored[] {
  const candidates = applyFilters({ agenda, filters });
  if (!query?.trim()) {
    return candidates.map((session) => ({ session, score: 0, matched: [] }));
  }

  const terms = expandTerms(query);

  return candidates
    .map((session) => scoreSession({ session, terms, speakers: agenda.speakers }))
    .filter((scored) => scored.score > 0)
    .sort(
      (first, second) => second.score - first.score || first.session.startsAt.localeCompare(second.session.startsAt),
    );
}
