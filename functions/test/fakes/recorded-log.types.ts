/** One structured log line, as `logMetric` writes it. */
export type LogLine = {
  type: string;
  ts: string;
  [field: string]: unknown;
};

/** A recording stand-in for stdout. */
export type RecordedLog = {
  /** The raw strings written, in order. */
  raw: () => string[];
  /** The parsed lines, optionally only those of one `type`. */
  lines: (type?: string) => LogLine[];
  /** Every line joined, for "this string must not appear anywhere" assertions. */
  text: () => string;
  clear: () => void;
  restore: () => void;
};
