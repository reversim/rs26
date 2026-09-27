// Single source of truth for Google Analytics: the measurement ID, every
// custom event name, the params each event carries, and the fixed values those
// params can take. Components and scripts import from here — no GA event or
// param string should appear anywhere else in the codebase.

export const GA_MEASUREMENT_ID = "G-0M38Y16RQ1";

export const AnalyticsEvent = {
  PageLoad: "page_load",
  ButtonClick: "button_click",
  FilterClick: "filter_click",
  NavClick: "nav_click",
  MemberSelect: "member_select",
  SessionSelect: "session_select",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

// Where a header navigation click came from.
export const NavLocation = {
  HeaderBar: "header_bar",
  Drawer: "drawer",
  Logo: "logo",
} as const;

// Which list a session was picked from.
export const SessionSource = {
  SessionsList: "sessions_list",
  SpeakerPage: "speaker_page",
} as const;

// Buttons that aren't the shared <Button> component get a stable id here.
export const ButtonId = {
  NavMenuToggle: "nav_menu_toggle",
  CarouselPrev: "carousel_prev",
  CarouselNext: "carousel_next",
} as const;

type ValueOf<T> = T[keyof T];

export interface AnalyticsEventParams {
  [AnalyticsEvent.PageLoad]: {
    page_path: string;
    page_title: string;
    load_time_ms?: number;
  };
  [AnalyticsEvent.ButtonClick]: {
    button_id?: ValueOf<typeof ButtonId>;
    button_text?: string;
    button_href?: string;
    button_variant?: string;
  };
  [AnalyticsEvent.FilterClick]: {
    filter_id: string;
    filter_value: string;
    filter_label: string;
  };
  [AnalyticsEvent.NavClick]: {
    nav_location: ValueOf<typeof NavLocation>;
    nav_label: string;
    nav_href: string;
  };
  [AnalyticsEvent.MemberSelect]: {
    member_name: string;
    member_slug: string;
    member_type: string;
  };
  [AnalyticsEvent.SessionSelect]: {
    session_title: string;
    session_href: string;
    session_source: ValueOf<typeof SessionSource>;
  };
}

// Declarative tracking: elements carry these attributes and one delegated
// click listener (helpers/analytics.ts) turns them into GA events.
export const ANALYTICS_EVENT_ATTR = "data-analytics-event";
export const ANALYTICS_PARAMS_ATTR = "data-analytics-params";

/**
 * Typed data-attributes to spread onto a clickable element:
 * `<a {...analyticsAttrs(AnalyticsEvent.NavClick, { ... })}>`.
 */
export function analyticsAttrs<E extends AnalyticsEventName>(
  event: E,
  params: AnalyticsEventParams[E],
): Record<string, string> {
  return {
    [ANALYTICS_EVENT_ATTR]: event,
    [ANALYTICS_PARAMS_ATTR]: JSON.stringify(params),
  };
}
