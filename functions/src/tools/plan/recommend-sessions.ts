import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Agenda } from "../../data/agenda.types.js";
import { brief, dataNote, withAbstract } from "../../format.js";
import { applyFilters } from "../../logic/search/filters.js";
import { scoreSession } from "../../logic/search/score.js";
import { expandTerms } from "../../logic/search/terms.js";
import { dayArg, excludeTracksArg, READ_ONLY, text, tracksArg } from "../args.js";
import { knownDay, knownTracks } from "../insight.js";
import { wrap } from "../wrap.js";
import type { Ranked, RecommendArgs } from "./recommend-sessions.types.js";

/** Interests count fully, role half, and avoided topics subtract. */
function rank({ args, agenda }: { args: RecommendArgs; agenda: Agenda }): Ranked[] {
  const pool = applyFilters({
    agenda,
    filters: { day: args.day, tracks: args.tracks, excludeTracks: args.excludeTracks },
  });
  const interestTerms = expandTerms(args.interests);
  const roleTerms = expandTerms(args.role ?? "").map((term) => ({ ...term, weight: term.weight * 0.5 }));
  const avoidTerms = expandTerms(args.avoid ?? "").filter((term) => term.weight === 1);

  return pool
    .map((session) => {
      const interest = scoreSession({ session, terms: interestTerms, speakers: agenda.speakers });
      const role = scoreSession({ session, terms: roleTerms, speakers: agenda.speakers });
      const penalty = scoreSession({ session, terms: avoidTerms, speakers: agenda.speakers });

      return {
        session,
        score: Math.round((interest.score + role.score - penalty.score * 1.5) * 10) / 10,
        matched: interest.matched,
        avoidHits: penalty.matched,
      };
    })
    .sort(
      (first, second) => second.score - first.score || first.session.startsAt.localeCompare(second.session.startsAt),
    );
}

function recommend({ args, agenda }: { args: RecommendArgs; agenda: Agenda }) {
  const ranked = rank({ args, agenda });
  const limit = args.limit ?? 12;

  return {
    guidance:
      "Rank these yourself using the abstracts — keyword scores miss synonyms and nuance. " +
      "Also scan otherTalks for anything relevant the keywords missed (use get_sessions for details). " +
      "Watch for overlapping time slots; build_schedule resolves clashes.",
    attendee: { interests: args.interests, role: args.role, avoid: args.avoid },
    candidates: ranked.slice(0, limit).map((scored) => ({
      ...withAbstract({ session: scored.session, agenda }),
      keywordScore: scored.score,
      matched: scored.matched,
      ...(scored.avoidHits.length ? { mentionsAvoided: scored.avoidHits } : {}),
    })),
    otherTalks: ranked.slice(limit).map((scored) => ({
      id: scored.session.id,
      title: scored.session.title,
      track: scored.session.track,
      when: brief({ session: scored.session, agenda }).when,
    })),
    data: dataNote(agenda),
  };
}

export function registerRecommendSessions(server: McpServer): void {
  server.registerTool(
    "recommend_sessions",
    {
      title: "Recommend sessions",
      description:
        "Given an attendee's interests (and optionally role / topics to avoid), returns candidate talks ranked by keyword relevance, " +
        "with abstracts, plus a short list of every other talk. The keyword score is only a first pass: read the abstracts, " +
        "use your own judgement to pick the best fits, and explain why each fits the attendee.",
      inputSchema: {
        interests: text(500)
          .min(1)
          .describe(
            'What the attendee cares about, in their words, e.g. "LLM agents in production, observability, team leadership".',
          ),
        role: text()
          .optional()
          .describe('e.g. "backend engineer", "frontend lead", "data scientist", "engineering manager".'),
        avoid: text().optional().describe("Topics the attendee is not interested in."),
        day: dayArg,
        tracks: tracksArg,
        excludeTracks: excludeTracksArg,
        limit: z.number().int().min(1).max(60).optional().describe("Number of detailed candidates. Default 12."),
      },
      annotations: READ_ONLY,
    },
    wrap({
      tool: "recommend_sessions",
      handler: recommend,
      insight: ({ args, agenda, result }) => ({
        // "Results" = candidates the keyword pass actually matched.
        resultCount: result.candidates.filter((candidate) => candidate.keywordScore > 0).length,
        params: {
          interests_length: args.interests.length,
          has_role: Boolean(args.role),
          has_avoid: Boolean(args.avoid),
          day: knownDay({ agenda, input: args.day }),
          track: knownTracks({ agenda, inputs: args.tracks }),
          exclude_track: knownTracks({ agenda, inputs: args.excludeTracks }),
        },
      }),
    }),
  );
}
