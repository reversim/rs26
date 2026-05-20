import type { SponsorTier } from "../types/sponsor";

// Sponsor tiers in display order, with the heading shown above each group.
export const sponsorTiers: { key: SponsorTier; label: string }[] = [
  { key: "organizing", label: "Organizing Sponsor" },
  { key: "game-changers", label: "Game Changers Sponsors" },
  { key: "community", label: "Community Sponsors" },
];
