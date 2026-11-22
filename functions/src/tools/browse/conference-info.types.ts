/** One conference day in the overview. */
export type DayOverview = {
  date: string;
  label: string;
  talks: number;
  /** "HH:MM" venue time. */
  from: string;
  to: string;
};
