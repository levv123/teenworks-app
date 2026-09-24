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
  | 'errands'
  /**
   * Post a Service's "More" tile, for work that fits none of the above. It is
   * deliberately absent from CATEGORIES, so no chip row or filter lists it.
   */
  | 'other';

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
  /** Photo URLs, cover first. Absent on services posted before photos existed. */
  images?: string[];
  /** How long the job takes. Absent on services posted before it was asked. */
  durationMinutes?: number;
  /** The provider_services row id when the service was also saved to Supabase. */
  remoteId?: string;
}

export interface ServiceDraft {
  title: string;
  category: Exclude<CategoryId, 'all'>;
  rate: number;
  rateType: 'fixed' | 'hourly';
  description: string;
  availability: string[];
  place: string;
  images?: string[];
  durationMinutes?: number;
  remoteId?: string;
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
}

export interface RequestDraft {
  title: string;
  category: Exclude<CategoryId, 'all'>;
  budget: number;
  when: string;
  description: string;
}

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
