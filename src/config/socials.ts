// Canonical identifiers for the social platforms we link to.
// The matching `SocialPlatform` type lives in src/types/social.ts.
export const supportedSocials = {
  linkedin: "linkedin",
  x: "x",
  bluesky: "bluesky",
  facebook: "facebook",
  github: "github",
  instagram: "instagram",
  website: "website",
  medium: "medium",
  youtube: "youtube",
} as const;

// Every type string socialLink.astro can render an icon for, including
// aliases coming from external data (twitter≈x, company_website≈website).
export const renderableSocialTypes = [
  "linkedin",
  "twitter",
  "x",
  "bluesky",
  "facebook",
  "github",
  "instagram",
  "website",
  "company_website",
  "medium",
  "youtube",
  "sessionize",
] as const;

export type RenderableSocialType = (typeof renderableSocialTypes)[number];
