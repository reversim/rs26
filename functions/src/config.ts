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
 * How many X-Forwarded-For entries sit *after* the caller's own address, added by
 * infrastructure we control and so impossible for the caller to forge. Used to pick the
 * rate-limit key; see `clientIp` in `src/http/gate.ts`. Override with TRUSTED_PROXY_HOPS.
 *
 * Measured against the deployed server: a request through the Hosting rewrite that sends
 * no X-Forwarded-For of its own arrives with `xff_depth: 1`, i.e. the single entry *is*
 * the caller's address, appended by Google's front end. Nothing follows it, so this is 0.
 * Re-check `xff_depth` in Cloud Logging if the hops in front ever change.
 */
export const TRUSTED_PROXY_HOPS = 0;
