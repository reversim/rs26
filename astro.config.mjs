// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Prefetch every internal link: on hover for desktop, and nav links opt into
  // "viewport" (see headerLink/navDrawer) so touch devices benefit too.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  site: "https://summit2026.reversim.com",

  // Canonical URLs have no trailing slash (e.g. `/about`). Pages are still
  // built as `about/index.html`: the site used to 301 `/about` -> `/about/`,
  // browsers cache that indefinitely, so `/about/` must keep serving the page
  // (never redirect it to `/about`, which loops for returning visitors).
  // Firebase serves both forms as 200; Layout.astro sets the canonical URL
  // and tidies the address bar.
  trailingSlash: "never",
  // Astro 7 defaults to JSX-style whitespace stripping, which can glue inline
  // elements together; keep the pre-7 behavior our templates were written for.
  compressHTML: true,

  image: {
    // Authorize the back office and Sessionize asset hosts so remote
    // sponsor/team/speaker images are downloaded and optimized at build time
    // instead of hotlinked.
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "cdn.sessionize.com" },
    ],
    // Some sponsor logos in the back office are SVGs; keep rasterizing them
    // to AVIF/WebP like Astro 5 did. Sources are our own trusted assets.
    dangerouslyProcessSVG: true,
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: "Space Grotesk",
      cssVariable: "--font-space-grotesk",
      weights: ["400", "500", "600", "700"],
      styles: ["normal"],
      display: "swap",
    },
    {
      provider: fontProviders.google(),
      name: "Hanken Grotesk",
      cssVariable: "--font-hanken-grotesk",
      weights: ["400", "500", "600", "700", "800"],
      styles: ["normal"],
      display: "swap",
    },
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      weights: ["400", "500", "600", "700"],
      styles: ["normal"],
      display: "swap",
    },
  ],
  integrations: [
    // The speaker kit is shared with speakers directly and kept out of search.
    sitemap({ filter: (page) => !page.includes("/speaker-kit") }),
  ],
});
