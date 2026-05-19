import slug from "slug";
import sponsorsJson from "../../data/sponsorsData.json";
import type { Sponsor, SponsorTier } from "../../types/sponsor";

export async function getSponsors(type?: SponsorTier) {
  const sponsorsData = sponsorsJson.sponsors;
  const filtered = type
    ? sponsorsData.filter((sponsor) => sponsor.sponsorTier === type)
    : sponsorsData;

  return filtered.map((sponsor) => {
    const sponsorSlug = slug(sponsor.companyName);

    const testimonials = (sponsor.testimonials as Sponsor["testimonials"]).map(
      (testimonial) => ({
        ...testimonial,
        image: import(
          `../../assets/sponsors/${sponsorSlug}/${testimonial.image}.png`
        ),
      }),
    );

    const carouselImages = sponsor.carouselImages?.map((image) => {
      return import(`../../assets/sponsors/${sponsorSlug}/${image}.png`);
    });

    const images = import.meta.glob<{ default: ImageMetadata }>(
      "../../assets/sponsors/*/logo.{jpeg,jpg,png,gif,svg}",
    );

    const currentImage =
      images[`../../assets/sponsors/${sponsorSlug}/logo.svg`] ||
      images[`../../assets/sponsors/${sponsorSlug}/logo.png`];

    return {
      ...sponsor,
      slug: sponsorSlug,
      companyNameLogo: currentImage(),
      testimonials,
      carouselImages,
    };
  });
}
