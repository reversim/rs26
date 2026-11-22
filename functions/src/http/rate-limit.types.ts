/** Hits counted for one key in the current window. */
export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/** The verdict for one hit, with the numbers for the RateLimit-* headers. */
export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};
