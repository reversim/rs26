import slug from "slug";
import type {
  Sponsor,
  SponsorOpenPosition,
  SponsorTestimonial,
  SponsorTier,
} from "../../types/sponsor";

// Shape returned by the reversim back office API.
interface BackOfficeSponsor {
  id: string;
  name: string;
  website: string;
  description: string;
  logo: string;
  carouselImages: string[];
  linkedin: string;
  bluesky: string;
  facebook: string;
  twitter: string;
  meetup: string;
  instagram: string;
  youtube: string;
  github: string;
  medium: string;
  techStack: string[];
  positions: { name: string; location: string; link: string }[];
  testimonials: {
    image: string;
    testimonial: string;
    authorName: string;
    title: string;
  }[];
  tier: string;
}

const baseUrl = "https://rs-backoffice.vercel.app/api/public/sponsors";
const yearId = "206e7341-e20f-4ad8-9ca3-c03134165f7f";

// The back office uses "game-changer" (singular); the site uses "game-changers".
const tierMap: Record<string, SponsorTier> = {
  organizing: "organizing",
  organizer: "organizing",
  "game-changer": "game-changers",
  "game-changers": "game-changers",
  community: "community",
};

export async function getSponsors(type?: SponsorTier): Promise<Sponsor[]> {
  const url = `${baseUrl}?yearId=${yearId}`;
  const response = await fetch(url);
  const data = (await response.json()) as BackOfficeSponsor[];

  return (
    data
      .map((sponsor): Sponsor => {
        const openPositions: SponsorOpenPosition[] = (
          sponsor.positions ?? []
        ).map((position) => ({
          position: position.name,
          location: position.location,
          positionLink: position.link,
        }));

        const testimonials: SponsorTestimonial[] = (sponsor.testimonials ?? [])
          .filter((testimonial) => testimonial.testimonial)
          .map((testimonial) => ({
            image: testimonial.image,
            testimonialDescription: testimonial.testimonial,
            testimonialAuthor: testimonial.authorName,
            position: testimonial.title,
          }));

        return {
          sponsorTier: tierMap[sponsor.tier] ?? "community",
          companyName: sponsor.name,
          description: sponsor.description,
          website: sponsor.website,
          companyNameLogo: sponsor.logo,
          carouselImages: sponsor.carouselImages ?? [],
          technologyStack: sponsor.techStack ?? [],
          openPositions,
          testimonials,
          linkedin: sponsor.linkedin,
          bluesky: sponsor.bluesky,
          facebook: sponsor.facebook,
          twitter: sponsor.twitter,
          meetup: sponsor.meetup,
          instagram: sponsor.instagram,
          youtube: sponsor.youtube,
          github: sponsor.github,
          medium: sponsor.medium,
          openJobsLink: sponsor.website,
          slug: slug(sponsor.name),
        };
      })
      // Skip sponsors that have not been filled in yet (no logo uploaded).
      .filter((sponsor) => {
        if (!sponsor.companyNameLogo) return false;
        return type ? sponsor.sponsorTier === type : true;
      })
  );
}
