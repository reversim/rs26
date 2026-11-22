import { defineConfig } from "vitest/config";

// The venue's timezone, which the agenda's times are written in. Tests that reason
// about "now" at the conference depend on it.
process.env.TZ = "Asia/Jerusalem";

export default defineConfig({
  test: {
    // Plain Node tests: the repo root runs Vitest in Playwright browser mode for the
    // Astro site, which cannot host an HTTP server test.
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Tests never hit the network: they run against the bundled snapshot. Metrics are
    // off by default so only the tests that assert on them turn the log back on.
    env: { REVERSIM_OFFLINE: "1", METRICS_LOG: "off" },
  },
});
