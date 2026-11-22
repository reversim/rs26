import type { Session } from "../../data/agenda.types.js";

/** Arguments of the recommend_sessions tool. */
export type RecommendArgs = {
  interests: string;
  role?: string;
  avoid?: string;
  day?: string;
  tracks?: string[];
  excludeTracks?: string[];
  limit?: number;
};

/** A session with its combined keyword score. */
export type Ranked = {
  session: Session;
  score: number;
  matched: string[];
  avoidHits: string[];
};
