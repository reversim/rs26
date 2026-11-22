import { currentContext } from "./context.js";
import type { ParamValue, Params } from "./context.types.js";

/** Bounds on one event, so no caller can grow a log line without limit. */
const MAX_PARAMS_PER_EVENT = 25;
const MAX_PARAM_VALUE = 100;
const MAX_EVENTS_PER_REQUEST = 100;
/** Fields `finishRequest` puts on every line: type, ts, rid, session, session_tracked, name. */
const ENVELOPE_FIELDS = 6;
const NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;
/** The envelope's own field names, so an event's params can never shadow them. */
const RESERVED_PARAM_RE = /^(?:type|ts|rid|session|session_tracked|name)$/;

function cleanValue(value: ParamValue): string | number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  // Control characters out (they would break one-line JSON logs), length limit enforced.
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_PARAM_VALUE);
}

function cleanParams(params: Params): Record<string, string | number> {
  const cleaned: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || !NAME_RE.test(key) || RESERVED_PARAM_RE.test(key)) {
      continue;
    }

    // Leave room for the envelope fields.
    if (Object.keys(cleaned).length >= MAX_PARAMS_PER_EVENT - ENVELOPE_FIELDS) {
      break;
    }

    cleaned[key] = cleanValue(value);
  }

  return cleaned;
}

/**
 * Record an event for the current request. No-op outside a request.
 *
 * Events are written to Cloud Logging by `finishRequest`, one JSON line each, and never
 * leave the process any other way.
 *
 * Privacy rules (tested in test/metrics.test.ts):
 * - No free text the attendee typed (interests, queries, names) is ever recorded,
 *   only its length or whether it was present.
 * - No IP addresses, user agents or auth headers.
 * - Session ids are random UUIDs issued by this server; they identify a conversation, not a person.
 * - Only values from the public agenda (session ids, track names) or from fixed vocabularies
 *   (tool names, outcomes) are recorded as-is.
 */
export function trackEvent({ name, params = {} }: { name: string; params?: Params }): void {
  const context = currentContext();
  if (!context || !NAME_RE.test(name) || context.events.length >= MAX_EVENTS_PER_REQUEST) {
    return;
  }

  context.events.push({ name, params: cleanParams(params) });
}
