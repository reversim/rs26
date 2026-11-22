import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getAgenda } from "../data/agenda.js";
import type { Agenda } from "../data/agenda.types.js";
import { UserError } from "../errors.js";
import { errorResult, json } from "../format.js";
import { recordToolCall } from "../metrics/tool-call.js";
import type { ToolInsight, ToolOutcome } from "../metrics/tool-call.types.js";
import type { Insight, ToolHandler } from "./wrap.types.js";

function isToolResult(value: unknown): value is CallToolResult {
  return Boolean(value) && typeof value === "object" && "content" in (value as object);
}

/**
 * Runs a tool against the current agenda: plain results become JSON text, `UserError`s are
 * shown to the client, anything else is logged and reported generically. Records metrics.
 */
export function wrap<Args, Result>({
  tool,
  handler,
  insight,
}: {
  tool: string;
  handler: ToolHandler<Args, Result>;
  insight?: Insight<Args, Result>;
}) {
  return async (args: Args): Promise<CallToolResult> => {
    const started = performance.now();
    let agenda: Agenda | undefined;
    let outcome: ToolOutcome = "ok";
    let info: ToolInsight = {};
    try {
      agenda = await getAgenda();
      const result = await handler({ args, agenda });
      try {
        info = insight?.({ args, agenda, result }) ?? {};
      } catch {
        // Analytics must never break a tool.
      }

      return isToolResult(result) ? result : json(result);
    } catch (error) {
      if (error instanceof UserError) {
        outcome = "user_error";

        return errorResult(error.message);
      }

      outcome = "internal_error";
      // Never leak internals (stack traces, upstream errors) to clients.
      console.error("[reversim-mcp] tool failed:", error);

      return errorResult("Internal error while handling this request.");
    } finally {
      recordToolCall({
        tool,
        outcome,
        durationMs: performance.now() - started,
        dataSource: agenda?.source,
        insight: info,
      });
    }
  };
}
