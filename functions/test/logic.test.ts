import { expect, it } from "vitest";
import { getSnapshotAgenda } from "../src/data/agenda.js";
import { buildIcs } from "../src/logic/ics.js";
import { pickNonOverlapping } from "../src/logic/schedule/pick-non-overlapping.js";
import { buildSchedule } from "../src/logic/schedule/schedule.js";
import { resolveDay } from "../src/logic/search/filters.js";
import { searchSessions } from "../src/logic/search/search.js";
import { expandTerms } from "../src/logic/search/terms.js";
import { overlaps, toVenueWallTime, venueToUtc } from "../src/logic/time.js";

const agenda = getSnapshotAgenda();

it("agenda snapshot has both days, talks and speakers", () => {
  expect(agenda.days).toEqual(["2026-11-30", "2026-12-01"]);
  expect(agenda.sessions.filter((session) => !session.isService).length).toBeGreaterThan(40);
  expect(agenda.speakers.size).toBeGreaterThan(40);
});

it("agenda snapshot builds website links with the same slugs the site uses", () => {
  const session = agenda.sessions.find((candidate) => candidate.title.startsWith("4+3 Strategies"));
  expect(session?.url).toBe("https://summit2026.reversim.com/session/43-strategies-to-boost-your-caches");
});

it("agenda snapshot maps Sessionize Frontend to Frontend/Product like the site", () => {
  expect(agenda.tracks).toContain("Frontend/Product");
  expect(agenda.tracks).not.toContain("Frontend");
});

it("search resolves human day names", () => {
  const { days } = agenda;
  expect(resolveDay({ input: "day 2", days })).toBe("2026-12-01");
  expect(resolveDay({ input: "Monday", days })).toBe("2026-11-30");
  expect(resolveDay({ input: "dec 1", days })).toBe("2026-12-01");
  expect(resolveDay({ input: "friday", days })).toBeUndefined();
});

it("search expands synonyms with lower weight", () => {
  const terms = expandTerms("llm");
  expect(terms.find((term) => term.term === "llm")?.weight).toBe(1);
  expect(terms.find((term) => term.term === "ai")?.weight).toBeLessThan(1);
});

it("search finds talks by keyword and filters by track/day", () => {
  const results = searchSessions({ agenda, query: "react native security", filters: {} });
  expect(results[0].session.title).toMatch(/React Native/);
  const keynotes = searchSessions({
    agenda,
    query: undefined,
    filters: { tracks: ["keynote"], day: "day 1" },
  });
  expect(keynotes.every((scored) => scored.session.track === "Keynote" && scored.session.day === "2026-11-30")).toBe(
    true,
  );
});

it("search rejects unknown days with a clear message", () => {
  expect(() => searchSessions({ agenda, query: undefined, filters: { day: "someday" } })).toThrow(/Unknown day/);
});

it("schedule weighted interval scheduling never overlaps and maximises weight", () => {
  const slot = ({ id, from, to, weight }: { id: string; from: string; to: string; weight: number }) => ({
    session: { ...agenda.sessions[0], id, startsAt: `2026-11-30T${from}:00`, endsAt: `2026-11-30T${to}:00` },
    weight,
  });
  const picked = pickNonOverlapping([
    slot({ id: "a", from: "10:00", to: "11:00", weight: 5 }),
    slot({ id: "b", from: "10:30", to: "11:30", weight: 4 }),
    slot({ id: "c", from: "11:00", to: "12:00", weight: 3 }),
  ]);
  expect(picked.map((pick) => pick.session.id)).toEqual(["a", "c"]);
});

it("schedule puts must-see sessions first and reports clashes", () => {
  const day1 = agenda.sessions.filter(
    (session) => session.day === "2026-11-30" && !session.isService && !session.isPlenum,
  );
  const wanted = day1[0];
  const clash = day1.find((session) => session.id !== wanted.id && overlaps({ first: session, second: wanted }))!;
  const result = buildSchedule({
    agenda,
    request: { mustSee: [wanted.id, clash.id], interests: "AI", days: ["day 1"] },
  });
  const ids = result.days[0].entries.map((entry) => entry.session.id);
  expect(ids).toContain(wanted.id);
  expect(ids).not.toContain(clash.id);
  expect(result.conflicts.map((conflict) => conflict.wanted.id)).toEqual([clash.id]);

  const talks = result.days[0].entries.filter((entry) => entry.why !== "break").map((entry) => entry.session);
  for (const [index, talk] of talks.entries()) {
    for (const other of talks.slice(index + 1)) {
      expect(overlaps({ first: talk, second: other })).toBe(false);
    }
  }
});

it("time converts venue time to UTC (Israel is UTC+2 in Nov/Dec)", () => {
  expect(venueToUtc("2026-11-30T10:00:00").toISOString()).toBe("2026-11-30T08:00:00.000Z");
  expect(toVenueWallTime({ input: "2026-11-30T08:15:00Z" })).toBe("2026-11-30T10:15:00");
  expect(toVenueWallTime({ input: "11:15", day: "2026-12-01" })).toBe("2026-12-01T11:15:00");
});

it("calendar produces a valid, folded, escaped ICS", () => {
  const session = agenda.sessions.find((candidate) => !candidate.isService)!;
  const ics = buildIcs({
    sessions: [{ ...session, title: "Evil; title, with\nnewline" }],
    now: new Date("2026-11-01T00:00:00Z"),
  });
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(ics).toContain("SUMMARY:RS26: Evil\\; title\\, with\\nnewline");
  for (const line of ics.split("\r\n")) {
    expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  }
  expect(ics).not.toMatch(/[^\r]\n/);
});
