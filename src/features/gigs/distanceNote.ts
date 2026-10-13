/**
 * The caveat for a search location other than the one the seeded distances
 * are measured from. The seed has no coordinates, so nothing re-measures them;
 * Home and the Location picker say so instead of implying otherwise.
 */
import { DISTANCE_ORIGIN } from '../../data/mock';

/** null at the origin itself, where the distances are exactly what they say. */
export function distanceNoteFor(placeLabel: string): string | null {
  if (placeLabel === DISTANCE_ORIGIN.label) return null;
  return `Distances are measured from ${DISTANCE_ORIGIN.label}, so the radius counts from there too.`;
}
