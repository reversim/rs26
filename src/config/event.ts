// Single source of truth for the event's headline content.
// Update these once per year instead of hunting through components.
export const event = {
  name: "Reversim Summit 2026",
  shortName: "RS26",
  year: 2026,

  // Shown in the hero. Kept as separate words because each is styled/colored.
  title: {
    line1: "Reversim",
    line2: "Winter",
    line3: "Summit",
  },

  // Human date line, e.g. header pill (uppercased via CSS) and hero meta row.
  dates: "Nov 30 – Dec 1, 2026",

  hero: {
    lede:
      "Two days of deep engineering as Israel's dev community wires up the " +
      "next generation of autonomous, agentic systems — one node at a time.",
    hint: "drag the nodes · they don't bite",
  },

  // Homepage about section: big display lede + supporting paragraphs.
  aboutLede:
    "A community-driven summit for the people who build software in Israel.",
  aboutBody: [
    "Reversim Winter Summit is a two-day, content-first conference for " +
      "software developers, product managers, data scientists and everyone " +
      "else in the industry. We've been running it since 2013 — and this is " +
      "the agentic edition.",
    "Reversim is not-for-profit. Its sole purpose is to enrich the community " +
      "with great content and real networking, organised by a volunteer team " +
      "drawn from the top of the industry.",
  ],

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
    display: false,
    label: "CFP is open →",
    url: "https://sessionize.com/reversim-summit-2026/",
  },
  sponsor: {
    label: "Become a sponsor",
    url: "/sponsors",
  },
} as const;
