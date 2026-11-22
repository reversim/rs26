/** A value we may write to the log. */
export type ParamValue = string | number | boolean;

/** Event params or log fields; undefined entries are dropped. */
export type Params = Record<string, ParamValue | undefined>;

/** An event recorded during the current request, with cleaned params. */
export type AnalyticsEvent = {
  name: string;
  params: Record<string, string | number>;
};

/** Everything metrics collect while one HTTP request runs. */
export type RequestContext = {
  requestId: string;
  /** Conversation id (Mcp-Session-Id). Random per request when the client did not send one. */
  sessionId: string;
  /** True when the id came from the client's Mcp-Session-Id header or was issued on initialize. */
  sessionTracked: boolean;
  events: AnalyticsEvent[];
  /** Extra fields for this request's health log line. */
  log: Record<string, ParamValue>;
};
