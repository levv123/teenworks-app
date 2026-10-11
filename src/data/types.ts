/**
 * TeenWorks domain types for the frontend.
 *
 * These describe what the UI renders. They are deliberately independent of the
 * Supabase row shapes in src/types/index.ts so the new frontend can be driven by
 * mock data today and a real API later without touching a single screen.
 */
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export type CategoryId =
  | 'all'
  | 'yard'
  | 'tutoring'
  | 'moving'
  | 'pets'
  | 'cleaning'
  | 'tech'
  | 'errands';

export interface Category {
  id: CategoryId;
  label: string;
  icon: IoniconName;
  color: string;
}

export type ScheduleType = 'one-time' | 'recurring';

export interface Gig {
  id: string;
  title: string;
  /** Payout in whole dollars. */
  price: number;
  rateType: 'fixed' | 'hourly';
  category: Exclude<CategoryId, 'all'>;
  /** City shown under the title, e.g. "Surfside, FL". */
  place: string;
  distanceMi: number;
  tags: string[];
  scheduleType: ScheduleType;
  /** Minutes since the gig was posted — rendered by timeAgo(). */
  postedMinutesAgo: number;
  imageUrl: string | null;
  description: string;
  /** Short "what you'll do" bullets on the detail screen. */
  duties: string[];
  poster: {
    name: string;
    avatarUrl: string | null;
    rating: number;
    jobsPosted: number;
  };
}

export type ApplicationStatus = 'applied' | 'accepted' | 'declined';

export interface Application {
  gigId: string;
  status: ApplicationStatus;
  /** ISO string — set when the application was created. */
  appliedAt: string;
  note?: string;
}

export interface Service {
  id: string;
  title: string;
  category: Exclude<CategoryId, 'all'>;
  rate: number;
  rateType: 'fixed' | 'hourly';
  description: string;
  /** Short day labels: 'Mon' | 'Tue' | ... */
  availability: string[];
  place: string;
  active: boolean;
  views: number;
  requests: number;
}

export interface ServiceDraft {
  title: string;
  category: Exclude<CategoryId, 'all'>;
  rate: number;
  rateType: 'fixed' | 'hourly';
  description: string;
  availability: string[];
  place: string;
}

export interface PastJob {
  id: string;
  title: string;
  category: Exclude<CategoryId, 'all'>;
  client: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  payout: number;
  rating: number;
  imageUrl: string | null;
}

export interface Review {
  id: string;
  author: string;
  role: string;
  avatarUrl: string | null;
  rating: number;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  body: string;
  jobTitle: string;
}

export type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface TimeRangeOption {
  id: TimeRange;
  label: string;
  /** Wording used in the "+ $184 from last month" line. */
  comparisonLabel: string;
}

export interface ChartBar {
  label: string;
  value: number;
}

export interface BreakdownSlice {
  category: Exclude<CategoryId, 'all'>;
  amount: number;
  /** 0–100, already rounded. */
  percent: number;
  jobs: number;
}

export interface EarningsSummary {
  range: TimeRange;
  total: number;
  /** Percent change vs. the previous comparable period; may be negative. */
  deltaPercent: number;
  /** Absolute dollar change vs. the previous period; may be negative. */
  deltaAmount: number;
  chart: ChartBar[];
  jobsCompleted: number;
  avgRating: number;
  newClients: number;
  breakdown: BreakdownSlice[];
}

export interface Place {
  id: string;
  label: string;
  distanceMi: number;
}

export interface Worker {
  id: string;
  name: string;
  headline: string;
  avatarUrl: string | null;
  rating: number;
  jobs: number;
  distanceMi: number;
  startingPrice: number;
  categories: Exclude<CategoryId, 'all'>[];
  verified: boolean;
}

export type RequestStatus = 'open' | 'hired' | 'closed';

export interface HireRequest {
  id: string;
  title: string;
  category: Exclude<CategoryId, 'all'>;
  budget: number;
  when: string;
  description: string;
  status: RequestStatus;
  applicants: number;
  postedMinutesAgo: number;
  /** City-level area only. The exact address is never posted publicly. */
  place?: string;
  /** Set once the customer hires someone for this need. */
  hiredWorkerId?: string;
  /** The booking created when someone was hired. */
  bookingId?: string;
}

export interface RequestDraft {
  title: string;
  category: Exclude<CategoryId, 'all'>;
  budget: number;
  when: string;
  description: string;
  place?: string;
}

// ── Hire side: service listings and bookings ──────────────────────────────────

/** A service a nearby worker offers, as the Hire side browses it. */
export interface ServiceListing {
  id: string;
  workerId: string;
  title: string;
  category: Exclude<CategoryId, 'all'>;
  rate: number;
  rateType: 'fixed' | 'hourly';
  description: string;
  /** Short "what's included" bullets. */
  includes: string[];
  /** Short day labels: 'Mon' | 'Tue' | ... */
  availability: string[];
  place: string;
  distanceMi: number;
  imageUrl: string | null;
  rating: number;
  reviewCount: number;
}

/**
 * requested -> waiting on the worker; confirmed -> accepted and scheduled;
 * completed / cancelled / declined are terminal.
 */
export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined';

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface Booking {
  id: string;
  /** The listing booked, or null when the booking came from hiring on a need. */
  listingId: string | null;
  /** The need this booking came from, when it did. */
  requestId: string | null;
  workerId: string;
  title: string;
  category: Exclude<CategoryId, 'all'>;
  /** ISO date (yyyy-mm-dd), or null when the need only said "This week". */
  date: string | null;
  /** Human wording used when there is no exact date. */
  whenLabel: string;
  slot: TimeSlot | null;
  /** Booked hours for hourly work; null for fixed-price jobs. */
  hours: number | null;
  /** Estimated total in whole dollars. */
  total: number;
  place: string;
  notes: string;
  status: BookingStatus;
  /** ISO timestamp. */
  createdAt: string;
  review?: { rating: number; body: string };
}

export interface BookingDraft {
  listingId: string;
  date: string;
  slot: TimeSlot;
  hours: number | null;
  notes: string;
  place: string;
}

export type ReportReason =
  | 'inappropriate'
  | 'off-platform'
  | 'personal-info'
  | 'unsafe-job'
  | 'no-show'
  | 'payment'
  | 'other';

export interface SafetyReport {
  id: string;
  targetType: 'worker' | 'booking' | 'request';
  targetId: string;
  reason: ReportReason;
  details: string;
  /** ISO timestamp. */
  createdAt: string;
}

export type BookingsSegment = 'upcoming' | 'needs' | 'past';

export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  place: string;
  trustScore: number;
  trustLevel: string;
  memberSince: string;
  responseMins: number;
  verifications: { label: string; icon: IoniconName; done: boolean }[];
}

export type AppMode = 'earn' | 'hire';
export type GigSort = 'newest' | 'closest' | 'highest';
