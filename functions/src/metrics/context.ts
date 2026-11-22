import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestContext } from "./context.types.js";

const storage = new AsyncLocalStorage<RequestContext>();

/** The shape of session ids this server issues (random v4 UUIDs). */
export const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function newSessionId(): string {
  return randomUUID();
}

/** Returns the session id from a client header if it is one we could have issued, else undefined. */
export function parseSessionId(header: string | string[] | undefined): string | undefined {
  const value = (Array.isArray(header) ? header[0] : header)?.trim().toLowerCase();

  return value && SESSION_ID_RE.test(value) ? value : undefined;
}

/** Client name/version from `initialize`: keep a conservative character set and length. */
export function cleanClientField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value
    .replace(/[^A-Za-z0-9 ._@/+()-]/g, "")
    .trim()
    .slice(0, 60);

  return cleaned || undefined;
}

export function newRequestContext(): RequestContext {
  return { requestId: randomUUID(), sessionId: randomUUID(), sessionTracked: false, events: [], log: {} };
}

/** Runs `run` with `context` as the current request, including everything it awaits. */
export function runWithContext<Result>({ context, run }: { context: RequestContext; run: () => Result }): Result {
  return storage.run(context, run);
}

export function currentContext(): RequestContext | undefined {
  return storage.getStore();
}
