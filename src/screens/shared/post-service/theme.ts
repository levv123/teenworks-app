/**
 * Dark palette scoped to the Post a Service flow ONLY.
 *
 * The app-wide tokens in src/utils/colors.ts are a light theme used by 68
 * files; this flow is the only dark surface in TeenWorks, so its tokens live
 * here instead of being bolted onto the global palette. Nothing outside
 * src/screens/shared/post-service/ should import from this file.
 *
 * Values are hex (not rgba) so the codebase's `token + '33'` alpha idiom works.
 */
export const Dark = {
  /** Page background — true black, per the reference. */
  bg: '#000000',
  /** Slightly elevated card surface. */
  surface: '#111111',
  /** One step brighter, for controls sitting on top of a card. */
  surfaceRaised: '#171717',
  /** Pressed/selected fill for secondary controls. */
  surfaceActive: '#1F1F1F',

  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#6B6B6B',

  border: '#1F1F1F',
  borderStrong: '#2E2E2E',
  /** Selected-state border — high contrast against every card. */
  borderSelected: '#FFFFFF',

  /** Primary CTA: white fill, black label. */
  ctaBg: '#FFFFFF',
  ctaText: '#000000',
  ctaDisabledBg: '#1A1A1A',
  ctaDisabledText: '#5A5A5A',

  danger: '#FF453A',
  success: '#32D74B',

  /** Scrim over category photography so the label stays readable. */
  scrim: 'rgba(0,0,0,0.45)',
  scrimStrong: 'rgba(0,0,0,0.72)',
} as const;

/** 8px-based spacing scale for this flow. */
export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const R = {
  sm: 8,
  md: 12,
  input: 14,
  card: 18,
  lg: 20,
  full: 9999,
} as const;

/** Minimum comfortable touch target. */
export const TOUCH = 44;

/** Primary CTA height. */
export const CTA_HEIGHT = 54;

/** Standard field height. */
export const FIELD_HEIGHT = 54;

/** Screen gutter. */
export const GUTTER = 20;
