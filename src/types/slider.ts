import type { ImageMetadata } from "astro";

export interface CarouselImage {
  src: ImageMetadata;
  alt: string;
}

export interface CarouselVideo {
  url: string;
}
