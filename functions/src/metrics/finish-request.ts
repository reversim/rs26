import type { RequestContext } from "./context.types.js";
import { logMetric } from "./health-log.js";

/**
 * Called once per HTTP request, after the response is written: one health log line for the
 * request, then one line per event it recorded.
 *
 * Everything is written to stdout while the request is still running, which is deliberate.
 * Gen 2 functions run on Cloud Run, where the CPU is throttled as soon as the response is
 * sent and there is no `waitUntil`: work left pending in the background may stall until an
 * unrelated later request wakes the instance, or be lost when it is reclaimed. Cloud Logging
 * collects stdout from the container, so these lines cost no network call and no latency.
 */
export function finishRequest({
  context,
  status,
  durationMs,
}: {
  context: RequestContext;
  status: number;
  durationMs: number;
}): void {
  const session = context.sessionTracked ? context.sessionId : undefined;
  logMetric({
    type: "request",
    fields: {
      rid: context.requestId,
      session,
      session_tracked: context.sessionTracked,
      status,
      duration_ms: Math.round(durationMs),
      ...context.log,
    },
  });
  for (const event of context.events) {
    logMetric({
      type: "event",
      fields: {
        rid: context.requestId,
        session,
        session_tracked: context.sessionTracked,
        name: event.name,
        ...event.params,
      },
    });
  }
}
