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

// Returns the raw image modules so the carousel can emit a responsive srcset.
export function getPastEventsImages(): CarouselImage[] {
  return Object.entries(pastEventImageModules)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([path, mod]) => {
      const name = path
        .split("/")
        .pop()!
        .replace(/\.png$/, "");
      return {
        src: mod.default,
        alt: pastEventAltTexts[name] ?? `Past event - ${name}`,
      };
    });
}
