# AGENTS.md

Instructions for AI coding agents working in this repository.

This repo holds two things:

- **the website** for [Reversim Summit 2026](https://summit2026.reversim.com) — an Astro
  static site in `src/`, deployed to Firebase Hosting from `dist/`;
- **the conference MCP server** in `functions/` — a stateless Firebase Cloud Function
  (gen 2) served from the site's own domain at `https://summit2026.reversim.com/mcp`.

If you are an agent helping an **attendee** (not editing this code), do not scrape the
site: read <https://summit2026.reversim.com/llms.txt> and call the MCP server. See
[`/agents.md`](https://summit2026.reversim.com/agents.md).

## Commands

```sh
npm run dev          # astro dev --host
npm run build        # astro build (fetches live Sessionize + back-office data)
npm run astro-check  # types and Astro diagnostics
npm run lint         # prettier --check .
npm run lint:fix     # prettier --write .
npm test             # vitest run (unit + browser e2e)
```

The MCP server has its own package: `cd functions && npm test`. See
[`functions/CLAUDE.md`](functions/CLAUDE.md) for its conventions.

## Conventions

- **TypeScript**: no `as unknown as T` double casts. Widen the type or drop an
  over-strict annotation instead.
- **Styles**: each component owns its own CSS. Avoid reaching into a child with
  `:global()` — give the child a variant or a prop instead.
- **Config over constants**: headline content lives in `src/config/` (`event.ts`,
  `venue.ts`, `coc.ts`, `mcpTools.ts`, `agentResources.ts`). If a page and a generated
  document both need a string, it belongs in config, not in both files.
- **Prettier** formats everything, including `.astro`. Run `npm run lint:fix` before
  committing.
- **Deployment** is the CI workflow's job. Never run `firebase deploy` by hand.

## Things that will bite you

- **Trailing slashes**: canonical URLs have no trailing slash, but `/page/` must keep
  serving the page. The site used to 301 `/page` → `/page/`, browsers cached it
  forever, and redirecting back loops. See the comment in `astro.config.mjs`.
- **`firebase.json` `ignore`**: must not contain the Firebase default `**/.*`, or
  `dist/.well-known/` — the agent discovery documents — silently stops deploying.
- **Sessionize times** are venue-local wall time with no offset
  (`2026-11-30T09:00:00`). Israel is UTC+2 during the summit; `helpers/agents/schema.ts`
  and the JSONL feed append the offset explicitly. Do not round-trip them through UTC.
- **Build-time data** comes from live APIs (Sessionize, the back office). A build with
  no network will fail, not fall back.

## The agent-facing surface

When you change the agenda data shape, these are generated from it and should keep
working — `npm run build` then check `dist/`:

| Path                                                    | Built by                                        |
| ------------------------------------------------------- | ----------------------------------------------- |
| `/llms.txt`, `/<section>/llms.txt`                      | `src/helpers/agents/llms.ts`                    |
| `/index.md` and every `<page>.md` twin                  | `src/helpers/agents/markdown.ts`                |
| `/agents.md`, `/auth.md`                                | `src/helpers/agents/llms.ts`                    |
| `/.well-known/ard.json`, `/.well-known/ai-catalog.json` | `src/helpers/agents/discovery.ts`               |
| `/.well-known/mcp/server-card.json`                     | `src/helpers/agents/discovery.ts`               |
| `/.well-known/agent-skills/index.json`                  | `src/helpers/agents/discovery.ts`               |
| `/skills/*/SKILL.md`                                    | the repo's `skills/` files, served verbatim     |
| `/feeds/sessions.jsonl`, `/schemamap.xml`               | `src/pages/feeds`, `src/pages/schemamap.xml.ts` |
| JSON-LD in every page head                              | `src/helpers/agents/schema.ts`                  |

The MCP tool list in `src/config/mcpTools.ts` is a summary for humans and discovery
documents; the authoritative schemas are the `registerTool` calls in
`functions/src/tools/`. Keep the two in step.

## Repo-root manifests

These describe the MCP server to the outside world. They are not used by the build:

- `plugin.json` + `mcp.json` — this repo as an [Agent Plugin](https://agent-plugins.org),
  bundling the server and the `skills/`. (`.mcp.json`, with a leading dot, is unrelated:
  it is the local Claude Code project config.)
- `server.json` — the manifest for publishing to the official MCP Registry.
- `skills/*/SKILL.md` — the published skills, served by the site at
  `/skills/<name>/SKILL.md`. Edit them here, not in `src/`.
