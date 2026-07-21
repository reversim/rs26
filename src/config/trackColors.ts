// Color used for a track when it has no specific mapping below.
export const TRACK_COLOR_FALLBACK = "#6c8cc7";

// Maps a lowercased track/category name to its RS26 accent color.
// Aliases (e.g. "front" / "frontend") intentionally share a color.
export const trackColors: Record<string, string> = {
  frontend: "#84a2da",
  front: "#84a2da",
  backend: "#6c8cc7",
  back: "#6c8cc7",
  ai: "#f07a23",
  "artificial intelligence": "#f07a23",
  data: "#f07a23",
  mobile: "#6c8cc7",
  devops: "#7ccfa8",
  infra: "#7ccfa8",
  infrastructure: "#7ccfa8",
  security: "#f3a0c5",
  "ui/ux": "#f3a0c5",
  design: "#f3a0c5",
  culture: "#f3a0c5",
  ignites: "#7ccfa8",
  opening: "#c7d2ee",
  keynote: "#c7d2ee",
  registration: "#8fa0c8",
  dining: "transparent",
};

// Resolve a track name (any casing) to its color, falling back when unknown.
export function getTrackColor(track?: string | null): string {
  if (!track) return TRACK_COLOR_FALLBACK;
  return trackColors[track.toLowerCase()] ?? TRACK_COLOR_FALLBACK;
}
