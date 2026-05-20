// Color used for a track when it has no specific mapping below.
export const TRACK_COLOR_FALLBACK = "#506592";

// Maps a lowercased track/category name to its accent color.
// Aliases (e.g. "front" / "frontend") intentionally share a color.
export const trackColors: Record<string, string> = {
  frontend: "#fd6a82",
  front: "#fd6a82",
  backend: "#f78750",
  back: "#f78750",
  ai: "#81c47a",
  "artificial intelligence": "#81c47a",
  data: "#81c47a",
  mobile: "#506592",
  devops: "#9d4edd",
  security: "#e63946",
  "ui/ux": "#f72585",
  design: "#f72585",
  ignites: "#f7ab22",
  opening: "#7ebec8",
  keynote: "#7ebec8",
  registration: "#5065926e",
  dining: "transparent",
};

// Resolve a track name (any casing) to its color, falling back when unknown.
export function getTrackColor(track?: string | null): string {
  if (!track) return TRACK_COLOR_FALLBACK;
  return trackColors[track.toLowerCase()] ?? TRACK_COLOR_FALLBACK;
}
