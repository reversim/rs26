import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Agenda } from "../../data/agenda.types.js";
import { brief } from "../../format.js";
import { searchSessions } from "../../logic/search/search.js";
import { dayArg, hhmmArg, READ_ONLY, text, tracksArg } from "../args.js";
import { knownDay, knownTracks } from "../insight.js";
import { wrap } from "../wrap.js";
import type { SearchArgs } from "./search-sessions.types.js";

function search({ args, agenda }: { args: SearchArgs; agenda: Agenda }) {
  const results = searchSessions({
    agenda,
    query: args.query,
    filters: {
      day: args.day,
      tracks: args.tracks,
      room: args.room,
      speaker: args.speaker,
      startsAfter: args.startsAfter,
      endsBefore: args.endsBefore,
      includeService: args.includeBreaks,
    },
  });
  const limit = args.limit ?? 25;

  return {
    total: results.length,
    shown: Math.min(limit, results.length),
    sessions: results.slice(0, limit).map((scored) => ({
      ...brief({ session: scored.session, agenda }),
      ...(args.query ? { relevance: scored.score, matched: scored.matched } : {}),
    })),
    ...(results.length === 0
      ? { hint: "No matches. Try broader words, drop filters, or call recommend_sessions." }
      : {}),
  };
}

export function registerSearchSessions(server: McpServer): void {
  server.registerTool(
    "search_sessions",
    {
      title: "Search sessions",
      description:
        "Search and filter the agenda by free text (title, abstract, track, speaker), day, track, room, speaker and time window. " +
        "Call with no arguments to list every talk.",
      inputSchema: {
        query: text().optional().describe('Free text, e.g. "kubernetes", "LLM evaluation", "career".'),
        day: dayArg,
        tracks: tracksArg,
        room: text().optional().describe('e.g. "Main hall", "A2+A3", "A4+A5".'),
        speaker: text().optional().describe("Part of a speaker's name."),
        startsAfter: hhmmArg.optional().describe("HH:MM venue time."),
        endsBefore: hhmmArg.optional().describe("HH:MM venue time."),
        includeBreaks: z.boolean().optional().describe("Include registration, breaks and lunch."),
        limit: z.number().int().min(1).max(100).optional().describe("Default 25."),
      },
      annotations: READ_ONLY,
    },
    wrap({
      tool: "search_sessions",
      handler: search,
      insight: ({ args, agenda, result }) => ({
        resultCount: result.total,
        params: {
          has_query: Boolean(args.query),
          query_length: args.query?.length,
          day: knownDay({ agenda, input: args.day }),
          track: knownTracks({ agenda, inputs: args.tracks }),
          has_room: Boolean(args.room),
          has_speaker: Boolean(args.speaker),
          has_time_window: Boolean(args.startsAfter || args.endsBefore),
        },
      }),
    }),
  );
}
