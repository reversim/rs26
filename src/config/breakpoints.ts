// Responsive breakpoints in pixels.
// These MUST stay in sync with the SCSS `$breakpoint-*` variables in
// src/styles/_variables.scss (SCSS can't read TS, so we mirror by hand).
export const breakpoints = {
  small: 576,
  medium: 768,
  large: 992,
  xLarge: 1200,
} as const;

export type BreakpointName = keyof typeof breakpoints;

// Width below which the layout drops its fixed "machine" frame and goes fluid.
// Matches --max-container-width in _variables.scss.
export const MIN_MACHINE_WIDTH = 1000;
