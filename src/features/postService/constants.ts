/**
 * The fixed choices and limits of the Post a Service flow, shared by its steps
 * so the form, the preview and the saved record read the same values.
 */
import type { CategoryId } from '../../data/types';

export type ServiceCategoryId = Exclude<CategoryId, 'all'>;
export type RateType = 'fixed' | 'hourly';

/** Grid order from the Post a Service spec; 'other' is the "More" tile. */
export const GRID_CATEGORIES: ServiceCategoryId[] = [
  'yard',
  'pets',
  'moving',
  'cleaning',
  'tech',
  'tutoring',
  'errands',
  'other',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof DAYS)[number];

export const RATE_TYPES: { id: RateType; label: string }[] = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'fixed', label: 'Fixed' },
];

export type DurationId = 'under1' | '1to2' | '2to4' | '4plus';

/**
 * duration_minutes stores one representative value per choice, and
 * durationFromMinutes maps any stored value back onto a choice by range.
 */
export const DURATIONS: { id: DurationId; label: string; minutes: number }[] = [
  { id: 'under1', label: 'Under 1 hour', minutes: 45 },
  { id: '1to2', label: '1–2 hours', minutes: 90 },
  { id: '2to4', label: '2–4 hours', minutes: 180 },
  { id: '4plus', label: '4+ hours', minutes: 240 },
];

export function durationFromMinutes(minutes: number | undefined): DurationId | null {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return 'under1';
  if (minutes <= 120) return '1to2';
  if (minutes < 240) return '2to4';
  return '4plus';
}

export function durationLabel(id: DurationId): string {
  return DURATIONS.find((d) => d.id === id)?.label ?? '';
}

export function durationMinutes(id: DurationId): number {
  return DURATIONS.find((d) => d.id === id)?.minutes ?? 0;
}

// The minimums, DESCRIPTION_MAX and RATE_MAX are the previous form's, so a
// service saved through it still validates when edited here. MAX_PHOTOS matches
// the older service editor. TITLE_MAX only caps typing, so a title stays
// listing-length beside the price in the preview.
export const TITLE_MIN = 4;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 400;
export const RATE_MAX = 500;
export const MAX_PHOTOS = 5;
