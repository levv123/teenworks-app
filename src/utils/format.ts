/** Formatting helpers shared by the TeenWorks frontend. */

/** 842 -> "$842"; 1842.5 -> "$1,843". Whole dollars, no cents. */
export function formatMoney(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${digits}`;
}

/** Signed variant used for deltas: 184 -> "+ $184", -30 -> "- $30". */
export function formatMoneyDelta(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  return `${rounded < 0 ? '-' : '+'} ${formatMoney(Math.abs(rounded))}`;
}

/** 0.4 -> "0.4 mi"; 3 -> "3 mi". */
export function formatDistance(miles: number): string {
  if (!Number.isFinite(miles)) return '—';
  const rounded = Math.round(miles * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} mi`;
}

/** Minutes since posting -> "just now" | "34m ago" | "2h ago" | "3d ago". */
export function timeAgo(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** "2026-08-14" -> "Aug 14, 2026". Falls back to the raw string if unparseable. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return iso ?? '';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [, y, m, d] = match;
  const monthIndex = Number(m) - 1;
  if (monthIndex < 0 || monthIndex > 11) return iso;
  return `${MONTHS[monthIndex]} ${Number(d)}, ${y}`;
}

/** 4.9 -> "4.9"; 5 -> "5.0". */
export function formatRating(rating: number): string {
  return Number.isFinite(rating) ? rating.toFixed(1) : '—';
}

/** 45 -> "45 min"; 90 -> "1h 30m"; 120 -> "2h". */
export function formatDuration(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return '—';
  if (mins < 60) return `${Math.round(mins)} min`;
  const hours = Math.floor(mins / 60);
  const rest = Math.round(mins % 60);
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "Lev Shifman" -> "L". Safe for empty/whitespace names. */
export function initialOf(name: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

/** "$40" for fixed rates, "$25/hr" for hourly. */
export function formatRate(rate: number, rateType: 'fixed' | 'hourly'): string {
  return rateType === 'hourly' ? `${formatMoney(rate)}/hr` : formatMoney(rate);
}
