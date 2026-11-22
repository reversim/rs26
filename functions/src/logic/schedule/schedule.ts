import type { Agenda, Session } from "../../data/agenda.types.js";
import { UserError } from "../../errors.js";
import { applyFilters } from "../search/filters.js";
import { scoreSession } from "../search/score.js";
import { expandTerms } from "../search/terms.js";
import { overlaps } from "../time.js";
import { pickNonOverlapping } from "./pick-non-overlapping.js";
import type {
  Candidate,
  Conflict,
  DayPlan,
  OpenSlot,
  PlanContext,
  ScheduleEntry,
  ScheduleRequest,
  ScheduleResult,
} from "./schedule.types.js";

const MUST_SEE_WEIGHT = 10_000;
const PLENARY_WEIGHT = 0.5;

function candidateFor({ session, context }: { session: Session; context: PlanContext }): Candidate | undefined {
  const priority = context.mustSee.indexOf(session.id);
  if (priority !== -1) {
    return { session, weight: MUST_SEE_WEIGHT - priority, why: "requested" };
  }

  const scored = scoreSession({ session, terms: context.terms, speakers: context.agenda.speakers });
  if (scored.score > 0) {
    return { session, weight: scored.score, why: "interest-match", score: scored.score, matched: scored.matched };
  }

  if (session.isPlenum) {
    return { session, weight: PLENARY_WEIGHT, why: "plenary" };
  }

  return undefined;
}

function collectCandidates({
  talks,
  day,
  context,
}: {
  talks: Session[];
  day: string;
  context: PlanContext;
}): Candidate[] {
  const candidates = talks
    .map((session) => candidateFor({ session, context }))
    .filter((candidate) => candidate !== undefined);
  // A must-see the user explicitly asked for is kept even if its track was excluded.
  for (const [priority, id] of context.mustSee.entries()) {
    const session = context.byId.get(id);
    if (session && session.day === day && !candidates.some((candidate) => candidate.session.id === id)) {
      candidates.push({ session, weight: MUST_SEE_WEIGHT - priority, why: "requested" });
    }
  }

  return candidates;
}

function findConflicts({ candidates, chosen }: { candidates: Candidate[]; chosen: Session[] }): Conflict[] {
  return candidates
    .filter((candidate) => candidate.why === "requested" && !chosen.includes(candidate.session))
    .map((candidate) => ({
      wanted: candidate.session,
      clashesWith: chosen.filter((session) => overlaps({ first: session, second: candidate.session })),
    }));
}

function buildEntries({
  chosen,
  talks,
  all,
}: {
  chosen: Candidate[];
  talks: Session[];
  all: Session[];
}): ScheduleEntry[] {
  const chosenSessions = chosen.map((candidate) => candidate.session);
  const entries: ScheduleEntry[] = chosen.map((candidate) => ({
    session: candidate.session,
    why: candidate.why,
    score: candidate.score,
    matched: candidate.matched,
    alternatives: talks.filter(
      (talk) => talk.id !== candidate.session.id && overlaps({ first: talk, second: candidate.session }),
    ),
  }));
  for (const session of all) {
    if (session.isService && !chosenSessions.some((picked) => overlaps({ first: picked, second: session }))) {
      entries.push({ session, why: "break", alternatives: [] });
    }
  }

  return entries.sort((first, second) => first.session.startsAt.localeCompare(second.session.startsAt));
}

/** Time slots with talks where nothing was picked. */
function findOpenSlots({ talks, chosen }: { talks: Session[]; chosen: Session[] }): OpenSlot[] {
  const starts = [...new Set(talks.map((talk) => talk.startsAt))].sort();
  const slots: OpenSlot[] = [];
  for (const start of starts) {
    const options = talks.filter((talk) => talk.startsAt === start);
    if (options.some((option) => chosen.some((picked) => overlaps({ first: picked, second: option })))) {
      continue;
    }

    const endsAt = options
      .map((option) => option.endsAt)
      .sort()
      .at(-1)!;
    slots.push({ startsAt: start, endsAt, options });
  }

  return slots;
}

function scheduleDay({ dayInput, context }: { dayInput: string; context: PlanContext }): DayPlan {
  const talks = applyFilters({
    agenda: context.agenda,
    filters: { day: dayInput, excludeTracks: context.excludeTracks },
  });
  const all = applyFilters({ agenda: context.agenda, filters: { day: dayInput, includeService: true } });
  const day = all[0]?.day ?? dayInput;

  const candidates = collectCandidates({ talks, day, context });
  const chosen = pickNonOverlapping(candidates);
  const chosenSessions = chosen.map((candidate) => candidate.session);

  return {
    schedule: {
      day,
      entries: buildEntries({ chosen, talks, all }),
      openSlots: findOpenSlots({ talks, chosen: chosenSessions }),
    },
    conflicts: findConflicts({ candidates, chosen: chosenSessions }),
  };
}

/** A clash-free schedule: must-sees first, then the best interest matches, then plenaries. */
export function buildSchedule({ agenda, request }: { agenda: Agenda; request: ScheduleRequest }): ScheduleResult {
  const mustSee = request.mustSee ?? [];
  const byId = new Map(agenda.sessions.map((session) => [session.id, session]));
  const unknownIds = mustSee.filter((id) => !byId.has(id));
  if (mustSee.length === 0 && !request.interests?.trim()) {
    throw new UserError("Provide mustSee session ids and/or interests to build a schedule.");
  }

  const context: PlanContext = {
    agenda,
    mustSee,
    byId,
    terms: expandTerms(request.interests ?? ""),
    excludeTracks: request.excludeTracks,
  };
  const dayInputs = request.days?.length ? request.days : agenda.days;
  const plans = dayInputs.map((dayInput) => scheduleDay({ dayInput, context }));

  return {
    days: plans.map((plan) => plan.schedule),
    conflicts: plans.flatMap((plan) => plan.conflicts),
    unknownIds,
  };
}
