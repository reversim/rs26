// With `build.format: "file"`, Astro.url.pathname carries the output file's
// ".html" at build time (e.g. "/sessions.html"), while Firebase's cleanUrls
// serves the page at "/sessions". Normalize to that public URL.
export function publicPathname(pathname: string): string {
  return pathname.replace(/(\/index)?\.html$/, "").replace(/\/+$/, "") || "/";
}
