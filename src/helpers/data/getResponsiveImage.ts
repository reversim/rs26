import { getImage } from "astro:assets";

interface ResponsiveImageOptions {
  mobileWidth?: number;
  desktopWidth?: number;
}

// Optimizes one source image at two widths for a mobile/desktop swap.
// Returns the two processed images so a component can pick per breakpoint.
export async function getResponsiveImage(
  src: ImageMetadata,
  { mobileWidth = 1280, desktopWidth = 1920 }: ResponsiveImageOptions = {},
) {
  const [mobile, desktop] = await Promise.all([
    getImage({ src, width: mobileWidth }),
    getImage({ src, width: desktopWidth }),
  ]);

  return { mobile, desktop };
}
