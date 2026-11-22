import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFERENCE } from "../../config.js";
import { trackEvent } from "../../metrics/events.js";
import { text } from "../args.js";

export function registerPlanPrompt(server: McpServer): void {
  server.registerPrompt(
    "plan_my_reversim",
    {
      title: "Plan my Reversim Summit 2026",
      description: "Interview the attendee briefly and build them a personal RS26 schedule.",
      argsSchema: {
        about_me: text(500).optional().describe("Your role and what you'd like to get out of the conference."),
      },
    },
    ({ about_me }) => {
      trackEvent({
        name: "prompt_used",
        params: { prompt: "plan_my_reversim", has_about_me: Boolean(about_me) },
      });

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Help me plan my ${CONFERENCE.name}.` +
                (about_me
                  ? ` About me: ${about_me}.`
                  : " First ask me 2–3 short questions about my role and interests.") +
                " Then use recommend_sessions, suggest a shortlist with one line on why each fits me, " +
                "build a clash-free plan with build_schedule (mention clashes and alternatives), and offer to export it with export_calendar.",
            },
          },
        ],
      };
    },
  );
}
