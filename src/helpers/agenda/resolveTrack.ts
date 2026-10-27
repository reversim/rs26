import type { Category } from "../../types";
import { TrackName } from "../../types/trackName";

// Shared "Track" category lookup used by every track-name variant.
// Returns the session's normalized track name, or null when the session has no Track category.
export function resolveTrack(session: {categories?: Category[]}): TrackName | null {
  const trackCategory = session?.categories?.find(c => c.name === "Track");
  const item = trackCategory?.categoryItems?.[0];
  if (!item) return null;
  const raw = item.name;
  if (raw === "Frontend") {
    return "Frontend/Product"
  }

  if (raw === 'Ignites' || raw === 'Backend' ||  raw === 'Infra' ||  raw === 'Craft' ||  raw === 'Culture' ||  raw === 'AI/ML') {
    return raw
  }

  throw new Error(`Unrecognized track name: "${raw}"`)
}
