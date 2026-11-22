/** A search term and how much a match on it counts (1 for the attendee's own words, less for synonyms). */
export type Term = {
  term: string;
  weight: number;
};
