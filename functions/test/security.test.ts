import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { cleanText, safeHttpUrl, safePhotoUrl, validateFeeds } from "../src/data/validate.js";
import { MAX_BODY_BYTES, readBody } from "../src/http/body.js";
import type { RawBodyRequest } from "../src/http/body.types.js";
import { handleMcpHttp } from "../src/http/handler.js";
import { RateLimiter } from "../src/http/rate-limit.js";

process.env.REVERSIM_OFFLINE = "1";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => void handleMcpHttp({ request: req, response: res }));
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((closed) => server.close(() => closed())));

const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };

const rpc = ({ method, params }: { method: string; params?: unknown }) =>
  JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });

const toolsList = () => rpc({ method: "tools/list" });

async function post({
  body,
  extra = {},
  path = "/mcp",
}: {
  body: string;
  extra?: Record<string, string>;
  path?: string;
}) {
  return fetch(`${base}${path}`, { method: "POST", headers: { ...headers, ...extra }, body });
}

it("HTTP serves MCP on POST /mcp with security headers", async () => {
  const response = await post({ body: toolsList() });
  expect(response.status).toBe(200);
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
  const body = await response.json();
  const names = body.result.tools.map((entry: { name: string }) => entry.name);
  expect(names).toEqual(
    expect.arrayContaining(["search_sessions", "recommend_sessions", "build_schedule", "export_calendar"]),
  );
});

it("HTTP serves the same handler under the bare function path", async () => {
  // Reaching the function directly, not through the Hosting rewrite, keeps working.
  const response = await post({ body: toolsList(), path: "/api/mcp" });
  expect(response.status).toBe(200);
});

it("HTTP exposes every tool as read-only", async () => {
  const body = await (await post({ body: toolsList() })).json();
  for (const entry of body.result.tools) {
    expect(entry.annotations?.readOnlyHint).toBe(true);
  }
});

it("HTTP rejects other paths, methods, content types, batches and oversized bodies", async () => {
  expect((await post({ body: toolsList(), path: "/admin" })).status).toBe(404);
  expect((await fetch(`${base}/mcp`)).status).toBe(405);
  expect((await fetch(`${base}/mcp`, { method: "DELETE" })).status).toBe(405);
  expect((await post({ body: toolsList(), extra: { "content-type": "text/plain" } })).status).toBe(415);
  expect((await post({ body: "not json" })).status).toBe(400);
  expect((await post({ body: `[${toolsList()}]` })).status).toBe(400);
  expect((await post({ body: "x".repeat(MAX_BODY_BYTES + 1) })).status).toBe(413);
});

it("HTTP rejects browser origins that are not allowlisted", async () => {
  const refused = await post({ body: toolsList(), extra: { origin: "https://evil.example" } });
  expect(refused.status).toBe(403);

  process.env.ALLOWED_ORIGINS = "https://good.example";
  try {
    const allowed = await post({ body: toolsList(), extra: { origin: "https://good.example" } });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://good.example");
  } finally {
    delete process.env.ALLOWED_ORIGINS;
  }
});

it("HTTP requires the bearer token when MCP_AUTH_TOKEN is set", async () => {
  process.env.MCP_AUTH_TOKEN = "correct-horse";
  try {
    expect((await post({ body: toolsList() })).status).toBe(401);
    expect((await post({ body: toolsList(), extra: { authorization: "Bearer wrong" } })).status).toBe(401);
    expect((await post({ body: toolsList(), extra: { authorization: "Bearer correct-horse" } })).status).toBe(200);
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
});

it("HTTP validates tool input and does not leak internals", async () => {
  const response = await post({
    body: rpc({ method: "tools/call", params: { name: "get_sessions", arguments: { ids: ["../../etc/passwd"] } } }),
  });
  const body = await response.json();
  expect(body.result.isError).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(/at .*\.ts:\d+/); // no stack traces

  const long = await post({
    body: rpc({ method: "tools/call", params: { name: "search_sessions", arguments: { query: "a".repeat(5000) } } }),
  });
  expect((await long.json()).result.isError).toBe(true);
});

/** A request as Cloud Functions hands it over: body already read, stream drained. */
function platformRequest(raw: string): RawBodyRequest {
  const body = Buffer.from(raw);
  const request: Partial<RawBodyRequest> = {
    headers: { "content-length": String(body.length) },
    rawBody: body,
    [Symbol.asyncIterator]: () => {
      throw new Error("the platform already drained the stream");
    },
  };

  return request as RawBodyRequest;
}

it("body reads the body Cloud Functions already buffered, without touching the stream", async () => {
  await expect(readBody(platformRequest(toolsList()))).resolves.toBe(toolsList());
});

it("body enforces the size limit on a pre-buffered body too", async () => {
  await expect(readBody(platformRequest("x".repeat(MAX_BODY_BYTES + 1)))).rejects.toThrow(/too large/);
});

it("rate limiter blocks after the limit and resets after the window", () => {
  const limiter = new RateLimiter({ limit: 2, windowMs: 1000 });
  expect(limiter.hit({ key: "ip", now: 0 }).allowed).toBe(true);
  expect(limiter.hit({ key: "ip", now: 1 }).allowed).toBe(true);
  expect(limiter.hit({ key: "ip", now: 2 }).allowed).toBe(false);
  expect(limiter.hit({ key: "other", now: 2 }).allowed).toBe(true);
  expect(limiter.hit({ key: "ip", now: 1001 }).allowed).toBe(true);
});

it("rate limiter keys on a forwarded address the caller cannot forge", async () => {
  process.env.RATE_LIMIT_PER_MINUTE = "2";
  try {
    // The shape this deployment actually sees (xff_depth 1, measured in Cloud Logging):
    // Google appends the caller's address, so the last entry is ours and anything to the
    // left of it is whatever the caller sent. Rotating that prefix must not win a fresh
    // budget — otherwise one caller can spend everyone else's by varying a header.
    const spoofing = (claimed: string) =>
      post({ body: toolsList(), extra: { "x-forwarded-for": `${claimed}, 203.0.113.9` } });
    const statuses = [
      (await spoofing("10.0.0.1")).status,
      (await spoofing("10.0.0.2")).status,
      (await spoofing("10.0.0.3")).status,
    ];
    expect(statuses).toEqual([200, 200, 429]);
  } finally {
    delete process.env.RATE_LIMIT_PER_MINUTE;
  }
});

it("rate limiter still separates callers when a trusted hop is configured", async () => {
  process.env.RATE_LIMIT_PER_MINUTE = "2";
  process.env.TRUSTED_PROXY_HOPS = "1";
  try {
    // One extra trusted hop shifts the key one entry left, so the chain reads
    // [caller-supplied…, real client, our hop] and 198.51.100.x is what counts.
    const from = (client: string) =>
      post({ body: toolsList(), extra: { "x-forwarded-for": `10.0.0.9, ${client}, 203.0.113.9` } });
    expect((await from("198.51.100.1")).status).toBe(200);
    expect((await from("198.51.100.1")).status).toBe(200);
    expect((await from("198.51.100.1")).status).toBe(429);
    // A genuinely different caller keeps its own budget.
    expect((await from("198.51.100.2")).status).toBe(200);
  } finally {
    delete process.env.RATE_LIMIT_PER_MINUTE;
    delete process.env.TRUSTED_PROXY_HOPS;
  }
});

const feed = {
  grid: [
    {
      date: "2026-11-30T00:00:00",
      secret: "x",
      rooms: [
        {
          id: 1,
          name: "Main hall",
          sessions: [
            {
              id: "1",
              title: "T",
              description: null,
              startsAt: "2026-11-30T10:00:00",
              endsAt: "2026-11-30T10:30:00",
              isServiceSession: false,
              isPlenumSession: false,
              speakers: [{ id: "s", name: "N", email: "private@example.com" }],
              categories: [],
              roomId: 1,
              room: "Main hall",
              questionAnswers: [{ question: "Phone", answer: "050-0000000" }],
            },
          ],
        },
      ],
    },
  ],
  speakers: [],
};

it("upstream data drops fields we do not intend to expose", () => {
  const out = JSON.stringify(validateFeeds(feed));
  expect(out).not.toContain("private@example.com");
  expect(out).not.toContain("050-0000000");
  expect(out).not.toContain("secret");
});

it("upstream data rejects malformed payloads", () => {
  expect(() => validateFeeds({ grid: [], speakers: [] })).toThrow("too_small");
  expect(() => validateFeeds({ grid: "nope", speakers: [] })).toThrow("invalid_type");
});

it("upstream data only passes safe links and photos", () => {
  expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
  expect(safeHttpUrl("data:text/html,hi")).toBeUndefined();
  expect(safeHttpUrl("https://linkedin.com/in/x")).toBe("https://linkedin.com/in/x");
  expect(safePhotoUrl("https://evil.example/a.jpg")).toBeUndefined();
  expect(safePhotoUrl("https://cdn.sessionize.com/image/a.jpg")).toBe("https://cdn.sessionize.com/image/a.jpg");
});

it("upstream data strips control and bidi-override characters", () => {
  expect(cleanText("a‮bc\r\nd")).toBe("abc\nd");
});
