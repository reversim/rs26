/** Arguments of the search_sessions tool. */
export type SearchArgs = {
  query?: string;
  day?: string;
  tracks?: string[];
  room?: string;
  speaker?: string;
  startsAfter?: string;
  endsBefore?: string;
  includeBreaks?: boolean;
  limit?: number;
};
