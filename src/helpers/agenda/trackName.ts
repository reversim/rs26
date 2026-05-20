// Shared "Track" category lookup used by every track-name variant.
// Returns the session's Track category name (AI Apps / AI Infra normalized to
// "AI"), or null when the session has no Track category.
export function resolveTrack(session: any): string | null {
  const trackCategory = session?.categories?.find(
    (c: any) => c.name === "Track",
  );
  const item = trackCategory?.categoryItems?.[0];
  if (!item) return null;
  const raw = item.name;
  if (raw === "AI Apps" || raw === "AI Infra") return "AI";
  return raw;
}
