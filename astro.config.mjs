// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: "https://summit2026.reversim.com",

  // Emit `about.html` rather than `about/index.html` so Firebase's cleanUrls
  // serves `/about` directly, without a 301 to `/about/`.
  build: { format: "file" },
  trailingSlash: "never",

  image: {
    // Authorize the back office and Sessionize asset hosts so remote
    // sponsor/team/speaker images are downloaded and optimized at build time
    // instead of hotlinked.
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "cdn.sessionize.com" },
    ],
  },

  experimental: {
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
  },
  integrations: [
    // The speaker kit is shared with speakers directly and kept out of search.
    sitemap({ filter: (page) => !page.includes("/speaker-kit") }),
  ],
});
