import { trackEvent } from "./events.js";
import { annotateRequest } from "./health-log.js";
import type { ToolCall } from "./tool-call.types.js";

/** Logs the call on the request's health line and records its events. */
export function recordToolCall({ tool, outcome, durationMs, dataSource, insight = {} }: ToolCall): void {
  annotateRequest({ tool, outcome, data_source: dataSource, result_count: insight.resultCount });
  trackEvent({
    name: "tool_call",
    params: {
      tool,
      outcome,
      duration_ms: Math.round(durationMs),
      data_source: dataSource,
      result_count: insight.resultCount,
      ...insight.params,
    },
  });
  if (outcome !== "ok") {
    return;
  }

  if (insight.resultCount === 0) {
    trackEvent({ name: "search_no_results", params: { tool, ...insight.params } });
  }

  for (const milestone of insight.milestones ?? []) {
    trackEvent(milestone);
  }

  if (insight.selected) {
    for (const [rank, id] of insight.selected.ids.entries()) {
      trackEvent({
        name: "session_selected",
        params: { talk_id: id, source: insight.selected.source, rank: rank + 1 },
      });
    }
  }
}
