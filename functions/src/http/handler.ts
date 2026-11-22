import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { newRequestContext, runWithContext } from "../metrics/context.js";
import type { RequestContext } from "../metrics/context.types.js";
import { finishRequest } from "../metrics/finish-request.js";
import { annotateRequest } from "../metrics/health-log.js";
import { createServer } from "../server.js";
import { HttpError, parseMessage, readBody } from "./body.js";
import { answeredByOriginCheck, rejectedByGate } from "./gate.js";
import { applySecurityHeaders, sendError } from "./respond.js";
import { assignSession } from "./session.js";

async function serveMcp({
  context,
  request,
  response,
}: {
  context: RequestContext;
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  const path = (request.url ?? "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/mcp" && path !== "/api/mcp") {
    sendError({ response, status: 404, message: "Not found" });

    return;
  }

  if (answeredByOriginCheck({ request, response }) || rejectedByGate({ request, response })) {
    return;
  }

  const message = parseMessage({ raw: await readBody(request), response });
  if (!message) {
    return;
  }

  annotateRequest({ method: message.method });
  assignSession({ context, request, response, message });

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true, // plain JSON responses, no long-lived streams
  });
  response.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(request, response, message.body);
}

async function handle({
  context,
  request,
  response,
}: {
  context: RequestContext;
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  applySecurityHeaders(response);
  try {
    await serveMcp({ context, request, response });
  } catch (error) {
    if (error instanceof HttpError) {
      sendError({ response, status: error.status, message: error.message });

      return;
    }

    annotateRequest({ outcome: "internal_error" });
    console.error("[reversim-mcp] request failed:", error instanceof Error ? error.message : "unknown error");
    sendError({ response, status: 500, message: "Internal server error" });
  }
}

/**
 * Hardened HTTP entry point, shared by the Cloud Function and the local dev server.
 *
 * - Only `POST /mcp` with a JSON body is accepted. Everything else gets 404/405/415.
 * - Request bodies are capped (MAX_BODY_BYTES) and read before any MCP parsing.
 * - Stateless: no sessions, no SSE streams, nothing kept between requests.
 * - Optional bearer token (MCP_AUTH_TOKEN), checked in constant time.
 * - Browser `Origin` headers must be on an allowlist (DNS-rebinding / CSRF protection).
 * - Per-IP rate limiting (best effort per instance; `maxInstances` is the real cap).
 * - Strict security headers and no CORS unless an origin is allowlisted.
 * - Analytics session id: issued as `Mcp-Session-Id` on initialize and read back on later
 *   requests. The server keeps no session state; the id is only used to group metrics.
 */
export async function handleMcpHttp({
  request,
  response,
}: {
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  const context = newRequestContext();
  const started = performance.now();
  try {
    await runWithContext({ context, run: () => handle({ context, request, response }) });
  } finally {
    finishRequest({ context, status: response.statusCode, durationMs: performance.now() - started });
  }
}
