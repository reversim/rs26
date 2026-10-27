import type { Category } from "../../types";

// Shared "Track" category lookup used by every track-name variant.
// Returns the session's Track category name (AI Apps / AI Infra normalized to
// "AI"), or null when the session has no Track category.
export function resolveTrack(session: {categories?: Category[]}): string | null {
  const trackCategory = session?.categories?.find(c => c.name === "Track");
  const item = trackCategory?.categoryItems?.[0];
  if (!item) return null;
  const raw = item.name;
  if (raw === "Frontend") return "Frontend/Product"
  return raw;
}
