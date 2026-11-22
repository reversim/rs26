/**
 * Local HTTP server for development and testing:  npm run dev
 * Serves the same hardened handler as production at http://127.0.0.1:3000/mcp
 */
import { createServer } from "node:http";
import { handleMcpHttp } from "./http/handler.js";

const port = Number(process.env.PORT) || 3000;
// Bind to loopback only, so the dev server is never exposed on the network.
const host = process.env.HOST || "127.0.0.1";

createServer((req, res) => void handleMcpHttp({ request: req, response: res })).listen(port, host, () => {
  console.log(`Reversim 2026 MCP server listening on http://${host}:${port}/mcp`);
});
