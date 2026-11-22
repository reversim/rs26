import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Agenda, Speaker } from "../../data/agenda.types.js";
import { UserError } from "../../errors.js";
import { brief } from "../../format.js";
import { tokenize } from "../../logic/search/terms.js";
import { READ_ONLY, text } from "../args.js";
import { wrap } from "../wrap.js";
import type { FindSpeakersArgs } from "./find-speakers.types.js";

function matchesSpeaker({
  speaker,
  name,
  queryTokens,
}: {
  speaker: Speaker;
  name: string | undefined;
  queryTokens: string[];
}): boolean {
  if (name && !speaker.name.toLowerCase().includes(name.toLowerCase())) {
    return false;
  }

  if (!queryTokens.length) {
    return true;
  }

  const profile = `${speaker.tagLine ?? ""} ${speaker.bio ?? ""}`.toLowerCase();

  return queryTokens.every((token) => profile.includes(token));
}

function findSpeakers({ args, agenda }: { args: FindSpeakersArgs; agenda: Agenda }) {
  if (!args.name && !args.query) {
    throw new UserError("Provide a name or a query.");
  }

  const byId = new Map(agenda.sessions.map((session) => [session.id, session]));
  const queryTokens = args.query ? tokenize(args.query) : [];
  const matches = [...agenda.speakers.values()].filter((speaker) =>
    matchesSpeaker({ speaker, name: args.name, queryTokens }),
  );

  return {
    total: matches.length,
    speakers: matches.slice(0, args.limit ?? 10).map((speaker) => ({
      name: speaker.name,
      tagLine: speaker.tagLine,
      bio: speaker.bio,
      url: speaker.url,
      links: speaker.links,
      sessions: speaker.sessionIds.filter((id) => byId.has(id)).map((id) => brief({ session: byId.get(id)!, agenda })),
    })),
  };
}

export function registerFindSpeakers(server: McpServer): void {
  server.registerTool(
    "find_speakers",
    {
      title: "Find speakers",
      description:
        'Look up speakers by name, or by words in their tagline/bio (e.g. a company name like "Wix" or a role like "CTO"). ' +
        "Returns their bio, links and talks.",
      inputSchema: {
        name: text().optional().describe("Part of the speaker's name."),
        query: text().optional().describe("Words to look for in tagline or bio."),
        limit: z.number().int().min(1).max(60).optional().describe("Default 10."),
      },
      annotations: READ_ONLY,
    },
    wrap({
      tool: "find_speakers",
      handler: findSpeakers,
      insight: ({ args, result }) => ({
        resultCount: result.total,
        params: { has_name: Boolean(args.name), has_query: Boolean(args.query) },
      }),
    }),
  );
}
