import { z } from "zod";
import type { RawFeeds } from "./agenda.types.js";

const boundedString = (max: number) => z.string().max(max);
const idField = z.union([z.string().max(64), z.number().int()]).transform(String);

const category = z.object({
  id: z.number().int(),
  name: boundedString(100),
  categoryItems: z.array(z.object({ id: z.number().int(), name: boundedString(100) })).max(50),
});

const wallTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);

const gridSession = z.object({
  id: idField,
  title: boundedString(300),
  description: boundedString(10_000).nullable(),
  startsAt: wallTime,
  endsAt: wallTime,
  isServiceSession: z.boolean(),
  isPlenumSession: z.boolean(),
  speakers: z.array(z.object({ id: boundedString(64), name: boundedString(200) })).max(20),
  categories: z.array(category).max(20),
  roomId: z.number().int(),
  room: boundedString(100),
});

const gridDay = z.object({
  date: boundedString(40),
  rooms: z
    .array(z.object({ id: z.number().int(), name: boundedString(100), sessions: z.array(gridSession).max(200) }))
    .max(30),
});

const speaker = z.object({
  id: boundedString(64),
  fullName: boundedString(200),
  bio: boundedString(10_000).nullable(),
  tagLine: boundedString(500).nullable(),
  profilePicture: boundedString(500).nullable(),
  links: z
    .array(z.object({ title: boundedString(100), url: boundedString(500), linkType: boundedString(50) }))
    .max(20)
    .default([]),
  sessions: z
    .array(z.object({ id: idField, name: boundedString(300) }))
    .max(20)
    .default([]),
});

/**
 * Allowlist schema for the Sessionize feeds.
 *
 * zod objects strip unknown keys, so only the fields declared here ever reach the
 * rest of the server, even if Sessionize starts returning more (e.g. private Q&A
 * answers or contact details). Anything malformed rejects the whole payload and the
 * server falls back to the reviewed snapshot.
 */
export const feedsSchema = z.object({
  grid: z.array(gridDay).min(1).max(10),
  speakers: z.array(speaker).max(500),
});

export function validateFeeds(input: unknown): RawFeeds {
  return feedsSchema.parse(input) as RawFeeds;
}

/** Only plain http(s) links are passed through (no javascript:, data:, etc.). */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);

    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Speaker photos must come from Sessionize's CDN. */
export function safePhotoUrl(url: string | null | undefined): string | undefined {
  const safe = safeHttpUrl(url);

  return safe && new URL(safe).hostname === "cdn.sessionize.com" && safe.startsWith("https:") ? safe : undefined;
}

/** Removes control characters (except newlines/tabs) from third-party text. */
export function cleanText(text: string | null | undefined): string | undefined {
  const cleaned = text
    ?.replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u200C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();

  return cleaned ? cleaned : undefined;
}
