# Security report — Reversim Summit 2026 MCP server

This server is **public by design**: it answers questions about the public
RS26 agenda. "Secure" here means four things:

1. It exposes **only** the data we chose to expose.
2. Clients can **only** call the read-only tools we define.
3. It can't be used to reach anything else (no SSRF, no files, no secrets).
4. It's hard to abuse or knock over.

Every control below is enforced in code, and most have a test in
[`test/security.test.ts`](test/security.test.ts).

---

## 1. Attack surface

| Surface          | What is exposed                                                 | Everything else                                                                                        |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| HTTP             | `POST /mcp` only (JSON-RPC, one message per request)            | `404` for other paths, `405` for other methods, `415` for non-JSON                                     |
| MCP tools        | 8 read-only tools, all with `readOnlyHint: true`                | No tool writes, deletes, sends, or reads files/env                                                     |
| MCP resources    | `reversim://agenda` (public agenda as Markdown)                 | No resource templates and no file:// access                                                            |
| Static files     | None: the function serves no files at all                       | Source, `package.json` and tests are not in the deployed bundle (`firebase.json` → `functions.ignore`) |
| Outbound network | 2 hard-coded Sessionize URLs (`src/config.ts`) and nothing else | No URL is ever built from user input, so there is no SSRF                                              |

The server is **stateless**: no sessions, no SSE streams, no database, no cookies.
Nothing is stored between requests except a 10-minute in-memory cache of the
public agenda.

## 2. Data exposure: allowlist only

Data comes from Sessionize's public API for the event (`1saptwag`), the same
feeds the official website uses.

- **Schema allowlist** (`src/data/validate.ts`): the feeds are parsed with zod
  schemas that **drop unknown fields**. If Sessionize ever adds private data
  (Q&A answers, emails, phone numbers), it is discarded before it reaches the
  server. A test feeds an email and a phone number in and checks they never come out.
- **Malformed data is rejected** as a whole, and the server falls back to the
  reviewed, committed snapshot (`src/data/snapshot.ts`, also trimmed to the allowlist).
- **Size limits** on every upstream field, and on the whole payload (3 MB, streamed
  and cut off).
- **Links**: only `http(s)` speaker links pass (`javascript:` and `data:` are dropped).
  Photos are accepted only from `https://cdn.sessionize.com`.
- **Text sanitising**: control characters and Unicode bidi-override characters
  (spoofing / "Trojan Source") are removed from all third-party text.
- **Upstream fetch** (`src/data/agenda.ts`): 4 s timeout, `redirect: "error"` (never
  follows a redirect to another host), content-type must be JSON, no credentials sent.

Fields exposed per session: id, title, abstract, time, room, track, speaker
names, website link. Fields exposed per speaker: name, tagline, bio, public
links, Sessionize photo URL, talks. All of this is already public on
summit2026.reversim.com.

## 3. Request handling (`src/http/handler.ts`)

Checks run in this order and fail closed:

1. **Path**: must be `/mcp`, otherwise `404`.
2. **Origin**: if a browser `Origin` header is present, it must be in
   `ALLOWED_ORIGINS`, otherwise `403`. This blocks DNS-rebinding and cross-site
   requests. No CORS headers are sent unless the origin is allowlisted.
3. **Method**: only `POST` (and `OPTIONS` preflight for allowlisted origins), otherwise `405`.
4. **Rate limit**: per client IP, default 60 requests/min (`RATE_LIMIT_PER_MINUTE`), otherwise `429` with `Retry-After`.
5. **Auth** (optional): if `MCP_AUTH_TOKEN` is set, `Authorization: Bearer <token>`
   is required, otherwise `401`. The comparison is constant-time (SHA-256 + `timingSafeEqual`).
6. **Content-Type**: must be `application/json`, otherwise `415`.
7. **Body size**: max 32 KB, otherwise `413`. On Cloud Functions the platform reads the
   body before the handler runs, so this rejects an oversized body rather than avoiding
   buffering it — see "Known limitations".
8. **Shape**: a single JSON-RPC object. Batches and arrays get `400`. A body that is not
   valid JSON also gets `400`, from the platform's own parser before our handler runs.
9. **Tool arguments**: strict zod schemas. Every string is length-bounded (≤ 500 chars),
   arrays have max sizes, session ids must match `^[A-Za-z0-9-]{1,64}$`, times
   must be `HH:MM`. Invalid input is rejected before any logic runs.

**Response headers** on every response: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`,
`Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `Strict-Transport-Security`.

**Errors never leak internals.** Only deliberate `UserError` messages (e.g.
"Unknown day") reach clients. Everything else becomes a generic
"Internal error", and only the message (no request bodies, no IPs) is logged.

**No ReDoS risk.** No user input is ever compiled into a regular expression.
All regexes are fixed and linear.

## 3a. Metrics (`src/metrics/`)

- **Session id:** a random UUID returned as `Mcp-Session-Id` on `initialize` and read back
  on later requests, used only to group metrics. The server keeps no session state and never
  rejects a request because of this header. Values that aren't a UUID are ignored.
- **Nothing leaves the server.** Metrics are JSON lines on stdout, which Cloud Logging
  collects from the container. There is no analytics service, no API key and no outbound
  request, so there is nothing to leak and no third party to trust.
- **What is recorded:** tool names, outcomes, counts, durations, and track/day/talk values
  only when they match the public agenda (otherwise `unknown`). Also the MCP client's name
  and version, reduced to a safe character set and 60 characters.
- **Never recorded:** free text typed by the attendee (only its length or presence),
  IP addresses, user agents, auth headers, request bodies. Tests check this with a marker
  string. The forwarded-for chain is recorded as a _depth_ only (`xff_depth`), never as
  addresses.
- **No effect on responses:** the lines are written synchronously while the request is still
  running. This is deliberate: gen 2 functions run on Cloud Run, where the CPU is throttled
  as soon as the response is sent and there is no `waitUntil`, so background work can stall
  until an unrelated later request wakes the instance, or be lost entirely.
- **Limits:** at most 100 events per request, 25 params each, 100 characters per value, and
  the envelope's own field names (`type`, `ts`, `rid`, `session`, `session_tracked`,
  `name`) cannot be shadowed by an event's params.

## 4. Prompt-injection hygiene

Abstracts and bios are written by speakers, so they are third-party text that
flows into the attendee's LLM. The server instructions tell the client to treat
them as **data, never instructions**. Tools return them inside JSON fields, never
as instructions. The server has no tools capable of side effects, so even a
successful injection can't make it _do_ anything.

## 5. Calendar export

`.ics` output escapes `\ ; , newline` per RFC 5545, folds lines at 75 octets and
uses only CRLF, so a malicious title can't inject extra calendar properties
(tested).

## 6. Supply chain

- 4 runtime dependencies, all pinned to exact versions (`.npmrc save-exact`):
  `@modelcontextprotocol/sdk` (official), `zod`, `slug`, `firebase-functions` (official).
  A lockfile is committed and CI installs with `npm ci`.
- `npm audit --omit=dev`: **0 vulnerabilities** at the time of writing.
- CI runs lint, typecheck and tests on every PR that touches `functions/`, and again
  before the deploy (`.github/workflows/pull-request.yaml`, `.github/workflows/deploy.yaml`).
- **Not set up:** this repository has no Dependabot configuration, so dependency updates
  are manual. Adding an `npm` entry for `/functions` to `.github/dependabot.yml` would
  close that gap.

## 7. Deployment checklist (Firebase)

- [ ] Deploy only from `main`, through CI, and require PR review + green checks before
      merging. Hand deploys are a break-glass option.
- [ ] **`maxInstances` is the real ceiling.** There is no Vercel-Firewall equivalent here:
      the in-code limiter only sees its own instance, so the bound on a flood is
      `maxInstances` (10) times the per-instance limit, and the bound on spend is
      `maxInstances` itself. Raise the limit only together with it.
- [ ] **Verify `TRUSTED_PROXY_HOPS` after the first deploy.** Read `xff_depth` from Cloud
      Logging and set the variable so the rate-limit key is the caller's real address:
      too low is spoofable, too high rate-limits every caller as one. See "Known limitations".
- [ ] Keep `invoker: "public"` — the Hosting rewrite needs it — and keep the function's own
      `cors: false`, so `src/http/gate.ts` stays the only thing deciding origins.
- [ ] Optional: set `MCP_AUTH_TOKEN` (via Secret Manager, `firebase functions:secrets:set`)
      to restrict use to people you give the token to.
- [ ] Optional: set `ALLOWED_ORIGINS` only if a browser-based client must call the server.
- [ ] Never add secrets to the repo. The server needs none to run.

## 8. Configuration reference

| Variable                | Default        | Effect                                                     |
| ----------------------- | -------------- | ---------------------------------------------------------- |
| `MCP_AUTH_TOKEN`        | unset (public) | When set, requires `Authorization: Bearer <token>`         |
| `ALLOWED_ORIGINS`       | empty          | Comma-separated browser origins allowed to call `/mcp`     |
| `RATE_LIMIT_PER_MINUTE` | `60`           | Per-IP, per-instance request limit                         |
| `TRUSTED_PROXY_HOPS`    | `1`            | Trailing `X-Forwarded-For` entries added by our own hops   |
| `REVERSIM_OFFLINE`      | unset          | `1` = use only the bundled snapshot, never call Sessionize |
| `METRICS_LOG`           | on             | `off` = no JSON metric lines in the logs                   |

## 9. Known limitations / accepted risks

- **Public by default.** Anyone with the URL can query the (public) agenda. Set
  `MCP_AUTH_TOKEN` if that is not acceptable.
- **The in-memory rate limiter is per instance.** With `maxInstances: 10` the effective
  limit is up to 10× the configured one, and it resets whenever an instance is recycled.
  There is no platform rate-limit rule behind it; `maxInstances` is what bounds the damage.
- **The rate-limit key depends on `TRUSTED_PROXY_HOPS` being right.** Google's front end
  _appends_ to `X-Forwarded-For` instead of replacing it, so the leftmost entries are
  caller-supplied. The code counts in from the right to skip them, but the correct depth
  depends on how many proxies sit in front. The default (`1`) is for the Hosting rewrite;
  confirm it against `xff_depth` in Cloud Logging. If it is too low a caller can rotate the
  header to get a fresh budget; too high and every caller shares one bucket.
- **The 32 KB body limit rejects, it does not prevent buffering.** Cloud Functions reads the
  body before the handler runs, so a large request is already in memory (up to the
  platform's own 32 MB cap) by the time we return `413`.
- **Upstream trust.** If the Sessionize event itself were compromised, attackers could
  change agenda text (still schema-checked, size-limited and sanitised). They could
  not make the server do anything other than return that text.

## Reporting a vulnerability

Please report security issues privately to the repository owner (GitHub
**Security → Report a vulnerability**) rather than in a public issue.
