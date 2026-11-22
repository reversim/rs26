import type { IncomingMessage, ServerResponse } from "node:http";
import { cleanClientField, newSessionId, parseSessionId } from "../metrics/context.js";
import type { RequestContext } from "../metrics/context.types.js";
import { trackEvent } from "../metrics/events.js";
import { annotateRequest } from "../metrics/health-log.js";
import type { InitializeParams, Message } from "./body.types.js";

/**
 * Sets the conversation id used for metrics. A fresh one is issued on `initialize`
 * (clients echo it back as Mcp-Session-Id per the MCP spec); later requests reuse the
 * client's id if it is a well-formed UUID. Nothing is stored or validated server-side.
 */
export function assignSession({
  context,
  request,
  response,
  message,
}: {
  context: RequestContext;
  request: IncomingMessage;
  response: ServerResponse;
  message: Message;
}): void {
  if (message.method === "initialize") {
    context.sessionId = newSessionId();
    context.sessionTracked = true;
    response.setHeader("Mcp-Session-Id", context.sessionId);
    const params = (message.body as { params?: InitializeParams }).params;
    const fields = {
      client_name: cleanClientField(params?.clientInfo?.name) ?? "unknown",
      client_version: cleanClientField(params?.clientInfo?.version),
      protocol_version: cleanClientField(params?.protocolVersion),
    };
    annotateRequest(fields);
    trackEvent({ name: "client_connected", params: fields });

    return;
  }

  const fromClient = parseSessionId(request.headers["mcp-session-id"]);
  if (fromClient) {
    context.sessionId = fromClient;
    context.sessionTracked = true;
  }
}
