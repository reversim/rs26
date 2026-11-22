# rs26

Website for Reversim Summit 2026 RS26

| Directory    | What it is                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| `src/`       | The Astro site, deployed to Firebase Hosting                                                              |
| `functions/` | The MCP server, deployed as a Cloud Function and served at `/mcp` — see its [README](functions/README.md) |

The two are independent packages: the site uses yarn, prettier and `astro check`, the
function uses npm, oxlint and oxfmt, and neither imports from the other.
