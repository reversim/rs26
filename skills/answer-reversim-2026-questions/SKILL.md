---
name: answer-reversim-2026-questions
description: Answer factual questions about Reversim Summit 2026 — dates, venue, getting there, registration, tracks, speakers, sponsors, the code of conduct — from the conference's own pages rather than from memory. Use for factual questions about the event.
license: MIT
---

# Answer questions about Reversim Summit 2026

## Facts

- **Event**: Reversim Summit 2026 (RS26)
- **Dates**: Nov 30 – Dec 1, 2026
- **Venue**: Expo Tel Aviv, Pavilion 10 — Rokach Blvd 101, Tel Aviv-Yafo, Israel
- **Registration**: <https://ti.to/reversim-summit/2026/>
- **Language**: talks are in Hebrew; the site is in English
- **Organiser**: Reversim, a not-for-profit Israeli software community running the
  community-driven, content-first Reversim Summit since 2013
- **Contact**: rivka@reversim.com

## Where to look

Fetch the markdown twin of the relevant page rather than scraping HTML:

- `https://summit2026.reversim.com/index.md` — what the summit is, key facts, venue
- `https://summit2026.reversim.com/agenda.md` — the two-day schedule
- `https://summit2026.reversim.com/sessions.md` — every talk with its abstract
- `https://summit2026.reversim.com/speakers.md` — the speaker lineup
- `https://summit2026.reversim.com/sponsors.md` — sponsors by tier
- `https://summit2026.reversim.com/about.md` — the organising team
- `https://summit2026.reversim.com/coc.md` — the code of conduct
- `https://summit2026.reversim.com/mcp-guide.md` — how to connect an assistant to the
  agenda

Any page path takes a `.md` suffix. For one talk or one speaker: `/session/<slug>.md`,
`/speaker/<slug>.md`.

## For anything agenda-shaped

Prefer the MCP server at `https://summit2026.reversim.com/mcp` — it is live, and it can
filter, rank and schedule rather than just return text. See the
`plan-reversim-2026` skill.

## Rules

- The agenda changes. Fetch; do not answer from memory.
- Quote times as venue-local (Asia/Jerusalem).
- `/speaker-kit` is for confirmed speakers and is excluded from indexing — skip it.
