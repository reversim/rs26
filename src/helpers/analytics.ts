import {
  ANALYTICS_EVENT_ATTR,
  ANALYTICS_PARAMS_ATTR,
  AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsEventParams,
} from "../config/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GTAG_EVENT_COMMAND = "event";

function send(event: string, params: object): void {
  // gtag is only loaded in production builds; in dev, log so events can be
  // checked in the console without polluting the GA property.
  if (import.meta.env.DEV || !window.gtag) {
    console.debug("[analytics]", event, params);
    return;
  }
  window.gtag(GTAG_EVENT_COMMAND, event, params);
}

export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  params: AnalyticsEventParams[E],
): void {
  send(event, params);
}

function isAnalyticsEvent(value: string): value is AnalyticsEventName {
  return (Object.values(AnalyticsEvent) as string[]).includes(value);
}

// Fires for any element declared with analyticsAttrs(). Capture phase so it
// runs before handlers that stop propagation or navigate away.
function handleClick(e: MouseEvent): void {
  if (!(e.target instanceof Element)) return;
  const el = e.target.closest(`[${ANALYTICS_EVENT_ATTR}]`);
  const event = el?.getAttribute(ANALYTICS_EVENT_ATTR);
  if (!el || !event || !isAnalyticsEvent(event)) return;

  let params: object = {};
  try {
    params = JSON.parse(el.getAttribute(ANALYTICS_PARAMS_ATTR) ?? "{}");
  } catch {
    // Malformed params still record the event itself.
  }
  send(event, params);
}

function trackPageLoad(): void {
  const [nav] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  trackEvent(AnalyticsEvent.PageLoad, {
    page_path: window.location.pathname,
    page_title: document.title,
    load_time_ms: nav ? Math.round(nav.loadEventStart) : undefined,
  });
}

export function initAnalytics(): void {
  document.addEventListener("click", handleClick, { capture: true });

  if (document.readyState === "complete") trackPageLoad();
  else window.addEventListener("load", trackPageLoad, { once: true });
}
