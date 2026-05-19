import type { AgendaSpeaker } from "./agenda";

export interface CalendarSessionData {
  id: string | number;
  title: string;
  startsAt: string;
  endsAt: string;
  room?: string;
  speakers: AgendaSpeaker[];
  description?: string | null;
}

export type CalendarType = "google" | "outlook" | "yahoo" | "ical";
