// Splide exposes its stylesheet through a bare package export
// ("@splidejs/splide/css"), which Astro's `*.css` module typing doesn't
// match; TypeScript 6 type-checks side-effect imports by default.
declare module "@splidejs/splide/css";
