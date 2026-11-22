import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { handleMcpHttp } from "../src/http/handler.js";
import { newRequestContext, parseSessionId, runWithContext, SESSION_ID_RE } from "../src/metrics/context.js";
import { trackEvent } from "../src/metrics/events.js";
import { finishRequest } from "../src/metrics/finish-request.js";
import { recordLog } from "./fakes/recorded-log.js";
import type { RecordedLog } from "./fakes/recorded-log.types.js";

// Free text the attendee types. None of it may ever appear in a log line.
const SECRET = "Zorblax-Quantum-Pickle";

let server: Server;
let base: string;
let log: RecordedLog;

beforeAll(async () => {
  server = createServer((req, res) => void handleMcpHttp({ request: req, response: res }));
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((closed) => server.close(() => closed())));

beforeEach(() => {
  process.env.METRICS_LOG = "on";
  log = recordLog();
});

afterEach(() => {
  log.restore();
  process.env.METRICS_LOG = "off";
});

const baseHeaders = { "content-type": "application/json", accept: "application/json, text/event-stream" };
let nextId = 1;

async function call({
  method,
  params,
  headers = {},
}: {
  method: string;
  params: unknown;
  headers?: Record<string, string>;
}) {
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { ...baseHeaders, ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });

  return { response, body: await response.json() };
}

async function initialize() {
  const { response } = await call({
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "claude-ai", version: "0.1.0" },
    },
  });

  return response.headers.get("mcp-session-id")!;
}

const tool = ({ name, args, sessionId }: { name: string; args: unknown; sessionId?: string }) =>
  call({
    method: "tools/call",
    params: { name, arguments: args },
    headers: sessionId ? { "mcp-session-id": sessionId } : {},
  });

it("session id is issued on initialize and exposed to allowlisted browser origins", async () => {
  const id = await initialize();
  expect(id).toMatch(SESSION_ID_RE);

  process.env.ALLOWED_ORIGINS = "https://good.example";
  try {
    const { response } = await call({
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "xx", version: "1" } },
      headers: { origin: "https://good.example" },
    });
    expect(response.headers.get("access-control-expose-headers")).toContain("Mcp-Session-Id");
  } finally {
    delete process.env.ALLOWED_ORIGINS;
  }
});

it("session id only accepts well-formed UUIDs from clients", () => {
  expect(parseSessionId("8c4f0a5e-3b1d-4c2e-9f6a-1b2c3d4e5f60")).toBe("8c4f0a5e-3b1d-4c2e-9f6a-1b2c3d4e5f60");
  expect(parseSessionId("not-a-uuid")).toBeUndefined();
  expect(parseSessionId("<script>")).toBeUndefined();
  expect(parseSessionId(undefined)).toBeUndefined();
});

it("session id never makes a request fail (server stays stateless)", async () => {
  const { response, body } = await tool({ name: "get_conference_info", args: {}, sessionId: "garbage" });
  expect(response.status).toBe(200);
  expect(body.result.isError).toBeUndefined();
  const unknown = await tool({
    name: "get_conference_info",
    args: {},
    sessionId: "8c4f0a5e-3b1d-4c2e-9f6a-1b2c3d4e5f60",
  });
  expect(unknown.response.status).toBe(200);
});

it("events group a whole conversation under one session id", async () => {
  const sid = await initialize();
  await tool({ name: "recommend_sessions", args: { interests: `LLM agents ${SECRET}` }, sessionId: sid });
  const scheduled = await tool({
    name: "build_schedule",
    args: { mustSee: ["1273185"], interests: SECRET },
    sessionId: sid,
  });
  const ids = JSON.parse(scheduled.body.result.content[0].text).sessionIds as string[];
  await tool({ name: "export_calendar", args: { sessionIds: ids.slice(0, 3) }, sessionId: sid });

  const events = log.lines("event");
  expect(new Set(events.map((event) => event.session))).toEqual(new Set([sid]));
  expect(events.every((event) => event.session_tracked === true)).toBe(true);

  const names = events.map((event) => event.name);
  expect(names[0]).toBe("client_connected");
  expect(names).toEqual(
    expect.arrayContaining(["tool_call", "schedule_built", "calendar_exported", "session_selected"]),
  );

  const connected = events.find((event) => event.name === "client_connected")!;
  expect(connected).toMatchObject({ client_name: "claude-ai", client_version: "0.1.0" });

  const exported = events.filter((event) => event.name === "session_selected" && event.source === "export_calendar");
  expect(exported.map((event) => event.talk_id)).toEqual(ids.slice(0, 3));
  const mustSee = events.filter((event) => event.name === "session_selected" && event.source === "must_see");
  expect(mustSee.map((event) => event.talk_id)).toEqual(["1273185"]);
});

it("events never record free text, IPs or unknown values", async () => {
  const sid = await initialize();
  await tool({ name: "search_sessions", args: { query: SECRET, tracks: [SECRET], day: SECRET }, sessionId: sid });
  await tool({ name: "search_sessions", args: { query: SECRET, tracks: ["AI/ML"] }, sessionId: sid });
  await tool({ name: "recommend_sessions", args: { interests: SECRET, role: SECRET, avoid: SECRET }, sessionId: sid });
  await tool({ name: "find_speakers", args: { name: SECRET, query: SECRET }, sessionId: sid });
  await tool({ name: "get_sessions", args: { ids: ["99999999"] }, sessionId: sid });
  await call({
    method: "prompts/get",
    params: { name: "plan_my_reversim", arguments: { about_me: SECRET } },
    headers: { "mcp-session-id": sid },
  });

  const written = log.text();
  expect(written).not.toContain(SECRET);
  expect(written).not.toContain("127.0.0.1");
  expect(written).not.toContain("99999999");

  const events = log.lines("event");
  expect(events.filter((event) => event.name === "search_no_results").length).toBeGreaterThan(0);
  // An unknown day is a user error, a known track is passed through.
  expect(events.some((event) => event.name === "tool_call" && event.outcome === "user_error")).toBe(true);
  expect(events.some((event) => event.track === "AI/ML")).toBe(true);
  expect(events.some((event) => event.name === "prompt_used" && event.has_about_me === "true")).toBe(true);
});

it("events from requests without a session header are marked untracked and carry no id", async () => {
  await tool({ name: "get_conference_info", args: {} });
  await tool({ name: "get_conference_info", args: {} });
  const events = log.lines("event");
  expect(events).toHaveLength(2);
  expect(events.every((event) => event.session_tracked === false)).toBe(true);
  expect(events.every((event) => !("session" in event))).toBe(true);
});

it("events are bounded and cannot shadow the envelope fields", () => {
  const context = newRequestContext();
  runWithContext({
    context,
    run: () => {
      for (let i = 0; i < 60; i++) {
        trackEvent({ name: "session_selected", params: { talk_id: String(i), session: "spoofed", name: "spoofed" } });
      }
      trackEvent({ name: "Bad-Name", params: {} }); // invalid names are dropped
      trackEvent({ name: "xx", params: { long: "y".repeat(500), "bad key": "zz" } });
    },
  });
  expect(context.events).toHaveLength(61);

  finishRequest({ context, status: 200, durationMs: 12 });
  const events = log.lines("event");
  expect(events).toHaveLength(61);
  expect(events.map((event) => event.name).filter((name) => name === "Bad-Name")).toEqual([]);

  const first = events[0];
  expect(first.name).toBe("session_selected");
  expect(first.talk_id).toBe("0");
  // The envelope's own fields win over anything an event tried to set.
  expect(first).not.toHaveProperty("session");
  expect(first.session_tracked).toBe(false);

  const last = events.at(-1)!;
  expect(String(last.long)).toHaveLength(100);
  expect(last).not.toHaveProperty("bad key");
});

it("health log writes one JSON line per request with status, method, tool and outcome", async () => {
  const sid = await initialize();
  await tool({ name: "search_sessions", args: { query: "kubernetes" }, sessionId: sid });
  await fetch(`${base}/nope`, { method: "POST", headers: baseHeaders, body: "{}" });

  const requests = log.lines("request");
  expect(requests).toHaveLength(3);
  expect(requests[0]).toMatchObject({ method: "initialize", status: 200, session: sid, client_name: "claude-ai" });
  expect(requests[1]).toMatchObject({
    method: "tools/call",
    tool: "search_sessions",
    outcome: "ok",
    data_source: "snapshot",
    status: 200,
    session: sid,
  });
  expect(Number(requests[1].duration_ms)).toBeGreaterThanOrEqual(0);
  expect(requests[2]).toMatchObject({ status: 404, session_tracked: false });
  expect(requests[2]).not.toHaveProperty("session");
});

it("health log records the X-Forwarded-For depth, never the addresses", async () => {
  await tool({ name: "get_conference_info", args: {} });
  const direct = log.lines("request").at(-1)!;
  expect(direct.xff_depth).toBe(0);

  log.clear();
  await call({ method: "tools/list", params: {}, headers: { "x-forwarded-for": "203.0.113.7, 198.51.100.1" } });
  const forwarded = log.lines("request").at(-1)!;
  expect(forwarded.xff_depth).toBe(2);
  expect(log.text()).not.toContain("203.0.113.7");
});

it("health log can be turned off", async () => {
  process.env.METRICS_LOG = "off";
  await tool({ name: "get_conference_info", args: {} });
  expect(log.raw()).toHaveLength(0);
});
