// Single source of truth for paths that should redirect elsewhere rather
// than render. The page still builds normally (so the source stays intact
// for later), but Layout.astro swaps its output for a redirect whenever the
// current route matches an entry here. A bare path blocks it outright
// (redirecting to /404); give it a `to` instead to send visitors somewhere
// specific, e.g. a route that moved.
export interface Redirect {
  from: string;
  to: string;
}

export type RedirectRule = string | Redirect;

export const redirects: RedirectRule[] = [{from: "/agenda", to: "/sessions"}];

// "/agenda" also matches nested routes like "/agenda/day-1".
export function getRedirectTarget(pathname: string): string | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  const rule = redirects.find((entry) => {
    const from = typeof entry === "string" ? entry : entry.from;
    return path === from || path.startsWith(`${from}/`);
  });
  if (!rule) return undefined;
  return typeof rule === "string" ? "/404" : rule.to;
}
