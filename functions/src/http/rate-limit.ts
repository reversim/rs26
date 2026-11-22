import type { RateLimitEntry, RateLimitResult } from "./rate-limit.types.js";

/** Bound memory: never track more than this many keys. */
const MAX_KEYS = 10_000;

/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 *
 * On serverless platforms each warm instance has its own memory, so this is a
 * best-effort first line of defence. The authoritative limit should be a
 * cap on the function itself (see SECURITY.md → “Rate limiting”).
 */
export class RateLimiter {
  private readonly hits = new Map<string, RateLimitEntry>();
  readonly limit: number;
  readonly windowMs: number;

  constructor({ limit, windowMs }: { limit: number; windowMs: number }) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** Counts one hit for `key` and says whether it is still within the limit. */
  hit({ key, now = Date.now() }: { key: string; now?: number }): RateLimitResult {
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size >= MAX_KEYS) {
        this.sweep(now);
      }

      entry = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, entry);
    }

    entry.count++;

    return {
      allowed: entry.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - entry.count),
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) {
        this.hits.delete(key);
      }
    }

    // Still full (e.g. distributed flood): drop the oldest entries.
    if (this.hits.size >= MAX_KEYS) {
      const excess = this.hits.size - MAX_KEYS + 1000;
      let dropped = 0;
      for (const key of this.hits.keys()) {
        if (dropped++ >= excess) {
          break;
        }

        this.hits.delete(key);
      }
    }
  }
}
