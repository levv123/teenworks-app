/**
 * TeenWorks design tokens.
 *
 * Pure-black, high-contrast, mobile-first. See docs/DESIGN.md for the full spec.
 * Nothing in the app should hard-code a hex value — pull it from here.
 */
import { TextStyle } from 'react-native';

export const C = {
  bg: '#000000',
  surface: '#121212',
  surfaceAlt: '#1A1A1A',
  surfaceHigh: '#242424',

  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textSubtle: '#636366',

  onLight: '#0A0A0A',
  onLightMuted: '#4A4A4F',

  success: '#32D74B',
  successBg: 'rgba(50,215,75,0.16)',
  danger: '#FF453A',
  dangerBg: 'rgba(255,69,58,0.16)',
  star: '#FF9F0A',
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 40,
} as const;

/** Horizontal screen gutter. Every screen-level container uses this. */
export const GUTTER = 20;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

type Type = Pick<
  TextStyle,
  'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'
>;

export const T: Record<
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyBold' | 'small' | 'tiny',
  Type
> = {
  display:  { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 40 },
  h1:       { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 },
  h2:       { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 26 },
  h3:       { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, lineHeight: 22 },
  body:     { fontSize: 15, fontWeight: '500', letterSpacing: 0,    lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1, lineHeight: 21 },
  small:    { fontSize: 13, fontWeight: '500', letterSpacing: 0,    lineHeight: 18 },
  tiny:     { fontSize: 11, fontWeight: '600', letterSpacing: 0.2,  lineHeight: 14 },
};

/** Lines up columns of figures ($842, 4.9, 12) so they don't jitter. */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/** Height of the custom tab bar, excluding the bottom safe-area inset. */
export const TAB_BAR_HEIGHT = 56;
