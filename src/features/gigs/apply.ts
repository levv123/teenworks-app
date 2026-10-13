/**
 * Apply and Withdraw for a gig, on the existing requests + bookings model.
 *
 * An application is a pending bookings row against the gig's open
 * service_requests row: the provider is the signed-in Supabase user, the
 * client is the request's owner and the price is the listed budget. The
 * request stays open while applications come in; accepting one is the
 * poster's call, not something applying does.
 *
 * Nothing here talks to the network itself. AppStore passes in the real
 * Supabase calls, so the rules can be exercised against fakes.
 */
import type { Booking, BookingStatus, RequestStatus } from '../../types';
import type { Application, ApplicationStatus, Gig } from '../../data/types';

export interface ApplyDeps {
  /** The signed-in Supabase user's id, or null when nobody is signed in. */
  currentUserId: () => Promise<string | null>;
  /** This provider's bookings on this request, newest first. */
  findMyBookings: (requestId: string, providerId: string) => Promise<Booking[]>;
  /** This provider's bookings with these ids; others' are never returned. */
  findBookingsByIds: (ids: string[], providerId: string) => Promise<Booking[]>;
  /** The request's status, or null when it isn't visible to this user. */
  requestStatus: (requestId: string) => Promise<RequestStatus | null>;
  createBooking: (
    requestId: string,
    providerId: string,
    clientId: string,
    price: number,
    notes?: string,
  ) => Promise<Booking>;
  /** Cancels the booking if it is still pending; null when nothing pending matched. */
  withdrawPending: (bookingId: string, providerId: string) => Promise<Booking | null>;
}

export type ApplyErrorCode = 'sample' | 'signed-out' | 'own-gig' | 'closed';

/** A refusal with a reason the user can act on. Anything else thrown is a failed request. */
export class ApplyError extends Error {
  readonly code: ApplyErrorCode;

  constructor(code: ApplyErrorCode, message: string) {
    super(message);
    this.name = 'ApplyError';
    this.code = code;
  }
}

/** The wording Gig Detail's button and the Applications pills share. */
export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  accepted: 'Accepted',
  declined: 'Declined',
};

/**
 * How a booking's status reads as an application. null means there is no
 * live application: the provider withdrew it.
 */
export function applicationStatusFor(status: BookingStatus): ApplicationStatus | null {
  switch (status) {
    case 'pending':
      return 'applied';
    case 'accepted':
    case 'in_progress':
    case 'completed':
      return 'accepted';
    case 'rejected':
      return 'declined';
    case 'cancelled':
    default:
      return null;
  }
}

function toApplication(gigId: string, booking: Booking, status: ApplicationStatus): Application {
  return {
    gigId,
    bookingId: booking.id,
    status,
    appliedAt: booking.created_at,
    ...(booking.notes ? { note: booking.notes } : {}),
  };
}

export interface SubmittedApplication {
  application: Application;
  /** True when an application was already on record and nothing new was created. */
  existing: boolean;
}

/**
 * Records an application to the gig's request, or returns the one already on
 * record. Resolves only once Supabase has confirmed the row.
 */
export async function submitApplication(
  gig: Gig,
  deps: ApplyDeps,
  note?: string,
): Promise<SubmittedApplication> {
  const remote = gig.remote;
  if (remote === undefined) {
    throw new ApplyError(
      'sample',
      "This is a sample gig, so there's no poster to send an application to.",
    );
  }

  const userId = await deps.currentUserId();
  if (userId === null) {
    throw new ApplyError('signed-out', 'Sign in to apply to this gig.');
  }
  if (userId === remote.clientId) {
    throw new ApplyError('own-gig', "You posted this gig, so you can't apply to it.");
  }

  // Before the open check, so an application the poster already accepted (which
  // closes the request) still comes back as Accepted rather than "closed".
  for (const booking of await deps.findMyBookings(remote.requestId, userId)) {
    const status = applicationStatusFor(booking.status);
    if (status !== null) {
      return { application: toApplication(gig.id, booking, status), existing: true };
    }
  }

  if ((await deps.requestStatus(remote.requestId)) !== 'open') {
    throw new ApplyError('closed', 'This gig is no longer taking applications.');
  }

  const booking = await deps.createBooking(
    remote.requestId,
    userId,
    remote.clientId,
    gig.price,
    note,
  );
  const status = applicationStatusFor(booking.status);
  if (status === null) {
    throw new Error(`The new application came back ${booking.status}.`);
  }
  return { application: toApplication(gig.id, booking, status), existing: false };
}

export type WithdrawOutcome =
  /** The booking was pending and is now cancelled — or was already withdrawn. */
  | { kind: 'withdrawn' }
  /** The poster answered first; this is the application as it stands now. */
  | { kind: 'answered'; application: Application };

/** Withdraws a pending application. An accepted or declined one is left alone. */
export async function withdrawSubmitted(
  application: Application,
  deps: ApplyDeps,
): Promise<WithdrawOutcome> {
  const userId = await deps.currentUserId();
  if (userId === null) {
    throw new ApplyError('signed-out', 'Sign in to withdraw this application.');
  }
  if ((await deps.withdrawPending(application.bookingId, userId)) !== null) {
    return { kind: 'withdrawn' };
  }

  // Nothing pending matched: re-read it to find out why.
  const [current] = await deps.findBookingsByIds([application.bookingId], userId);
  const status = current === undefined ? null : applicationStatusFor(current.status);
  if (current === undefined || status === null) return { kind: 'withdrawn' };
  return { kind: 'answered', application: toApplication(application.gigId, current, status) };
}

export interface ApplicationSync {
  /** Applications whose status changed on the server. */
  updated: Application[];
  /** Booking ids that are withdrawn, gone, or not this user's. */
  removed: string[];
}

/**
 * Re-reads every recorded application from Supabase. Returns null when there
 * is nobody signed in to read them as, which leaves the last confirmed state.
 */
export async function syncApplications(
  applications: Application[],
  deps: ApplyDeps,
): Promise<ApplicationSync | null> {
  if (applications.length === 0) return null;
  const userId = await deps.currentUserId();
  if (userId === null) return null;

  const rows = await deps.findBookingsByIds(
    applications.map((application) => application.bookingId),
    userId,
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const sync: ApplicationSync = { updated: [], removed: [] };
  for (const application of applications) {
    const row = byId.get(application.bookingId);
    const status = row === undefined ? null : applicationStatusFor(row.status);
    if (status === null) sync.removed.push(application.bookingId);
    else if (status !== application.status) sync.updated.push({ ...application, status });
  }
  return sync;
}
