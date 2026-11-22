import { z } from "zod";

/** Every free-text argument is length-bounded. */
export const text = (max = 300) => z.string().trim().max(max);
export const hhmmArg = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
/** Session ids are numeric (talks) or UUIDs (breaks). */
export const sessionId = z.string().regex(/^[A-Za-z0-9-]{1,64}$/, "Invalid session id");

export const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

export const dayArg = z
  .string()
  .optional()
  .describe('Conference day: "2026-11-30", "2026-12-01", "day 1", "day 2", "monday", "tuesday"…');
export const tracksArg = z
  .array(text(40))
  .max(10)
  .optional()
  .describe('Only these tracks, e.g. ["AI/ML", "Backend", "Frontend/Product"]. get_conference_info lists them all.');
export const excludeTracksArg = z.array(text(40)).max(10).optional().describe("Leave out these tracks.");
