import { onRequest } from "firebase-functions/https";
import { handleMcpHttp } from "./http/handler.js";

/**
 * The MCP endpoint, served at https://summit2026.reversim.com/mcp through the
 * Firebase Hosting rewrite in `firebase.json`.
 *
 * Gen 2 functions run on Cloud Run, so:
 * - `cors: false` keeps the platform from answering preflights; `src/http/gate.ts` does
 *   the origin allowlisting itself (a permissive platform CORS layer would undo it).
 * - `invoker: "public"` is what lets the Hosting rewrite reach the function at all.
 * - `maxInstances` is the real spend cap. The in-process rate limiter only sees its own
 *   instance, so this is what bounds a flood (see SECURITY.md).
 * - Nothing is kept between requests: one MCP server per request, no sessions, no streams.
 */
export const mcp = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 30,
    concurrency: 40,
    maxInstances: 10,
    cors: false,
    invoker: "public",
  },
  (request, response) => handleMcpHttp({ request, response }),
);
