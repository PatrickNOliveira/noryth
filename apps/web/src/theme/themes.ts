import {
  breakpoints,
  opacity,
  radius,
  shadow,
  spacing,
  transitions,
  typography,
  zIndex,
} from './tokens';

/**
 * Semantic color palette. Both themes implement the exact same keys so any
 * component styled against `theme.colors.X` works in light and dark.
 *
 * Dark = grimoire / obsidian / dark wood / aged bronze / candlelight.
 * Light = parchment / aged paper / light wood / leather / bronze / dark ink.
 */
export interface ThemeColors {
  /** App background — deepest layer (never absolute black). */
  background: string;
  /** Slightly raised backdrop tint, for panels behind surfaces. */
  backgroundAlt: string;
  /** Elevated surfaces (cards, panels). */
  surface: string;
  /** Secondary elevated surface (inputs, insets). */
  surfaceAlt: string;
  /** Primary brand accent — worked bronze / candlelight gold. */
  primary: string;
  primaryHover: string;
  /** Text drawn on top of the primary accent. */
  onPrimary: string;
  /** Secondary accent — wax-seal ember red, for rare highlights. */
  accent: string;
  text: string;
  textMuted: string;
  /** Text drawn on top of `accent`. */
  onAccent: string;
  /** Hairline borders — aged wood / paper edges. */
  border: string;
  /** Stronger border for emphasis (framed elements). */
  borderStrong: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  /** Backdrop behind modals/overlays. */
  overlay: string;
}

export type ThemeName = 'dark' | 'light';

/** Same keys as the token shadow ladder, but per-theme string values. */
export type ThemeShadow = Record<keyof typeof shadow, string>;

export interface AppTheme {
  name: ThemeName;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: ThemeShadow;
  typography: typeof typography;
  breakpoints: typeof breakpoints;
  opacity: typeof opacity;
  zIndex: typeof zIndex;
  transitions: typeof transitions;
}

const structural = {
  spacing,
  radius,
  typography,
  breakpoints,
  opacity,
  zIndex,
  transitions,
};

/** Warm, book-like shadows for the parchment (light) theme. */
const lightShadow: ThemeShadow = {
  none: 'none',
  sm: '0 1px 2px rgba(58, 44, 20, 0.10)',
  md: '0 10px 26px rgba(58, 44, 20, 0.14)',
  lg: '0 26px 60px rgba(58, 44, 20, 0.18)',
  glow: '0 0 22px rgba(138, 90, 43, 0.20)',
};

/** Dark fantasy — the primary, default identity (a closed grimoire). */
export const darkTheme: AppTheme = {
  name: 'dark',
  colors: {
    background: '#16130d',
    backgroundAlt: '#1a1610',
    surface: '#1f1a12',
    surfaceAlt: '#2a2417',
    primary: '#c9a24a',
    primaryHover: '#dcb75f',
    onPrimary: '#1a1206',
    accent: '#a5432c',
    onAccent: '#f7e4d9',
    text: '#efe6d3',
    textMuted: '#a99b7e',
    border: '#38301f',
    borderStrong: '#4b4029',
    danger: '#cf5b41',
    success: '#7f9a55',
    warning: '#d1a24b',
    info: '#7c9fb8',
    overlay: 'rgba(9, 7, 3, 0.74)',
  },
  ...structural,
  shadow,
};

/** Light — aged parchment that keeps the premium, old-book feel. */
export const lightTheme: AppTheme = {
  name: 'light',
  colors: {
    background: '#ece3cf',
    backgroundAlt: '#e5dabf',
    surface: '#f6efdd',
    surfaceAlt: '#e6dbc1',
    primary: '#8a5a2b',
    primaryHover: '#754a20',
    onPrimary: '#f8f1de',
    accent: '#8f2f22',
    onAccent: '#f8f1de',
    text: '#2c2214',
    textMuted: '#6f6047',
    border: '#d2c3a2',
    borderStrong: '#c3af86',
    danger: '#a5372a',
    success: '#5c7a37',
    warning: '#9a6a1f',
    info: '#3f6a86',
    overlay: 'rgba(34, 26, 12, 0.44)',
  },
  ...structural,
  shadow: lightShadow,
};

export const themes: Record<ThemeName, AppTheme> = {
  dark: darkTheme,
  light: lightTheme,
};

/**
 * Per-module sub-identity ("O Livro do Mestre"): every module shares the base
 * language but may tint its accent — Atlas/maps lean verdigris, Heráldica/
 * factions lean wax-seal red, Fichas/characters keep bronze, etc.
 *
 * Future module screens wrap their subtree in a nested `ThemeProvider` built
 * with `withModuleAccent(theme, 'atlas')`, overriding only `primary`/`accent`
 * while keeping all other tokens identical — so consistency is guaranteed.
 */
export type ModuleAccent = 'default' | 'atlas' | 'heraldry' | 'sheet' | 'arcane';

const moduleAccents: Record<
  ModuleAccent,
  { primary: string; accent: string }
> = {
  default: { primary: '', accent: '' }, // keep the theme's own values
  atlas: { primary: '#3f7d74', accent: '#8a4a32' }, // verdigris + oxblood
  heraldry: { primary: '#9c3b2c', accent: '#b8933f' }, // wax-seal + gilt
  sheet: { primary: '#8a5a2b', accent: '#5c7a37' }, // leather + ink-green
  arcane: { primary: '#6f5aa8', accent: '#b8933f' }, // restrained violet + gilt
};

export function withModuleAccent(theme: AppTheme, module: ModuleAccent): AppTheme {
  const override = moduleAccents[module];
  if (!override || (!override.primary && !override.accent)) return theme;
  return {
    ...theme,
    colors: {
      ...theme.colors,
      primary: override.primary || theme.colors.primary,
      accent: override.accent || theme.colors.accent,
    },
  };
}
