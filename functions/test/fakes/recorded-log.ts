import type { LogLine, RecordedLog } from "./recorded-log.types.js";

/**
 * Records the JSON lines the server would write to stdout.
 *
 * Metrics are the one part of the server whose whole job is to leave the process, so tests
 * replace that edge with this fake rather than reaching inside the metrics code: whatever
 * Cloud Logging would receive is exactly what `lines()` returns.
 */
export function recordLog(): RecordedLog {
  const written: string[] = [];
  const real = console.log;
  console.log = (line: unknown) => void written.push(String(line));

  return {
    raw: () => [...written],
    lines: (type?: string) => {
      const parsed = written.map((line) => JSON.parse(line) as LogLine);

      return type ? parsed.filter((line) => line.type === type) : parsed;
    },
    text: () => written.join("\n"),
    clear: () => void written.splice(0, written.length),
    restore: () => {
      console.log = real;
    },
  };
}
