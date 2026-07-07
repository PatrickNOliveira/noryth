/**
 * Design tokens — the single source of truth for the visual language.
 *
 * Structural tokens (spacing, radius, typography…) are theme-independent and
 * shared by every theme. Colors and shadows carry the mood and are refined
 * per-theme in `themes.ts`.
 *
 * Identity: a premium "digital campaign book" — parchment, aged leather,
 * worked bronze, candlelight, old libraries and cartography. Clean, never
 * caricato. Components must consume these through the styled-components theme;
 * no hard-coded values in component styles.
 */

export const spacing = {
  none: '0',
  xxs: '0.25rem', // 4px
  xs: '0.5rem', // 8px
  sm: '0.75rem', // 12px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  xxl: '3rem', // 48px
  xxxl: '4.5rem', // 72px
} as const;

export const radius = {
  none: '0',
  sm: '5px',
  md: '9px',
  lg: '14px',
  xl: '22px',
  pill: '999px',
} as const;

/** Warm, book-like shadow ladder. Overridden per-theme in `themes.ts`. */
export const shadow = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.30)',
  md: '0 8px 22px rgba(0, 0, 0, 0.34)',
  lg: '0 24px 60px rgba(0, 0, 0, 0.46)',
  /** Candlelit glow used sparingly on primary accents. */
  glow: '0 0 26px rgba(201, 162, 74, 0.28)',
} as const;

export const typography = {
  fontFamily: {
    /** Engraved display serif — wordmark and hero titles. */
    display: "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif",
    /** Elegant old-book serif — section headings, taglines, quotes. */
    heading: "'EB Garamond', 'Iowan Old Style', Georgia, serif",
    /** Clean modern sans — body, inputs, buttons, UI. */
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.625rem',
    xxl: '2.25rem',
    hero: '3rem',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.55,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.08em',
    /** Small-caps labels and the wordmark. */
    widest: '0.22em',
  },
} as const;

/** Mobile-first breakpoints. Primary device is the phone. */
export const breakpoints = {
  xs: '360px',
  sm: '390px',
  md: '430px',
  tablet: '768px',
  desktop: '1024px',
} as const;

export const opacity = {
  /** Disabled controls. */
  disabled: 0.45,
  /** De-emphasized text/icons. */
  muted: 0.65,
  /** Hover/pressed state layer over a color. */
  hover: 0.08,
  active: 0.14,
  /** Decorative overlays (map rings, watermarks). */
  faint: 0.35,
  /** Scrim behind modals/drawers. */
  scrim: 0.6,
} as const;

export const zIndex = {
  base: 0,
  sticky: 50,
  header: 100,
  dropdown: 400,
  overlay: 500,
  drawer: 900,
  modal: 1000,
  tooltip: 1200,
  toast: 1500,
} as const;

export const transitions = {
  fast: '130ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '220ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '380ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadow = typeof shadow;
export type Typography = typeof typography;
export type Breakpoints = typeof breakpoints;
export type Opacity = typeof opacity;
export type ZIndex = typeof zIndex;
export type Transitions = typeof transitions;
