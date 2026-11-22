# Reversim Summit 2026 MCP server

An [MCP](https://modelcontextprotocol.io) server that helps
[Reversim Summit 2026](https://summit2026.reversim.com) attendees (Nov 30 – Dec 1, 2026)
find the talks that fit them best and plan a clash-free schedule, right from Claude
or any other MCP client.

> "I'm a backend engineer into LLM agents and observability. What should I see on day 1?"

It runs as a single stateless Firebase Cloud Function (gen 2) and is served from the
website's own domain: **`https://summit2026.reversim.com/mcp`**.

## Tools

| Tool                  | What it does                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `get_conference_info` | Dates, tracks (with talk counts), rooms, registration link                                               |
| `search_sessions`     | Free text search and filters: day, track, room, speaker, time window                                     |
| `get_sessions`        | Full details for session ids: abstract, link, speaker bios                                               |
| `find_speakers`       | Find speakers by name or by words in their bio/tagline (e.g. a company)                                  |
| `recommend_sessions`  | Ranked candidates for the attendee's interests/role, with abstracts, for the AI to reason over           |
| `build_schedule`      | Clash-free personal schedule: must-sees first, gaps filled by interests, alternatives and clashes listed |
| `whats_on`            | What's on now and what's next (venue time), or at any given time                                         |
| `export_calendar`     | `.ics` file for the chosen sessions (works with Google Calendar, Outlook and Apple Calendar)             |

Also available: the resource `reversim://agenda` (the full agenda as Markdown)
and the prompt `plan_my_reversim`.

Recommendations work without any API key. The server does fast keyword/synonym
ranking, and the attendee's own AI client reads the abstracts and makes the final call.

## Data

The agenda comes live from the event's public Sessionize API — the same source the
website uses — cached for 10 minutes. If Sessionize is unreachable, the server falls
back to a bundled snapshot (`src/data/snapshot.ts`).

To refresh the snapshot:

```bash
npm run update-snapshot
```

## Connect

- **Claude (claude.ai / Desktop):** Settings → Connectors → _Add custom connector_ →
  `https://summit2026.reversim.com/mcp`
- **Claude Code:** `claude mcp add --transport http reversim https://summit2026.reversim.com/mcp`
- **With a token** (if `MCP_AUTH_TOKEN` is set): add the header `Authorization: Bearer <token>`.

## Develop

```bash
npm install
npm run dev          # http://127.0.0.1:3000/mcp (loopback only, no Firebase needed)
npm test             # offline tests, including the security tests
npm run lint
npm run typecheck
npx @modelcontextprotocol/inspector   # point it at http://127.0.0.1:3000/mcp
```

`npm run dev` serves the same hardened handler as production over plain Node, which is
the fastest loop. To exercise the real Firebase wrapper (Express, `rawBody`, the function
config), use the emulator from the repository root:

```bash
firebase emulators:start --only functions
# → http://127.0.0.1:5001/reversim-26/us-central1/mcp/mcp
```

Requires Node 22 (the deployed runtime; `firebase.json` pins `nodejs22`).

## Layout

The server is deliberately independent of the Astro site: its own `package.json`,
`tsconfig.json`, lint and format config, and its own `node_modules`. The site's
`prettier` and `astro check` skip this directory, and nothing here imports from `src/`
at the repository root.

```text
src/index.ts      the Cloud Function (onRequest) — everything else is platform-agnostic
src/http/         body limits, auth, origin checks, rate limits, headers
src/server.ts     MCP tool, resource and prompt registration
src/tools/        one file per tool, grouped by feature
src/logic/        pure functions over an Agenda (no I/O)
src/data/         fetching, validating and normalizing the feeds, plus the snapshot
src/metrics/      the structured log
```

## Deploy

**CI is the source of truth.** Pushing to `main` with changes under `functions/` (or to
`firebase.json`) runs lint, typecheck and tests, and then deploys — see the `functions`
job in `.github/workflows/deploy.yaml`. Pull requests run the same checks plus a build.

Two things to know about how this is wired:

- The site's deploy is pinned to `firebase deploy --only hosting`. It also runs on a
  nightly cron, and without that flag every night would publish a new Cloud Run revision
  of the function (with a cold start) for no code change.
- Hosting preview channels **cannot** host their own copy of a function. A `/mcp` request
  against a PR preview URL reaches the **live** function, so function changes cannot be
  previewed — the PR checks are what gate them.

Deploying by hand is possible (`firebase deploy --only functions:mcp`) but should stay a
break-glass option, so that what is deployed always matches `main`.

### Configuration

Every variable is optional; the defaults are what production runs.

| Variable                | Default | What it does                                                       |
| ----------------------- | ------- | ------------------------------------------------------------------ |
| `MCP_AUTH_TOKEN`        | unset   | When set, requests must carry `Authorization: Bearer <token>`      |
| `ALLOWED_ORIGINS`       | unset   | Comma-separated browser origins allowed to call the server         |
| `RATE_LIMIT_PER_MINUTE` | `60`    | Per-instance, per-IP limit                                         |
| `TRUSTED_PROXY_HOPS`    | `0`     | `X-Forwarded-For` entries after the caller's own (see SECURITY.md) |
| `METRICS_LOG`           | on      | `off` silences the structured log                                  |
| `REVERSIM_OFFLINE`      | unset   | `1` serves the bundled snapshot and never calls Sessionize (tests) |

Non-secret values go in `functions/.env.reversim-26`, which Firebase reads at deploy time.
Put `MCP_AUTH_TOKEN` in Secret Manager instead (`firebase functions:secrets:set`) if you
ever switch the server off public mode.

## Metrics

Everything is a structured JSON line on stdout, which Cloud Logging collects from the
container. There is no analytics service and no outbound call: gen 2 functions run on
Cloud Run, where the CPU is throttled the moment the response is sent and there is no
`waitUntil`, so anything left running in the background can stall or be lost. Writing to
stdout during the request costs nothing and loses nothing.

**One `request` line per HTTP request:**

```json
{
  "type": "request",
  "ts": "2026-11-22T18:43:30.432Z",
  "rid": "dfe25063-…",
  "session": "6246dc83-…",
  "session_tracked": true,
  "status": 200,
  "duration_ms": 634,
  "method": "tools/call",
  "tool": "recommend_sessions",
  "outcome": "ok",
  "data_source": "live",
  "result_count": 2,
  "xff_depth": 2
}
```

**One `event` line per tracked event**, for funnels: `client_connected`, `tool_call`,
`search_no_results`, `session_selected`, `schedule_built`, `calendar_exported`,
`agenda_viewed`, `prompt_used`. There is also an `agenda_fetch` line for each Sessionize
fetch (`outcome: "ok"` or `"fallback"`).

Useful queries in Cloud Logging:

```text
jsonPayload.type="request" AND jsonPayload.status>=400     errors
jsonPayload.type="request" AND jsonPayload.duration_ms>2000  slow calls
jsonPayload.outcome="fallback"                             Sessionize was unreachable
jsonPayload.type="event" AND jsonPayload.name="tool_call"   usage by tool
```

**Sessions.** On `initialize` the server returns a random `Mcp-Session-Id`, and MCP clients
send it back on every later request, so one conversation shares one id and a funnel can be
followed end to end. The server stores nothing: it never validates or rejects session ids.
The id identifies a conversation, not a person, so a new chat is a new id. Requests without
the header are logged as `session_tracked: false` with no id at all.

**What is never logged:** free text the attendee typed (only its length or whether it was
present), IP addresses, user agents and auth headers. This is enforced in
`src/metrics/events.ts` and tested in `test/metrics.test.ts`.
