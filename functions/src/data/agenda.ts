import { CACHE_TTL_MS, FEEDS, FETCH_TIMEOUT_MS, MAX_FEED_BYTES } from "../config.js";
import { logMetric } from "../metrics/health-log.js";
import type { Agenda, CachedAgenda, FeedName, RawFeeds } from "./agenda.types.js";
import { buildAgenda } from "./normalize.js";
import { SNAPSHOT } from "./snapshot.js";
import { validateFeeds } from "./validate.js";

let cached: CachedAgenda | undefined;
let snapshotAgenda: Agenda | undefined;
let inflight: Promise<Agenda> | undefined;

/**
 * The server's only outbound request. The URL comes from
 * the FEEDS constant; no client input ever reaches a URL, so there is no SSRF surface.
 */
async function fetchJson(feed: FeedName): Promise<unknown> {
  const response = await fetch(FEEDS[feed], {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: "application/json" },
    redirect: "error", // never follow a redirect to another host
    credentials: "omit",
  });
  if (!response.ok) {
    throw new Error(`upstream responded ${response.status}`);
  }

  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("upstream returned non-JSON content");
  }

  const declaredBytes = Number(response.headers.get("content-length") ?? 0);
  if (declaredBytes > MAX_FEED_BYTES) {
    throw new Error("upstream payload too large");
  }

  const body = await readCapped({ response, maxBytes: MAX_FEED_BYTES });

  return JSON.parse(body);
}

async function readCapped({ response, maxBytes }: { response: Response; maxBytes: number }): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("upstream payload too large");
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

/** Fetch both Sessionize feeds. Exported for the snapshot script. */
export async function fetchFeeds(): Promise<RawFeeds> {
  const [grid, speakers] = await Promise.all([fetchJson("grid"), fetchJson("speakers")]);

  // Allowlist validation: unknown fields are dropped, malformed data is rejected.
  return validateFeeds({ grid, speakers });
}

export function getSnapshotAgenda(): Agenda {
  snapshotAgenda ??= buildAgenda({
    feeds: validateFeeds(SNAPSHOT.feeds),
    source: "snapshot",
    fetchedAt: SNAPSHOT.fetchedAt,
  });

  return snapshotAgenda;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

async function fetchLiveAgenda(): Promise<Agenda> {
  const started = performance.now();
  try {
    const feeds = await fetchFeeds();
    const agenda = buildAgenda({ feeds, source: "live", fetchedAt: new Date().toISOString() });
    cached = { agenda, expiresAt: Date.now() + CACHE_TTL_MS };
    logMetric({
      type: "agenda_fetch",
      fields: { outcome: "ok", duration_ms: Math.round(performance.now() - started) },
    });

    return agenda;
  } catch (error) {
    logMetric({
      type: "agenda_fetch",
      fields: {
        outcome: "fallback",
        fallback: cached ? "last_live" : "snapshot",
        duration_ms: Math.round(performance.now() - started),
        error: errorMessage(error).slice(0, 200),
      },
    });
    console.error(`[reversim-mcp] live fetch failed, using snapshot: ${errorMessage(error)}`);
    // Keep serving the last good live copy if we have one, otherwise the snapshot.
    const fallback = cached?.agenda ?? getSnapshotAgenda();
    // Retry live again in a minute rather than on every request.
    cached = { agenda: fallback, expiresAt: Date.now() + 60_000 };

    return fallback;
  } finally {
    inflight = undefined;
  }
}

/**
 * Returns the agenda: live Sessionize data (cached for CACHE_TTL_MS), falling back
 * to the bundled snapshot if Sessionize is slow or unreachable.
 * Set REVERSIM_OFFLINE=1 to always use the snapshot.
 */
export async function getAgenda(): Promise<Agenda> {
  if (process.env.REVERSIM_OFFLINE === "1") {
    return getSnapshotAgenda();
  }

  if (cached && cached.expiresAt > Date.now()) {
    return cached.agenda;
  }

  inflight ??= fetchLiveAgenda();

  return inflight;
}
