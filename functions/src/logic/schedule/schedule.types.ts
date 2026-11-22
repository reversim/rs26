import type { Agenda, Session } from "../../data/agenda.types.js";
import type { Term } from "../search/terms.types.js";

/** What the attendee asked for. */
export type ScheduleRequest = {
  /** Sessions the attendee wants, most important first. */
  mustSee?: string[];
  /** Free-text interests used to fill the remaining slots. */
  interests?: string;
  days?: string[];
  excludeTracks?: string[];
};

/** Why a session is in the schedule. */
export type ScheduleReason = "requested" | "interest-match" | "plenary" | "break";

/** One line of a day's timeline. */
export type ScheduleEntry = {
  session: Session;
  why: ScheduleReason;
  score?: number;
  matched?: string[];
  /** Other talks running at the same time. */
  alternatives: Session[];
};

/** A time slot with talks where nothing was picked. */
export type OpenSlot = {
  startsAt: string;
  endsAt: string;
  options: Session[];
};

/** A must-see session that lost to an overlapping pick. */
export type Conflict = {
  wanted: Session;
  clashesWith: Session[];
};

/** The schedule for one conference day. */
export type DaySchedule = {
  day: string;
  entries: ScheduleEntry[];
  openSlots: OpenSlot[];
};

/** A whole personal schedule. */
export type ScheduleResult = {
  days: DaySchedule[];
  conflicts: Conflict[];
  unknownIds: string[];
};

/** A session that could go in the schedule, with the weight the picker uses. */
export type Candidate = {
  session: Session;
  weight: number;
  why: ScheduleReason;
  score?: number;
  matched?: string[];
};

/** What every day of a schedule is built from. */
export type PlanContext = {
  agenda: Agenda;
  mustSee: string[];
  byId: Map<string, Session>;
  terms: Term[];
  excludeTracks?: string[];
};

/** One day's schedule and the must-sees it couldn't fit. */
export type DayPlan = {
  schedule: DaySchedule;
  conflicts: Conflict[];
};
