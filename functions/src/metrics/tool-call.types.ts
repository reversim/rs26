import type { Params } from "./context.types.js";

/** How a tool call ended. */
export type ToolOutcome = "ok" | "user_error" | "internal_error";

/** Sessions the attendee picked or looked at, and which tool showed them. */
export type SelectedSessions = {
  source: string;
  /** Must exist in the agenda. */
  ids: string[];
};

/** An extra event for funnels and key events, e.g. schedule_built. */
export type Milestone = {
  name: string;
  params?: Params;
};

/** What a tool reports about its result, for analytics. Never free text typed by the attendee. */
export type ToolInsight = {
  /** Number of useful results. 0 also emits `search_no_results`. */
  resultCount?: number;
  /** Extra event params. */
  params?: Params;
  selected?: SelectedSessions;
  milestones?: Milestone[];
};

/** One finished tool call. */
export type ToolCall = {
  tool: string;
  outcome: ToolOutcome;
  durationMs: number;
  dataSource: string | undefined;
  insight?: ToolInsight;
};
