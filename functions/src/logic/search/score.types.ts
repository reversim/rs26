import type { Session } from "../../data/agenda.types.js";

/** The words of one session field, as typed and stemmed. */
export type FieldIndex = {
  tokens: Set<string>;
  stems: Set<string>;
};

/** The searchable fields of a session. */
export type SessionIndex = {
  title: FieldIndex;
  track: FieldIndex;
  description: FieldIndex;
  speakers: FieldIndex;
};

/** A session with its relevance score and the attendee's words it matched. */
export type Scored = {
  session: Session;
  score: number;
  matched: string[];
};
