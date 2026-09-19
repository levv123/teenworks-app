import { ServiceRateType } from '../../../types';

/** Matches the existing MAX_IMAGES cap from the old single-page form. */
export const MAX_IMAGES = 5;

/** Description cap. The old form allowed 800; the redesign tightens it to 400. */
export const MAX_DESCRIPTION = 400;

export const MAX_TITLE = 80;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const RATE_TYPES: { value: ServiceRateType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'fixed', label: 'Fixed' },
];

/**
 * "How long does it usually take?" options.
 *
 * `hours` is what persists (provider_services.duration_hours, migration 017).
 * Values are unique so a stored number maps back to exactly one label.
 */
export const DURATION_OPTIONS: { label: string; hours: number }[] = [
  { label: 'Under 1 hour', hours: 0.5 },
  { label: '1–2 hours', hours: 2 },
  { label: '2–4 hours', hours: 4 },
  { label: '4–6 hours', hours: 6 },
  { label: 'Most of the day', hours: 8 },
  { label: 'Multiple days', hours: 24 },
];

export function durationLabel(hours: number | null | undefined): string | null {
  if (hours == null) return null;
  const match = DURATION_OPTIONS.find((o) => o.hours === hours);
  if (match) return match.label;
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

/**
 * Category photography for the step 1 grid, keyed by lowercased category name.
 *
 * These are hotlinked Unsplash CDN images. They could NOT be reached from the
 * build sandbox (its proxy blocks images.unsplash.com), so treat the exact
 * photo IDs as swappable: every card falls back to a tinted gradient built from
 * the category's own `color` plus its Ionicon whenever an image is missing,
 * offline, or fails to load. To change the art, edit this map only.
 *
 * Keys cover the eight seeded categories, plus common aliases so a category
 * renamed or added in the dashboard still finds art.
 */
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=70`;

export const CATEGORY_IMAGES: Record<string, string> = {
  // ── The eight seeded categories ──────────────────────────────
  cleaning: UNSPLASH('1581578731548-c64695cc6952'),
  plumbing: UNSPLASH('1607472586893-edb57bdc0e39'),
  electrical: UNSPLASH('1621905251189-08b45d6a269e'),
  moving: UNSPLASH('1600518464441-9154a4dea21b'),
  handyman: UNSPLASH('1581244277943-fe4a9c777189'),
  delivery: UNSPLASH('1526367790999-0150786686a2'),
  tutoring: UNSPLASH('1503676260728-1c00da094a0b'),
  'pet care': UNSPLASH('1601758228041-f3b2795255f1'),

  // ── Aliases for likely dashboard-added categories ────────────
  pets: UNSPLASH('1601758228041-f3b2795255f1'),
  'yard work': UNSPLASH('1416879595882-3373a0480b5b'),
  landscaping: UNSPLASH('1416879595882-3373a0480b5b'),
  'tech help': UNSPLASH('1588072432836-e10032774350'),
  errands: UNSPLASH('1526367790999-0150786686a2'),
  tutoring_alt: UNSPLASH('1503676260728-1c00da094a0b'),
};

export function categoryImage(name: string): string | null {
  return CATEGORY_IMAGES[name.trim().toLowerCase()] ?? null;
}

/** Formats a price the same way step 3 and the live listing should read it. */
export function formatRate(price: number, rateType: ServiceRateType): string {
  const amount = Number.isFinite(price) ? price : 0;
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return rateType === 'hourly' ? `$${rounded}/hr` : `$${rounded}`;
}
