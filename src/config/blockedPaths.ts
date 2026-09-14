// Single source of truth for paths that should not be publicly visible yet.
// The page still builds normally (so the source stays intact for later),
// but Layout.astro swaps its output for a redirect to /404 whenever the
// current route matches an entry here. Add a path and it's blocked; remove
// it and the real page is live again.
export const blockedPaths: string[] = ["/agenda"];

// "/agenda" also blocks nested routes like "/agenda/day-1".
export function isBlockedPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return blockedPaths.some(
    (blocked) => path === blocked || path.startsWith(`${blocked}/`),
  );
}
