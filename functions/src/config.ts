export const CONFERENCE = {
  name: "Reversim Summit 2026",
  shortName: "RS26",
  dates: "Nov 30 – Dec 1, 2026",
  website: "https://summit2026.reversim.com",
  registrationUrl: "https://ti.to/reversim-summit/2026/",
  timezone: "Asia/Jerusalem",
  language: "All sessions are conducted in Hebrew",
} as const;

const SESSIONIZE_EVENT = "1saptwag";
export const FEEDS = {
  grid: `https://sessionize.com/api/v2/${SESSIONIZE_EVENT}/view/GridSmart`,
  speakers: `https://sessionize.com/api/v2/${SESSIONIZE_EVENT}/view/Speakers`,
} as const;

/** How long live data is reused before re-fetching. */
export const CACHE_TTL_MS = 10 * 60 * 1000;
/** Per-request timeout for the live feeds; on timeout we serve the snapshot. */
export const FETCH_TIMEOUT_MS = 4000;
/** Hard cap on each upstream feed (current feeds are ~100–250 KB). */
export const MAX_FEED_BYTES = 3 * 1024 * 1024;

/**
 * How many trailing X-Forwarded-For entries were added by infrastructure we control, and so
 * cannot be forged by the caller. Used to pick the rate-limit key; see `clientIp` in
 * `src/http/gate.ts`. Override with TRUSTED_PROXY_HOPS once the real chain is known.
 */
export const TRUSTED_PROXY_HOPS = 1;
