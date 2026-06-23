// ============================================================
// LastMinute App - TypeScript Types
// ============================================================

export type UserRole = 'client' | 'provider';

export type RequestStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';

export type ProjectStatus =
  | 'inquiry'           // conversation started, no formal offer yet
  | 'offer_sent'        // booking created (pending), awaiting confirmation
  | 'accepted'          // both parties agreed to proceed
  | 'in_progress'       // work has begun
  | 'review_requested'  // deliverable submitted, awaiting client approval
  | 'completed'         // project finished
  | 'cancelled';        // called off

// ── Database Models ──────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  location_lat: number | null;
  location_lng: number | null;
  username: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  parent_approved: boolean;
  verified_professional: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile extends Profile {
  provider_profile?: ProviderProfile | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  bio: string | null;
  skills: string[];
  hourly_rate: number | null;
  rating: number;
  review_count: number;
  trust_score: number;
  is_available: boolean;
  radius_km: number;
  experience_years: number | null;
  availability_days: string[] | null;
  /** 1–5 trust level derived from trust_score. Trigger-maintained. */
  trust_level: 1 | 2 | 3 | 4 | 5;
  /** Pct of non-pending bookings that were completed (0–100). Trigger-maintained. */
  completion_rate: number;
  /** Pct of distinct completed-booking clients who booked >1 time (0–100). */
  repeat_client_rate: number;
  /** Average hours from booking creation to provider acceptance. Null = no data. */
  avg_response_hours: number | null;
  total_bookings: number;
  completed_bookings: number;
  created_at: string;
  updated_at: string;
}

// ── Trust History ────────────────────────────────────────────

export type TrustHistoryEventType =
  | 'score_change'
  | 'milestone'
  | 'level_up'
  | 'verification'
  | 'review_received';

export interface TrustHistoryEvent {
  id: string;
  provider_id: string;
  event_type: TrustHistoryEventType;
  score_before: number | null;
  score_after: number;
  score_delta: number | null;    // generated column: score_after - score_before
  title: string;
  detail: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type ProofType = 'testimonial' | 'screenshot' | 'certificate' | 'award' | 'before_after' | 'result';

export interface ProofItem {
  id: string;
  user_id: string;
  proof_type: ProofType;
  headline: string;
  body: string | null;
  metric: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PortfolioFileType = 'image' | 'video' | 'pdf';

export interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  file_type: PortfolioFileType;
  is_featured: boolean;
  media_urls: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface ServiceSuggestion {
  category: 'title' | 'description' | 'pricing' | 'images' | 'portfolio' | 'faq' | 'packages' | 'general';
  priority: 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
}

export interface ServiceAnalysis {
  score: number;
  breakdown: Record<string, number>;  // category → points earned
  suggestions: ServiceSuggestion[];
  strengths: string[];
  source: 'ai' | 'local';
}

export interface ServicePackage {
  name: string;          // 'Basic' | 'Standard' | 'Premium'
  price: number;
  delivery_days: number;
  features: string[];
}

export interface ProviderService {
  id: string;
  provider_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  starting_price: number;
  delivery_days: number;
  images: string[];
  faq: ServiceFAQ[];
  packages: ServicePackage[];
  portfolio_examples: string[];
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  /** Joined from provider_profiles via fk_ps_provider_profile */
  provider_profile?: Pick<ProviderProfile, 'trust_score' | 'trust_level' | 'rating' | 'review_count' | 'is_available'> | null;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  category_id: string;
  title: string;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  address: string | null;
  budget: number | null;
  status: RequestStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  // Service-specific request extras (Part 9)
  service_id: string | null;
  target_provider_id: string | null;
  deadline_date: string | null;
  attachments: string[];
  // Joined fields
  category?: Category;
  client?: Profile;
  service?: ProviderService;
}

export interface Booking {
  id: string;
  request_id: string;
  service_id?: string | null;
  provider_id: string;
  client_id: string;
  status: BookingStatus;
  project_status: ProjectStatus;
  price: number | null;
  notes: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  request?: ServiceRequest;
  provider?: Profile;
  client?: Profile;
  provider_profile?: ProviderProfile;
}

// All possible category rating keys (union of provider + client categories)
export interface CategoryRatings {
  // Provider (worker) categories
  quality?: number;            // 1-5
  communication?: number;      // 1-5
  reliability?: number;        // 1-5
  professionalism?: number;    // 1-5
  timeliness?: number;         // 1-5
  // Client categories
  fairness?: number;           // 1-5
  payment_reliability?: number; // 1-5
}

// ── Provider category config ──────────────────────────────────

export const CATEGORY_RATING_KEYS: (keyof CategoryRatings)[] = [
  'quality',
  'communication',
  'reliability',
  'professionalism',
  'timeliness',
];

export const CATEGORY_RATING_LABELS: Record<keyof CategoryRatings, string> = {
  quality:             'Quality of Work',
  communication:       'Communication',
  reliability:         'Reliability',
  professionalism:     'Professionalism',
  timeliness:          'Timeliness',
  fairness:            'Fairness',
  payment_reliability: 'Payment Reliability',
};

export const CATEGORY_RATING_ICONS: Record<keyof CategoryRatings, string> = {
  quality:             'ribbon-outline',
  communication:       'chatbubble-ellipses-outline',
  reliability:         'shield-checkmark-outline',
  professionalism:     'briefcase-outline',
  timeliness:          'alarm-outline',
  fairness:            'scale-outline',
  payment_reliability: 'card-outline',
};

// ── Client category config ────────────────────────────────────

export const CLIENT_CATEGORY_RATING_KEYS: (keyof CategoryRatings)[] = [
  'communication',
  'fairness',
  'payment_reliability',
  'professionalism',
];

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  /** Which role was the reviewee in this booking. */
  reviewee_role: 'provider' | 'client';
  rating: number;
  comment: string | null;
  would_hire_again: boolean | null;
  category_ratings: CategoryRatings | null;
  created_at: string;
  // Joined fields
  reviewer?: Profile;
  reviewee?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'new_offer'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'booking_started'
  | 'booking_completed'
  | 'new_review'
  | 'new_message'
  | 'request_cancelled';

export type DeliverableStatus = 'submitted' | 'under_review' | 'approved' | 'revision_requested';
export type DeliverableFileType = 'image' | 'video' | 'pdf' | 'document' | 'zip' | 'other';

export interface Deliverable {
  id: string;
  booking_id: string;
  uploader_id: string;
  file_name: string;
  file_url: string;
  file_type: DeliverableFileType;
  file_size: number | null;
  status: DeliverableStatus;
  notes: string | null;
  created_at: string;
  // Joined
  uploader?: Profile;
}

// ── Project Timeline ─────────────────────────────────────────

export type ProjectEventType =
  | 'project_created'
  | 'offer_sent'
  | 'offer_accepted'
  | 'work_started'
  | 'deliverable_submitted'
  | 'revision_requested'
  | 'deliverable_approved'
  | 'project_completed'
  | 'project_cancelled'
  | 'review_left';

export interface ProjectEvent {
  id: string;
  booking_id: string;
  event_type: ProjectEventType;
  title: string;
  detail: string | null;
  icon: string;
  color: string;
  actor_id: string | null;
  actor_role: 'client' | 'provider' | 'system' | null;
  metadata: Record<string, any>;
  created_at: string;
  // Joined
  actor?: Profile;
}

// ── Messaging ────────────────────────────────────────────────

/** The business reason that opened a conversation. */
export type ConversationContextType =
  | 'job_application'   // provider applied to a posted request
  | 'service_inquiry'   // client contacted a service listing
  | 'invitation'        // client invited a specific provider
  | 'offer_accepted'    // both parties agreed to proceed
  | 'project_started';  // booking moved to in_progress

export const CONVERSATION_CONTEXT_META: Record<
  ConversationContextType,
  { label: string; icon: string; color: string; description: string }
> = {
  job_application: {
    label: 'Job Application',
    icon: 'document-text-outline',
    color: '#8B5CF6',
    description: 'Started when a worker applied to your request',
  },
  service_inquiry: {
    label: 'Service Inquiry',
    icon: 'search-outline',
    color: '#3B82F6',
    description: 'Started when you inquired about a service',
  },
  invitation: {
    label: 'Invitation',
    icon: 'mail-outline',
    color: '#F59E0B',
    description: 'Started when you invited this worker',
  },
  offer_accepted: {
    label: 'Offer Accepted',
    icon: 'checkmark-circle-outline',
    color: '#10B981',
    description: 'Started when both parties agreed to proceed',
  },
  project_started: {
    label: 'Active Project',
    icon: 'construct-outline',
    color: '#6C47FF',
    description: 'Work is currently in progress',
  },
};

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  /** Business context that opened this conversation */
  context_type: ConversationContextType | null;
  /** Human-readable context label, e.g. "Lawn Mowing · Jun 22" */
  context_label: string | null;
  /** True for automated system events (not user-authored) */
  is_system: boolean;
  /** Ionicons name shown next to system messages */
  system_icon: string | null;
  created_at: string;
  // Joined fields
  sender?: Profile;
}

/** One row from the conversations view — used for the inbox list */
export interface ConversationSummary {
  booking_id: string;
  provider_id: string;
  client_id: string;
  booking_status: string;
  project_status: ProjectStatus;
  // Project financials & timeline
  booking_price: number | null;
  request_budget: number | null;
  deadline_date: string | null;
  scheduled_at: string | null;
  address: string | null;
  // Context
  context_type: ConversationContextType;
  context_label: string;
  // Last message preview
  last_message: string | null;
  last_sender_id: string | null;
  last_message_at: string | null;
  last_is_system: boolean;
  // Participants
  provider_name: string;
  provider_avatar: string | null;
  client_name: string;
  client_avatar: string | null;
  // Project info
  project_title: string;
  category_name: string | null;
  conversation_started_at: string;
}

// ── App State / UI Types ─────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  providerProfile: ProviderProfile | null;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface ProviderWithProfile extends Profile {
  provider_profile: ProviderProfile;
  distance_km?: number;
}

// ── Navigation Param Lists ───────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

export type ClientTabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  RequestsTab: undefined;
  ServicesTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  TrustCenter: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Category: { categoryId: string; categoryName: string };
  ProviderProfile: { providerId: string };
  PostRequest: { categoryId?: string };
  RequestDetail: { requestId: string };
  Booking: { bookingId: string };
  Chat: { bookingId: string; otherUserName: string; contextType: ConversationContextType; contextLabel: string };
  Review: { bookingId: string; revieweeId: string; revieweeName: string; reviewerRole: 'client' | 'provider' };
  PortfolioDetail: { items: PortfolioItem[]; initialIndex: number; ownerName: string };
  ServicesBrowse: { initialCategoryId?: string; initialQuery?: string } | undefined;
  ServiceDetail: { service: ProviderService };
  SavedServices: undefined;
  RequestService: { service: ProviderService };
};

export type ExploreStackParamList = {
  Explore: undefined;
  Category: { categoryId: string; categoryName: string };
  ProviderProfile: { providerId: string };
  PostRequest: { categoryId?: string };
  ServicesBrowse: { initialCategoryId?: string; initialQuery?: string } | undefined;
  ServiceDetail: { service: ProviderService };
  SavedServices: undefined;
  RequestService: { service: ProviderService };
};

export type RequestStackParamList = {
  Requests: undefined;
  RequestDetail: { requestId: string };
  Booking: { bookingId: string };
  Chat: { bookingId: string; otherUserName: string; contextType: ConversationContextType; contextLabel: string };
  Review: { bookingId: string; revieweeId: string; revieweeName: string; reviewerRole: 'client' | 'provider' };
};

export type ProviderTabParamList = {
  ProviderHomeTab: undefined;
  NearbyRequestsTab: undefined;
  MyOffersTab: undefined;
  ProviderServicesTab: undefined;
  ProviderMessagesTab: undefined;
  ProviderProfileTab: undefined;
};

export type InboxStackParamList = {
  Inbox: undefined;
  Chat: { bookingId: string; otherUserName: string; contextType: ConversationContextType; contextLabel: string };
  Notifications: undefined;
};

export type ServiceSortOrder = 'recommended' | 'highest_rated' | 'most_popular' | 'newest';
export type ServiceTrustLevel = 'any' | 'medium' | 'high';

export interface ServiceFilters {
  categoryId: string | null;
  minPrice: string;
  maxPrice: string;
  minRating: number;
  trustLevel: ServiceTrustLevel;
  maxDeliveryDays: number;
  nearMe: boolean;
}

export const DEFAULT_SERVICE_FILTERS: ServiceFilters = {
  categoryId: null,
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  trustLevel: 'any',
  maxDeliveryDays: 0,
  nearMe: false,
};

export type ServicesStackParamList = {
  MyServices: undefined;
  CreateEditService: { service?: ProviderService };
  ServiceDetail: { service: ProviderService };
  ServicesBrowse: { initialCategoryId?: string; initialQuery?: string } | undefined;
  SavedServices: undefined;
  ServiceAnalysis: { service: ProviderService };
  RequestService: { service: ProviderService };
  ServiceRequests: undefined;
  Booking: { bookingId: string };
  ProviderProfile: { providerId: string };
};

// ── Request form multi-step ──────────────────────────────────
export interface PostRequestFormData {
  categoryId: string;
  title: string;
  description: string;
  budget: string;
  address: string;
  location_lat: number | null;
  location_lng: number | null;
  scheduled_at: Date | null;
}
