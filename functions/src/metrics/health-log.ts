import { currentContext } from "./context.js";
import type { ParamValue, Params } from "./context.types.js";

/** Add fields to the current request's health log line. */
export function annotateRequest(fields: Params): void {
  const context = currentContext();
  if (!context) {
    return;
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      context.log[key] = value;
    }
  }
}

/**
 * Writes one structured JSON line on stdout, which Cloud Logging collects. Never contains free text the
 * attendee typed or their IP. Disable with METRICS_LOG=off.
 */
export function logMetric({ type, fields }: { type: string; fields: Params }): void {
  if (process.env.METRICS_LOG === "off") {
    return;
  }

  const line: Record<string, ParamValue> = { type, ts: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      line[key] = value;
    }
  }
  console.log(JSON.stringify(line));
}
