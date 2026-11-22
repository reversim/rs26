// The machine-readable surface of the site: what an AI agent can discover,
// fetch and call. Keep this in step with firebase.json (the `/mcp` rewrite and
// the `Link` response headers) and with src/pages/mcp-guide.

export const SITE_URL = "https://summit2026.reversim.com";

/** The MCP server in `functions/`, rewritten onto this domain by firebase.json. */
export const MCP_ENDPOINT = `${SITE_URL}/mcp`;

export const ORG = {
  name: "Reversim",
  legalName: "Reversim Summit",
  description:
    "Reversim is a not-for-profit Israeli software community. It has been running " +
    "the community-driven, content-first Reversim Summit since 2013.",
  email: "rivka@reversim.com",
  repo: "https://github.com/reversim/rs26",
  // Only profiles we actually own and can point agents at; `sameAs` is an
  // identity claim, so an unverified guess does more harm than an omission.
  sameAs: [
    "https://www.reversim.com",
    "https://summit.reversim.com",
    "https://github.com/reversim",
  ],
} as const;

/**
 * Pages that get a markdown twin (`/about` -> `/about.md`) and a
 * `rel="alternate"` link. Session and speaker pages are generated per entry and
 * are not listed here.
 */
export const MARKDOWN_PAGES = [
  { path: "/", md: "/index.md", title: "Reversim Summit 2026" },
  { path: "/agenda", md: "/agenda.md", title: "Agenda" },
  { path: "/sessions", md: "/sessions.md", title: "Sessions" },
  { path: "/speakers", md: "/speakers.md", title: "Speakers" },
  { path: "/sponsors", md: "/sponsors.md", title: "Sponsors" },
  { path: "/about", md: "/about.md", title: "Team" },
  { path: "/coc", md: "/coc.md", title: "Code of conduct" },
  { path: "/mcp-guide", md: "/mcp-guide.md", title: "MCP guide" },
] as const;

/** The markdown twin of a page, or undefined when it has none. */
export function markdownTwin(pathname: string): string | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  const listed = MARKDOWN_PAGES.find((page) => page.path === path);
  if (listed) return listed.md;
  // Session and speaker detail pages each publish `<path>.md`.
  if (/^\/(session|speaker)\/[^/]+$/.test(path)) return `${path}.md`;
  return undefined;
}
