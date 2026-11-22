import type { ServerResponse } from "node:http";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

/** Strict headers on every response, whatever its status. */
export function applySecurityHeaders(response: ServerResponse): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
  response.removeHeader("X-Powered-By");
}

/** Ends the response with a JSON-RPC shaped error, so MCP clients can display it. Does nothing once headers are out. */
export function sendError({
  response,
  status,
  message,
  headers = {},
}: {
  response: ServerResponse;
  status: number;
  message: string;
  headers?: Record<string, string>;
}): void {
  if (response.headersSent) {
    return;
  }

  for (const [name, value] of Object.entries(headers)) {
    response.setHeader(name, value);
  }
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}
