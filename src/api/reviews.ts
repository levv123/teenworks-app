import { supabase } from './supabase';
import { Booking, CategoryRatings, Review } from '../types';

// ── Write ─────────────────────────────────────────────────────

export async function createReview(
  bookingId: string,
  reviewerId: string,
  revieweeId: string,
  revieweeRole: 'provider' | 'client',
  rating: number,
  comment: string | undefined,
  wouldHireAgain: boolean | null,
  categoryRatings?: CategoryRatings | null,
): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id: bookingId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      reviewee_role: revieweeRole,
      rating,
      comment: comment ?? null,
      would_hire_again: wouldHireAgain,
      category_ratings: categoryRatings ?? null,
    })
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(*),
      reviewee:profiles!reviews_reviewee_id_fkey(*)
    `)
    .single();
  if (error) throw error;
  return data as Review;
}

// ── Read ──────────────────────────────────────────────────────

/** All reviews received by this user (both as provider and as client). */
export async function getReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(*)`)
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Reviews received as a provider (clients rating their work). */
export async function getProviderReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(*)`)
    .eq('reviewee_id', userId)
    .eq('reviewee_role', 'provider')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Reviews received as a client (workers rating them). */
export async function getClientReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(*)`)
    .eq('reviewee_id', userId)
    .eq('reviewee_role', 'client')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Returns both reviews tied to a booking (client→provider and provider→client). */
export async function getReviewsForBooking(bookingId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(*),
      reviewee:profiles!reviews_reviewee_id_fkey(*)
    `)
    .eq('booking_id', bookingId);
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function getReviewForBooking(
  bookingId: string,
  reviewerId: string,
): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(*)`)
    .eq('booking_id', bookingId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  if (error) throw error;
  return data as Review | null;
}

// ── Eligibility gate ──────────────────────────────────────────

export type ReviewBlockReason =
  | 'booking_not_found'
  | 'booking_not_completed'
  | 'not_a_participant'
  | 'already_reviewed';

export interface ReviewEligibility {
  canReview: boolean;
  reason?: ReviewBlockReason;
  booking: Booking | null;
  existingReview: Review | null;
  theirReview: Review | null;
}

export async function getReviewEligibility(
  bookingId: string,
  userId: string,
): Promise<ReviewEligibility> {
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select(`
      *,
      request:service_requests(*, category:categories(*)),
      provider:profiles!bookings_provider_id_fkey(*),
      client:profiles!bookings_client_id_fkey(*),
      provider_profile:provider_profiles!bookings_provider_id_fkey(*)
    `)
    .eq('id', bookingId)
    .maybeSingle();

  if (bErr) throw bErr;
  if (!booking) return { canReview: false, reason: 'booking_not_found',     booking: null, existingReview: null, theirReview: null };

  const b = booking as Booking;

  if (b.status !== 'completed')
    return { canReview: false, reason: 'booking_not_completed', booking: b, existingReview: null, theirReview: null };

  if (b.client_id !== userId && b.provider_id !== userId)
    return { canReview: false, reason: 'not_a_participant',     booking: b, existingReview: null, theirReview: null };

  const allReviews = await getReviewsForBooking(bookingId);
  const myReview    = allReviews.find((r) => r.reviewer_id === userId) ?? null;
  const theirReview = allReviews.find((r) => r.reviewer_id !== userId) ?? null;

  if (myReview)
    return { canReview: false, reason: 'already_reviewed', booking: b, existingReview: myReview, theirReview };

  return { canReview: true, booking: b, existingReview: null, theirReview };
}
