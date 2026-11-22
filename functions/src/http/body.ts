import type { IncomingMessage, ServerResponse } from "node:http";
import type { Message, RawBodyRequest } from "./body.types.js";
import { sendError } from "./respond.js";

/** Largest request body accepted, in bytes. */
export const MAX_BODY_BYTES = 32 * 1024;

/** An error that becomes an HTTP status with a message safe to show the client. */
export class HttpError extends Error {
  readonly status: number;

  constructor({ status, message }: { status: number; message: string }) {
    super(message);
    this.status = status;
  }
}

/** The body Cloud Functions already read, when there is one. */
function bufferedBody(request: IncomingMessage): Buffer | undefined {
  const { rawBody } = request as RawBodyRequest;

  return Buffer.isBuffer(rawBody) ? rawBody : undefined;
}

/**
 * Reads the whole body, refusing anything over MAX_BODY_BYTES (declared or actual) with a 413.
 *
 * On Cloud Functions the platform has already read the body into `rawBody` and left the
 * request stream drained, so iterating it would yield an empty body. The buffer is the
 * source of truth whenever it is there; the stream path is for the dev server and tests.
 *
 * Note the limit can then only reject an oversized body, not avoid buffering it: the
 * platform accepts up to its own 32 MB cap before we are called (see SECURITY.md).
 */
export async function readBody(request: IncomingMessage): Promise<string> {
  const declaredBytes = Number(request.headers["content-length"] ?? 0);
  if (declaredBytes > MAX_BODY_BYTES) {
    throw new HttpError({ status: 413, message: "Request body too large" });
  }

  const buffered = bufferedBody(request);
  if (buffered) {
    if (buffered.length > MAX_BODY_BYTES) {
      throw new HttpError({ status: 413, message: "Request body too large" });
    }

    return buffered.toString("utf8");
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
    totalBytes += buffer.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new HttpError({ status: 413, message: "Request body too large" });
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

/** MCP method names are short identifiers; anything else is logged as "other". */
function methodName(body: object): string | undefined {
  const method = (body as { method?: unknown }).method;
  if (typeof method !== "string") {
    return undefined;
  }

  return /^[a-z][a-zA-Z/_]{0,60}$/.test(method) ? method : "other";
}

/** Parses a single JSON-RPC message, or answers 400 and returns undefined. */
export function parseMessage({ raw, response }: { raw: string; response: ServerResponse }): Message | undefined {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    sendError({ response, status: 400, message: "Invalid JSON" });

    return undefined;
  }

  // One JSON-RPC message per request; batches are not supported.
  if (Array.isArray(body) || typeof body !== "object" || body === null) {
    sendError({ response, status: 400, message: "Expected a single JSON-RPC message" });

    return undefined;
  }

  return { body, method: methodName(body) };
}
