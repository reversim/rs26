// The tools our MCP server exposes, in the order the guide lists them.
// Rendered by src/pages/mcp-guide, by /mcp-guide.md and /llms.txt, and by the
// server card at /.well-known/mcp/server-card.json — so an agent reading any
// of those sees the same capabilities. The authoritative schemas live in
// `functions/src/tools`; this is the human-and-agent-readable summary.

export const mcpTools = [
  {
    name: "recommend_sessions",
    what: "Ranks talks against your interests and role, with abstracts, so your assistant can pick the ones that actually fit.",
  },
  {
    name: "build_schedule",
    what: "Builds a clash-free plan for both days: your must-sees first, the gaps filled by interest, with alternatives and conflicts listed.",
  },
  {
    name: "search_sessions",
    what: "Free-text search over titles, abstracts, tracks and speakers, filtered by day, track, room or time window.",
  },
  {
    name: "get_sessions",
    what: "Full details for specific talks: abstract, link and speaker bios.",
  },
  {
    name: "find_speakers",
    what: "Finds speakers by name, or by words in their bio — handy for spotting everyone from one company.",
  },
  {
    name: "whats_on",
    what: "What is running right now and what starts next, in venue time. Most useful during the conference itself.",
  },
  {
    name: "get_conference_info",
    what: "Dates, tracks with talk counts, rooms and the registration link.",
  },
  {
    name: "export_calendar",
    what: "Turns your plan into an .ics file for Google Calendar, Outlook or Apple Calendar.",
  },
] as const;

/** Prompts that show an agent what this server is good for. */
export const mcpExamples = [
  "I'm a backend engineer into LLM agents and observability. What should I see on day 1?",
  "Build me a schedule for both days, I don't want to miss the keynotes.",
  "Is anyone from my company speaking?",
  "What's on right now?",
  "Add my plan to my calendar.",
] as const;
