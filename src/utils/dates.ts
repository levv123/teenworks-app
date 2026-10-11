/**
 * Calendar helpers for bookings. Everything works on local-time ISO dates
 * (yyyy-mm-dd) so a booking made at 11pm never slides into the next day.
 */
import type { TimeSlot } from '../data/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local date -> "2026-10-14". */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today plus `days` (may be negative), as a local ISO date. */
export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return toISODate(d);
}

/** "2026-10-14" -> a local Date at midnight, or null when unparseable. */
export function parseISODate(iso: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** True when the date is today or earlier. Null dates count as reached. */
export function isOnOrBeforeToday(iso: string | null): boolean {
  if (iso === null) return true;
  return iso <= todayISO();
}

/** "Mon" for a local ISO date. */
export function weekdayOf(iso: string): string {
  const d = parseISODate(iso);
  return d === null ? '' : DAY_LABELS[d.getDay()];
}

/** "Wed, Oct 14" — with "Today" / "Tomorrow" for the next two days. */
export function formatDay(iso: string | null, fallback = ''): string {
  if (iso === null) return fallback;
  const d = parseISODate(iso);
  if (d === null) return fallback || iso;
  if (iso === todayISO()) return 'Today';
  if (iso === addDaysISO(1)) return 'Tomorrow';
  return `${DAY_LABELS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Short chip label parts: { dow: 'Wed', day: '14', month: 'Oct' }. */
export function dayParts(iso: string): { dow: string; day: string; month: string } {
  const d = parseISODate(iso);
  if (d === null) return { dow: '', day: '', month: '' };
  return { dow: DAY_LABELS[d.getDay()], day: String(d.getDate()), month: MONTHS[d.getMonth()] };
}

/**
 * The next `count` days (starting tomorrow) whose weekday is in `availability`.
 * An empty availability list means "any day".
 */
export function upcomingAvailableDates(availability: string[], count = 8, horizon = 28): string[] {
  const out: string[] = [];
  for (let i = 1; i <= horizon && out.length < count; i += 1) {
    const iso = addDaysISO(i);
    if (availability.length === 0 || availability.includes(weekdayOf(iso))) out.push(iso);
  }
  return out;
}

/**
 * Slots end by 7pm on purpose: Florida limits how late 14- and 15-year-olds may
 * work on school nights, so the booking flow never offers a later start.
 */
export const TIME_SLOTS: { id: TimeSlot; label: string; range: string }[] = [
  { id: 'morning', label: 'Morning', range: '9am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', range: '12 – 4pm' },
  { id: 'evening', label: 'Early evening', range: '4 – 7pm' },
];

export function slotLabel(slot: TimeSlot | null): string {
  if (slot === null) return '';
  const found = TIME_SLOTS.find((s) => s.id === slot);
  return found ? `${found.label} (${found.range})` : '';
}
