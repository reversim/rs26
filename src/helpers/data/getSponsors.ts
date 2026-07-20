import slug from "slug";
import type {
  Sponsor,
  SponsorOpenPosition,
  SponsorTestimonial,
  SponsorTier,
} from "../../types/sponsor";

const teadsData = {
  id: "a3f9c2e1-4b7d-4c88-9f21-6e0a5d3b1c47",
  yearId: "206e7341-e20f-4ad8-9ca3-c03134165f7f",
  name: "teads",
  website: "https://teads.com",
  description:
    "Outbrain and Teads have merged to create an omnichannel outcomes platform for the open internet. The new company, operating under the name 'Teads', is embarking on a journey to elevate advertising outcomes.\n\nThe new Teads unites exceptional reach, an advanced omnichannel graph, data-driven creative, and predictive technology to drive meaningful outcomes from branding to performance.\nIt ensures value is driven by leveraging predictive AI technology to connect quality media, beautiful brand creative, and context-driven addressability and measurement.\n\nOne of the most scaled advertising platforms on the open internet, the new Teads is directly partnered with more than 10,000 publishers and 20,000 advertisers globally. For more information, visit https://thenewteads.com/.",
  logo: "https://summit2025.reversim.com/_astro/logo.ruecdkXb_ZszOXN.svg",
  carouselImages: [
    "https://summit2025.reversim.com/_astro/teads-1.CHckMCsS_1jmvBN.webp",
    "https://summit2025.reversim.com/_astro/teads-2.DKAeO5t5_Kwwq9.webp",
    "https://summit2025.reversim.com/_astro/teads-3.B7lXFdBN_1vPe3A.webp",
    "https://summit2025.reversim.com/_astro/teads-4.hmZw-37L_ZsueNB.webp",
    "https://summit2025.reversim.com/_astro/teads-5.BHXksA87_1jJBOS.webp",
    "https://summit2025.reversim.com/_astro/teads-1.CHckMCsS_1jmvBN.webp",
  ],
  linkedin:
    "https://www.linkedin.com/showcase/teadstechnology/about/?viewAsMember=true",
  bluesky: "",
  facebook: "",
  twitter: "",
  meetup: "",
  instagram: "",
  youtube: "https://www.youtube.com/channel/UCJLORR2uJglrKm-JlKV-rJA",
  github: "https://github.com/outbrain-inc",
  medium: "https://medium.com/outbrain-engineering",
  techStack: [
    "Java",
    "Python",
    "Scala",
    "Spark",
    "AWS",
    "Node.JS",
    "Typescript",
    "Kubernetes",
  ],
  positions: [
    {
      name: "DevOps Engineer for AI Platform",
      location: "Netanya",
      link: "https://job-boards.eu.greenhouse.io/teads1/jobs/4630600101",
    },
    {
      name: "Business Applications Team Lead",
      location: "Netanya",
      link: "https://job-boards.eu.greenhouse.io/teads1/jobs/4600454101",
    },
    {
      name: "Senior Backend and AI Engineer - Platform Engineering Team",
      location: "Netanya",
      link: "https://job-boards.eu.greenhouse.io/teads1/jobs/4599041101",
    },
    {
      name: "Senior Data Scientist in Ad Tech",
      location: "Netanya",
      link: "https://job-boards.eu.greenhouse.io/teads1/jobs/4589983101",
    },
  ],
  testimonials: [],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  tier: "organizing",
};

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
  "game-changer": "game-changers",
  "game-changers": "game-changers",
  community: "community",
};

export async function getSponsors(type?: SponsorTier): Promise<Sponsor[]> {
  const url = `${baseUrl}?yearId=${yearId}`;
  const response = await fetch(url);
  const fetchedData = (await response.json()) as BackOfficeSponsor[];

  const data = [...fetchedData, teadsData];

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
