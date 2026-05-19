import { getImage } from "astro:assets";
import type { CarouselImage } from "../../types/slider";

const pastEventAltTexts: Record<string, string> = {
  "image-1": "image of the conference people",
  "image-2": "two people taking picture on the main stage",
  "image-3": "people sitting hearing a speaker",
  "image-4": "volunteers passing out shirts",
  "image-5": "close up of a bag",
};

const pastEventImageModules = import.meta.glob<{ default: ImageMetadata }>(
  "../../assets/past-events/*.png",
  { eager: true },
);

export async function getPastEventsImages(): Promise<CarouselImage[]> {
  const images: CarouselImage[] = await Promise.all(
    Object.entries(pastEventImageModules)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(async ([path, mod]) => {
        const processed = await getImage({
          src: mod.default,
          width: 1000,
          height: 600,
        });
        return {
          src: processed.src,
          alt: pastEventAltTexts[path] ?? `Past event - ${path}`,
        };
      }),
  );

  return images;
}
