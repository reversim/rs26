// Single source of truth for the event's headline content.
// Update these once per year instead of hunting through components.
export const event = {
  name: "Reversim Summit 2026",
  shortName: "RS26",
  year: 2026,

  // Shown in the hero. Kept as separate words because each is styled/colored.
  title: {
    line1: "REVERSIM",
    line2: "SUMMIT",
    year: "2026",
  },

  // Hero date line, e.g. "30.11-1.12, 2026"
  dates: "30.11-1.12, 2026",

  // Short hero lede shown under the title (full intro lives in `description`).
  lede:
    "Two content-first days for the people who build software in Israel — " +
    "developers, product managers, data scientists and the whole community.",

  // Small mono meta line in the hero (kept factual / data-driven).
  heroMeta: "Two full days · Expo Tel Aviv",

  // Intro paragraph under the hero.
  description:
    "Reversim Summit 2026 (RS26) is a community driven event in Israel for " +
    "software developers, product managers, data scientists and everyone else " +
    "in the software industry. With an enthusiastic team of volunteers we've " +
    "been creating a content-first software conferences since 2013 and " +
    "successfully leading the market. Reversim Summit (RS) is not for profit " +
    "and its sole purpose is to enrich the community with content and " +
    "networking. We are grateful to have such an excellent top of the " +
    "industry team of volunteer moderators and event organizers.",

  // Hero call-to-action. Set `url` to the CFP submission link when ready.
  cfp: {
    label: "CFP Is Open!",
    url: "https://sessionize.com/reversim-summit-2026/",
  },
  sponsor: {
    label: "Be A Sponsor!",
    url: "/sponsors",
  },
} as const;
