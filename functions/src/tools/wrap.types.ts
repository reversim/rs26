import type { Agenda } from "../data/agenda.types.js";
import type { ToolInsight } from "../metrics/tool-call.types.js";

/** What a tool handler gets: its validated arguments and the current agenda. */
export type ToolInput<Args> = {
  args: Args;
  agenda: Agenda;
};

/** What an insight callback gets: the handler's input and what it returned. */
export type InsightInput<Args, Result> = ToolInput<Args> & {
  result: Result;
};

/** A tool's work. A plain value is sent as JSON; a CallToolResult is sent as-is. */
export type ToolHandler<Args, Result> = (input: ToolInput<Args>) => Result | Promise<Result>;

/** Turns a successful call into analytics. Must only report agenda values or fixed vocabularies. */
export type Insight<Args, Result> = (input: InsightInput<Args, Result>) => ToolInsight;
