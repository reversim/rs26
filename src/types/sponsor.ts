export type SponsorTier = "organizing" | "game-changers" | "community";

export interface SponsorOpenPosition {
  position: string;
  location: string;
  positionLink: string;
}

export interface SponsorTestimonial {
  image: string;
  testimonialDescription: string;
  testimonialAuthor: string;
  position: string;
}

export interface Sponsor {
  sponsorTier: SponsorTier;
  companyName: string;
  description: string;
  website: string;
  companyNameLogo: string;
  carouselImages: string[];
  technologyStack: string[];
  openPositions: SponsorOpenPosition[];
  testimonials: SponsorTestimonial[];
  linkedin: string;
  bluesky: string;
  facebook: string;
  twitter: string;
  meetup: string;
  instagram: string;
  youtube: string;
  github: string;
  medium: string;
  image?: any;
  slug: string;
  openJobsLink?: string;
}
