import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFERENCE } from "../../config.js";
import { getAgenda } from "../../data/agenda.js";
import { agendaMarkdown } from "../../format.js";
import { trackEvent } from "../../metrics/events.js";

export function registerAgendaResource(server: McpServer): void {
  server.registerResource(
    "agenda",
    "reversim://agenda",
    {
      title: "Reversim Summit 2026 agenda",
      description: "The full two-day agenda as Markdown, with session ids.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const agenda = await getAgenda();
      trackEvent({ name: "agenda_viewed", params: { data_source: agenda.source } });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: `# ${CONFERENCE.name} — agenda\n\n${CONFERENCE.language}. Times are Israel time.\n\n${agendaMarkdown(agenda)}`,
          },
        ],
      };
    },
  );
}
