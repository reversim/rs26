import { CONFERENCE } from "../config.js";
import { UserError } from "../errors.js";
import type { TimeRange } from "./time.types.js";

/** Current wall-clock time at the venue as "YYYY-MM-DDTHH:MM:SS". */
export function venueNow(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFERENCE.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((candidate) => candidate.type === type)!.value;

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}

/** Offset of the venue timezone from UTC (ms) at a given instant. */
function venueOffsetMs(instant: number): number {
  const wall = venueNow(new Date(instant));

  return Date.parse(`${wall}Z`) - Math.floor(instant / 1000) * 1000;
}

/** Converts a venue wall-time ISO string (no offset) to a UTC Date. */
export function venueToUtc(wall: string): Date {
  const asUtc = Date.parse(`${wall.length === 16 ? `${wall}:00` : wall}Z`);
  let instant = asUtc - venueOffsetMs(asUtc);
  // Second pass handles the rare case where the offset differs across the guess.
  instant = asUtc - venueOffsetMs(instant);

  return new Date(instant);
}

/**
 * Accepts an ISO timestamp with offset/Z (an instant), a venue wall time
 * ("2026-11-30T11:15"), or "HH:MM" (combined with `day`). Returns venue wall time.
 */
export function toVenueWallTime({ input, day }: { input: string; day?: string }): string {
  const value = input.trim();
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    if (!day) {
      throw new UserError(`Time "${value}" needs a day.`);
    }

    return `${day}T${value.padStart(5, "0")}:00`;
  }

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime())) {
      throw new UserError(`Invalid time "${value}".`);
    }

    return venueNow(instant);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.length === 16 ? `${value}:00` : value;
  }

  throw new UserError(`Could not understand time "${value}". Use ISO (2026-11-30T11:15) or HH:MM with a day.`);
}

/** "HH:MM" of a venue wall time. */
export const hhmm = (wall: string) => wall.slice(11, 16);

/** True when the two ranges share any time. Touching ends don't overlap. */
export function overlaps({ first, second }: { first: TimeRange; second: TimeRange }): boolean {
  return first.startsAt < second.endsAt && second.startsAt < first.endsAt;
}
