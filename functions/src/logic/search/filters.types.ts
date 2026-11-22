/** Which sessions to keep. Every field is optional; an empty filter keeps all talks. */
export type SessionFilters = {
  day?: string;
  tracks?: string[];
  excludeTracks?: string[];
  room?: string;
  speaker?: string;
  /** "HH:MM", venue-local. Sessions starting at or after this time. */
  startsAfter?: string;
  /** "HH:MM", venue-local. Sessions ending at or before this time. */
  endsBefore?: string;
  includeService?: boolean;
};
