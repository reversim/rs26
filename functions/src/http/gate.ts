import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { TRUSTED_PROXY_HOPS } from "../config.js";
import { annotateRequest } from "../metrics/health-log.js";
import { RateLimiter } from "./rate-limit.js";
import { sendError } from "./respond.js";

const DEFAULT_RATE_LIMIT = 60;

function configuredLimit(): number {
  const configured = Number(process.env.RATE_LIMIT_PER_MINUTE);

  return configured > 0 ? configured : DEFAULT_RATE_LIMIT;
}

let limiter: RateLimiter | undefined;

/**
 * The per-instance limiter, kept across requests so its counts mean something.
 *
 * The limit itself is read from the environment on every request (like `allowedOrigins`),
 * and changing it starts a fresh limiter: in production it never changes, so this is built
 * once per instance.
 */
function rateLimiter(): RateLimiter {
  const limit = configuredLimit();
  if (!limiter || limiter.limit !== limit) {
    limiter = new RateLimiter({ limit, windowMs: 60_000 });
  }

  return limiter;
}

function allowedOrigins(): Set<string> {
  return new Set(
    (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

/** How many trailing X-Forwarded-For entries our own infrastructure added. */
function trustedHops(): number {
  const configured = Number(process.env.TRUSTED_PROXY_HOPS);

  return Number.isInteger(configured) && configured >= 0 ? configured : TRUSTED_PROXY_HOPS;
}

/** The X-Forwarded-For chain, left (closest to the caller) to right (closest to us). */
function forwardedChain(request: IncomingMessage): string[] {
  const header = request.headers["x-forwarded-for"];

  return (Array.isArray(header) ? header.join(",") : (header ?? ""))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Best-effort client address, used only as the rate-limit key.
 *
 * Google's front end *appends* to X-Forwarded-For rather than replacing it, so the leftmost
 * entries are whatever the caller chose to send and must never be trusted — keying on them
 * would let one client spend everyone else's budget by rotating a header. Each proxy appends
 * the peer it heard from, so the caller's real address is the entry the outermost proxy we
 * control added, and we count in from the right to find it.
 *
 * TRUSTED_PROXY_HOPS is how many entries were appended *after* that one: 1 behind the Hosting
 * rewrite (Hosting appends the client, Cloud Run then appends Hosting), 0 when the function's
 * own URL is called directly. Every request logs `xff_depth` so the real chain can be read
 * from Cloud Logging after deploying and this set to match. Too small a value is spoofable;
 * too large collapses every caller onto one key and rate-limits them together.
 */
function clientIp(request: IncomingMessage): string {
  const chain = forwardedChain(request);
  const trusted = chain.at(-1 - trustedHops());

  return trusted || chain.at(-1) || request.socket?.remoteAddress || "unknown";
}

function sha256(text: string): Buffer {
  return createHash("sha256").update(text).digest();
}

/** True when MCP_AUTH_TOKEN is unset (public mode) or the request carries it as a bearer token. */
function isAuthorized(request: IncomingMessage): boolean {
  const token = process.env.MCP_AUTH_TOKEN;
  // Public mode (default): the data is public anyway.
  if (!token) {
    return true;
  }

  const header = request.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return false;
  }

  // Hash both sides so lengths match and comparison is constant-time.
  return timingSafeEqual(sha256(match[1].trim()), sha256(token));
}

/**
 * Origin allowlist and CORS (DNS-rebinding / CSRF protection). Returns true when the request has already
 * been answered: a refused origin or a preflight.
 */
export function answeredByOriginCheck({
  request,
  response,
}: {
  request: IncomingMessage;
  response: ServerResponse;
}): boolean {
  // Browsers send Origin; server-side MCP clients typically don't.
  const origin = request.headers.origin;
  if (!origin) {
    return false;
  }

  if (!allowedOrigins().has(origin)) {
    sendError({ response, status: 403, message: "Origin not allowed" });

    return true;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "POST");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Protocol-Version, Mcp-Session-Id",
  );
  response.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  response.setHeader("Access-Control-Max-Age", "600");
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();

    return true;
  }

  return false;
}

/** Method, rate limit, auth and content type. Returns true when the request was rejected. */
export function rejectedByGate({ request, response }: { request: IncomingMessage; response: ServerResponse }): boolean {
  // Stateless server: no SSE stream (GET) and no sessions to delete (DELETE).
  if (request.method !== "POST") {
    sendError({ response, status: 405, message: "Method not allowed", headers: { Allow: "POST" } });

    return true;
  }

  // Depth only, never the addresses themselves: it is what tells us whether
  // TRUSTED_PROXY_HOPS matches the real chain in front of the function.
  annotateRequest({ xff_depth: forwardedChain(request).length });
  const limit = rateLimiter().hit({ key: clientIp(request) });
  response.setHeader("RateLimit-Limit", String(limit.limit));
  response.setHeader("RateLimit-Remaining", String(limit.remaining));
  if (!limit.allowed) {
    const headers = { "Retry-After": String(limit.retryAfterSeconds) };
    sendError({ response, status: 429, message: "Too many requests", headers });

    return true;
  }

  if (!isAuthorized(request)) {
    const headers = { "WWW-Authenticate": 'Bearer realm="reversim-mcp"' };
    sendError({ response, status: 401, message: "Unauthorized", headers });

    return true;
  }

  const contentType = String(request.headers["content-type"] ?? "");
  if (!contentType.toLowerCase().startsWith("application/json")) {
    sendError({ response, status: 415, message: "Content-Type must be application/json" });

    return true;
  }

  return false;
}
