// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  prefetch: true,
  site: "https://summit2026.reversim.com",

  image: {
    // Authorize the back office asset host so remote sponsor/team images are
    // downloaded and optimized at build time instead of hotlinked.
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
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
        weights: ["400", "500", "700"],
        styles: ["normal"],
        display: "swap",
      },
    ],
  },
  integrations: [
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
    sitemap(),
  ],
});
