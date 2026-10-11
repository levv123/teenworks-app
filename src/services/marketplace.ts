/**
 * The Hire-side data seam.
 *
 * Every write the Hire side makes goes through these async functions, which
 * validate the input the way a server would and resolve with the stored record.
 * Today they run locally against the in-memory store (the Supabase layer in
 * src/api is not mounted yet); swapping them for real network calls is the only
 * change the screens will need, because they already await a promise and handle
 * a rejection.
 */
import type {
  Booking,
  BookingDraft,
  HireRequest,
  ReportReason,
  RequestDraft,
  SafetyReport,
  ServiceListing,
  Worker,
} from '../data/types';
import { isOnOrBeforeToday, parseISODate, todayISO } from '../utils/dates';

/** Simulated round trip so loading states are real and visible. */
const LATENCY_MS = 450;

export class MarketplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

function wait(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let seq = 0;
function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}_${seq}`;
}

export const BOOKING_LIMITS = {
  minHours: 1,
  /** Long single bookings are where teen hour limits start to bite. */
  maxHours: 4,
  notesMax: 300,
} as const;

export const NEED_LIMITS = {
  titleMin: 4,
  titleMax: 60,
  descriptionMin: 20,
  descriptionMax: 500,
  budgetMin: 5,
  budgetMax: 2000,
} as const;

export function estimateTotal(listing: ServiceListing, hours: number | null): number {
  if (listing.rateType === 'hourly') return listing.rate * (hours ?? BOOKING_LIMITS.minHours);
  return listing.rate;
}

export interface CreateBookingContext {
  listing: ServiceListing;
  worker: Worker;
  existing: Booking[];
  blockedWorkerIds: string[];
}

export async function createBooking(
  draft: BookingDraft,
  { listing, worker, existing, blockedWorkerIds }: CreateBookingContext,
): Promise<Booking> {
  await wait();

  if (blockedWorkerIds.includes(worker.id)) {
    throw new MarketplaceError(`You blocked ${worker.name}. Unblock them from their profile to book.`);
  }
  if (parseISODate(draft.date) === null || draft.date <= todayISO()) {
    throw new MarketplaceError('Pick a day from tomorrow onward.');
  }
  if (listing.rateType === 'hourly') {
    const h = draft.hours ?? 0;
    if (!Number.isInteger(h) || h < BOOKING_LIMITS.minHours || h > BOOKING_LIMITS.maxHours) {
      throw new MarketplaceError(`Book between ${BOOKING_LIMITS.minHours} and ${BOOKING_LIMITS.maxHours} hours.`);
    }
  }
  if (draft.notes.length > BOOKING_LIMITS.notesMax) {
    throw new MarketplaceError(`Keep notes under ${BOOKING_LIMITS.notesMax} characters.`);
  }
  const clash = existing.some(
    (b) =>
      b.workerId === worker.id &&
      b.date === draft.date &&
      b.slot === draft.slot &&
      (b.status === 'requested' || b.status === 'confirmed'),
  );
  if (clash) {
    throw new MarketplaceError(
      `You already have ${worker.name.split(' ')[0]} booked for that time. Pick another slot.`,
    );
  }

  return {
    id: newId('bk_'),
    listingId: listing.id,
    requestId: null,
    workerId: worker.id,
    title: listing.title,
    category: listing.category,
    date: draft.date,
    whenLabel: '',
    slot: draft.slot,
    hours: listing.rateType === 'hourly' ? draft.hours : null,
    total: estimateTotal(listing, draft.hours),
    place: draft.place,
    notes: draft.notes.trim(),
    status: 'requested',
    createdAt: new Date().toISOString(),
  };
}

export async function cancelBooking(booking: Booking): Promise<void> {
  await wait();
  if (booking.status !== 'requested' && booking.status !== 'confirmed') {
    throw new MarketplaceError('Only pending or confirmed bookings can be cancelled.');
  }
}

export async function completeBooking(booking: Booking): Promise<void> {
  await wait();
  if (booking.status !== 'confirmed') {
    throw new MarketplaceError('Only a confirmed booking can be marked as done.');
  }
  if (!isOnOrBeforeToday(booking.date)) {
    throw new MarketplaceError('You can mark it done on the day of the job.');
  }
}

export async function reviewBooking(booking: Booking, rating: number, body: string): Promise<void> {
  await wait();
  if (booking.status !== 'completed') {
    throw new MarketplaceError('You can review a job once it is completed.');
  }
  if (booking.review !== undefined) throw new MarketplaceError('You already reviewed this job.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new MarketplaceError('Pick between 1 and 5 stars.');
  }
  if (body.length > 400) throw new MarketplaceError('Keep the review under 400 characters.');
}

export async function createNeed(draft: RequestDraft): Promise<HireRequest> {
  await wait();
  const title = draft.title.trim();
  if (title.length < NEED_LIMITS.titleMin || title.length > NEED_LIMITS.titleMax) {
    throw new MarketplaceError('That title is too short or too long.');
  }
  if (!Number.isFinite(draft.budget) || draft.budget < NEED_LIMITS.budgetMin || draft.budget > NEED_LIMITS.budgetMax) {
    throw new MarketplaceError('That budget is out of range.');
  }
  if (draft.description.trim().length < NEED_LIMITS.descriptionMin) {
    throw new MarketplaceError('Add a little more detail to the description.');
  }
  return {
    id: newId('req_'),
    title,
    category: draft.category,
    budget: Math.round(draft.budget),
    when: draft.when,
    description: draft.description.trim(),
    place: draft.place,
    status: 'open',
    applicants: 0,
    postedMinutesAgo: 0,
  };
}

export async function closeNeed(request: HireRequest): Promise<void> {
  await wait();
  if (request.status !== 'open') throw new MarketplaceError('This need is already closed.');
}

export async function hireForNeed(request: HireRequest, worker: Worker): Promise<Booking> {
  await wait();
  if (request.status !== 'open') throw new MarketplaceError('This need is no longer open.');
  return {
    id: newId('bk_'),
    listingId: null,
    requestId: request.id,
    workerId: worker.id,
    title: request.title,
    category: request.category,
    date: null,
    whenLabel: request.when,
    slot: null,
    hours: null,
    total: request.budget,
    place: request.place ?? '',
    notes: '',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
}

export async function submitReport(input: {
  targetType: SafetyReport['targetType'];
  targetId: string;
  reason: ReportReason;
  details: string;
}): Promise<SafetyReport> {
  await wait();
  if (input.reason === 'other' && input.details.trim().length < 10) {
    throw new MarketplaceError('Tell us a little more so we can look into it.');
  }
  return { id: newId('rpt_'), ...input, details: input.details.trim(), createdAt: new Date().toISOString() };
}

/** Pull-to-refresh hook point; resolves once the (local) catalog is current. */
export async function refreshListings(): Promise<void> {
  await wait(600);
}

/** Turns anything thrown into a sentence a person can act on. */
export function errorMessage(error: unknown): string {
  if (error instanceof MarketplaceError) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}
