import type { APIRoute } from "astro";
import { getSponsors } from "../helpers/data/getSponsors";
import { markdown, sponsorsMarkdown } from "../helpers/agents/markdown";

export const GET: APIRoute = async () => {
  const sponsors = await getSponsors();

  return markdown(
    sponsorsMarkdown(
      sponsors.map((sponsor) => ({
        name: sponsor.companyName,
        tier: sponsor.sponsorTier,
        website: sponsor.website,
      })),
    ),
  );
};
