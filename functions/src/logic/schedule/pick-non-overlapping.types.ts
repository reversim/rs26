import type { Session } from "../../data/agenda.types.js";

/** Something to schedule: a session and how much the attendee wants it. */
export type WeightedSession = {
  session: Session;
  weight: number;
};
