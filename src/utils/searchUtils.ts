export interface Suggestion {
  label: string;
  icon: string;
  popularity: number; // higher = more popular, used for ranking
}

// Master suggestion catalogue with popularity scores
const SUGGESTIONS: Suggestion[] = [
  // Cleaning (popularity 95)
  { label: 'House Cleaning', icon: '🧹', popularity: 95 },
  { label: 'Deep Cleaning', icon: '✨', popularity: 80 },

  // Plumbing (popularity 90)
  { label: 'Plumbing', icon: '🔧', popularity: 90 },
  { label: 'Pipe Repair', icon: '🔧', popularity: 70 },

  // Electrical (popularity 85)
  { label: 'Electrical Work', icon: '⚡', popularity: 85 },

  // Moving (popularity 88)
  { label: 'Moving Help', icon: '📦', popularity: 88 },
  { label: 'Furniture Moving', icon: '📦', popularity: 72 },
  { label: 'Packing Help', icon: '📦', popularity: 65 },

  // Handyman (popularity 87)
  { label: 'Handyman', icon: '🔨', popularity: 87 },
  { label: 'Home Repairs', icon: '🔨', popularity: 78 },
  { label: 'Painting', icon: '🖌️', popularity: 74 },
  { label: 'Carpentry', icon: '🔨', popularity: 66 },

  // Delivery (popularity 83)
  { label: 'Delivery', icon: '🚲', popularity: 83 },
  { label: 'Errands', icon: '🚲', popularity: 71 },
  { label: 'Courier', icon: '🚲', popularity: 60 },

  // Tutoring (popularity 82)
  { label: 'Tutoring', icon: '📚', popularity: 82 },
  { label: 'Homework Help', icon: '📚', popularity: 79 },
  { label: 'Academic Coaching', icon: '📚', popularity: 68 },
  { label: 'Math Tutoring', icon: '📚', popularity: 75 },
  { label: 'Science Tutoring', icon: '📚', popularity: 64 },

  // Pet Care (popularity 84)
  { label: 'Dog Walking', icon: '🐾', popularity: 84 },
  { label: 'Pet Sitting', icon: '🐾', popularity: 81 },
  { label: 'Pet Care', icon: '🐾', popularity: 76 },
  { label: 'Dog Grooming', icon: '🐾', popularity: 67 },
  { label: 'Cat Sitting', icon: '🐾', popularity: 62 },

  // Gardening / Landscaping (popularity 77)
  { label: 'Lawn Care', icon: '🌿', popularity: 77 },
  { label: 'Yard Work', icon: '🌿', popularity: 75 },
  { label: 'Landscaping', icon: '🌿', popularity: 72 },
  { label: 'Gardening', icon: '🌿', popularity: 69 },
  { label: 'Outdoor Maintenance', icon: '🌿', popularity: 63 },
  { label: 'Mowing', icon: '🌿', popularity: 70 },

  // Video / Content Creation (popularity 76)
  { label: 'Video Editing', icon: '🎬', popularity: 76 },
  { label: 'Content Creation', icon: '🎬', popularity: 74 },
  { label: 'TikTok Editing', icon: '🎬', popularity: 73 },
  { label: 'YouTube Editing', icon: '🎬', popularity: 71 },
  { label: 'Videography', icon: '🎬', popularity: 65 },

  // Photography
  { label: 'Photography', icon: '📷', popularity: 74 },
  { label: 'Photo Editing', icon: '📷', popularity: 66 },
  { label: 'Event Photography', icon: '📷', popularity: 63 },

  // Cooking / Chef
  { label: 'Meal Prep', icon: '🍳', popularity: 73 },
  { label: 'Personal Chef', icon: '🍳', popularity: 68 },
  { label: 'Catering', icon: '🍳', popularity: 65 },

  // Fitness
  { label: 'Personal Training', icon: '💪', popularity: 78 },
  { label: 'Fitness Coaching', icon: '💪', popularity: 67 },

  // IT / Tech
  { label: 'IT Support', icon: '💻', popularity: 72 },
  { label: 'Computer Repair', icon: '💻', popularity: 70 },
  { label: 'Tech Support', icon: '💻', popularity: 68 },
];

// Keyword triggers: maps partial input strings to suggestion labels
const SUGGESTION_TRIGGERS: Record<string, string[]> = {
  // Video
  vid: ['Video Editing', 'Content Creation', 'TikTok Editing', 'YouTube Editing', 'Videography'],
  video: ['Video Editing', 'Content Creation', 'TikTok Editing', 'YouTube Editing', 'Videography'],
  tik: ['TikTok Editing', 'Content Creation', 'Video Editing'],
  tiktok: ['TikTok Editing', 'Content Creation', 'Video Editing'],
  youtube: ['YouTube Editing', 'Video Editing', 'Content Creation'],
  content: ['Content Creation', 'Video Editing', 'TikTok Editing', 'YouTube Editing'],

  // Dog / Pet
  dog: ['Dog Walking', 'Pet Sitting', 'Dog Grooming', 'Pet Care'],
  pet: ['Pet Care', 'Dog Walking', 'Pet Sitting', 'Cat Sitting', 'Dog Grooming'],
  cat: ['Cat Sitting', 'Pet Sitting', 'Pet Care'],
  paw: ['Dog Walking', 'Pet Sitting', 'Pet Care'],
  groom: ['Dog Grooming', 'Pet Care'],

  // Teaching / Tutoring
  teach: ['Tutoring', 'Homework Help', 'Academic Coaching'],
  tutor: ['Tutoring', 'Homework Help', 'Academic Coaching', 'Math Tutoring', 'Science Tutoring'],
  homework: ['Homework Help', 'Tutoring', 'Academic Coaching'],
  academic: ['Academic Coaching', 'Tutoring', 'Homework Help'],
  math: ['Math Tutoring', 'Tutoring', 'Homework Help'],
  science: ['Science Tutoring', 'Tutoring', 'Homework Help'],
  lesson: ['Tutoring', 'Academic Coaching', 'Homework Help'],

  // Gardening
  garden: ['Gardening', 'Lawn Care', 'Yard Work', 'Landscaping'],
  gardener: ['Gardening', 'Lawn Care', 'Yard Work', 'Landscaping', 'Outdoor Maintenance'],
  lawn: ['Lawn Care', 'Yard Work', 'Landscaping', 'Mowing'],
  yard: ['Yard Work', 'Lawn Care', 'Landscaping', 'Outdoor Maintenance'],
  landscape: ['Landscaping', 'Lawn Care', 'Yard Work', 'Outdoor Maintenance'],
  mow: ['Mowing', 'Lawn Care', 'Yard Work'],

  // Cleaning
  clean: ['House Cleaning', 'Deep Cleaning'],
  maid: ['House Cleaning', 'Deep Cleaning'],
  housekeep: ['House Cleaning', 'Deep Cleaning'],

  // Moving
  mov: ['Moving Help', 'Furniture Moving', 'Packing Help'],
  move: ['Moving Help', 'Furniture Moving', 'Packing Help'],
  pack: ['Packing Help', 'Moving Help'],
  furni: ['Furniture Moving', 'Moving Help'],

  // Handyman / Repair
  hand: ['Handyman', 'Home Repairs'],
  repair: ['Home Repairs', 'Handyman', 'Plumbing', 'Electrical Work'],
  fix: ['Handyman', 'Home Repairs', 'Plumbing'],
  paint: ['Painting', 'Handyman', 'Home Repairs'],
  carp: ['Carpentry', 'Handyman'],

  // Plumbing
  plumb: ['Plumbing', 'Pipe Repair'],
  pipe: ['Plumbing', 'Pipe Repair'],
  leak: ['Plumbing', 'Pipe Repair'],
  drain: ['Plumbing', 'Pipe Repair'],

  // Electrical
  electr: ['Electrical Work'],
  wir: ['Electrical Work'],

  // Delivery
  deliv: ['Delivery', 'Errands', 'Courier'],
  errand: ['Errands', 'Delivery', 'Courier'],
  courier: ['Courier', 'Delivery', 'Errands'],

  // Photography
  photo: ['Photography', 'Photo Editing', 'Event Photography'],
  photog: ['Photography', 'Event Photography', 'Photo Editing'],

  // Cooking
  chef: ['Personal Chef', 'Meal Prep', 'Catering'],
  cook: ['Meal Prep', 'Personal Chef', 'Catering'],
  meal: ['Meal Prep', 'Personal Chef', 'Catering'],
  cater: ['Catering', 'Meal Prep', 'Personal Chef'],

  // Fitness
  train: ['Personal Training', 'Fitness Coaching'],
  fit: ['Fitness Coaching', 'Personal Training'],
  workout: ['Personal Training', 'Fitness Coaching'],
  gym: ['Personal Training', 'Fitness Coaching'],

  // IT
  tech: ['IT Support', 'Tech Support', 'Computer Repair'],
  'it ': ['IT Support', 'Tech Support', 'Computer Repair'],
  comput: ['Computer Repair', 'IT Support', 'Tech Support'],
};

/**
 * Returns ranked suggestions for a partial query string.
 * Max 5 results, ranked by popularity score.
 */
export function getSuggestions(query: string): Suggestion[] {
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 2) return [];

  const matchedLabels = new Set<string>();

  // Check each trigger key — if the query starts with or contains the trigger
  for (const [trigger, labels] of Object.entries(SUGGESTION_TRIGGERS)) {
    if (normalized.startsWith(trigger) || trigger.startsWith(normalized)) {
      labels.forEach((l) => matchedLabels.add(l));
    }
  }

  // Also do a direct label substring match for any unmatched cases
  for (const s of SUGGESTIONS) {
    if (s.label.toLowerCase().includes(normalized)) {
      matchedLabels.add(s.label);
    }
  }

  const suggestionMap = new Map(SUGGESTIONS.map((s) => [s.label, s]));
  return Array.from(matchedLabels)
    .map((label) => suggestionMap.get(label))
    .filter((s): s is Suggestion => s !== undefined)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5);
}

// Intent-based keyword synonym mappings
const SYNONYM_MAP: Record<string, string[]> = {
  // Cleaning
  cleaning: ['cleaning', 'cleaner', 'clean', 'house cleaning', 'maid', 'housekeeping', 'janitorial', 'sanitation', 'tidy', 'tidying'],
  maid: ['cleaning', 'cleaner', 'maid', 'housekeeping'],
  housekeeper: ['cleaning', 'housekeeping', 'maid'],

  // Plumbing
  plumbing: ['plumbing', 'plumber', 'pipe', 'pipes', 'leak', 'drain', 'faucet', 'toilet', 'water heater'],
  plumber: ['plumbing', 'plumber', 'pipe', 'drain'],
  leak: ['plumbing', 'leak', 'pipe'],

  // Electrical
  electrical: ['electrical', 'electrician', 'wiring', 'outlet', 'circuit', 'breaker', 'lighting', 'electric'],
  electrician: ['electrical', 'electrician', 'wiring', 'outlet'],
  wiring: ['electrical', 'wiring', 'electrician'],

  // Moving
  moving: ['moving', 'mover', 'movers', 'relocation', 'move', 'packing', 'hauling', 'furniture moving', 'loading', 'unloading'],
  mover: ['moving', 'mover', 'relocation', 'hauling'],
  relocation: ['moving', 'relocation', 'mover'],
  packing: ['moving', 'packing', 'mover'],

  // Handyman
  handyman: ['handyman', 'repairs', 'repair', 'fix', 'maintenance', 'home repair', 'odd jobs', 'carpentry', 'painting', 'drywall'],
  repair: ['handyman', 'repair', 'fix', 'maintenance'],
  carpenter: ['handyman', 'carpentry', 'carpenter', 'woodwork'],
  painting: ['handyman', 'painting', 'painter', 'paint'],
  painter: ['handyman', 'painter', 'painting', 'paint'],

  // Delivery
  delivery: ['delivery', 'deliver', 'courier', 'shipping', 'errand', 'errands', 'pickup', 'dropoff', 'transport'],
  courier: ['delivery', 'courier', 'shipping'],
  errand: ['delivery', 'errand', 'errands'],

  // Tutoring / Teaching
  tutoring: ['tutoring', 'tutor', 'teacher', 'teaching', 'homework help', 'academic coaching', 'education', 'lessons', 'study help', 'math help', 'science help', 'english help'],
  tutor: ['tutoring', 'tutor', 'teacher', 'homework help', 'academic coaching'],
  teacher: ['tutoring', 'tutor', 'teacher', 'teaching', 'homework help', 'academic coaching', 'education', 'lessons'],
  'homework help': ['tutoring', 'homework help', 'tutor'],
  'academic coaching': ['tutoring', 'academic coaching', 'tutor'],
  education: ['tutoring', 'education', 'teacher', 'lessons'],
  lessons: ['tutoring', 'lessons', 'teacher', 'tutor'],

  // Pet Care
  'pet care': ['pet care', 'pet', 'dog walker', 'dog walking', 'dog sitting', 'cat sitting', 'pet sitting', 'grooming', 'vet'],
  'pet sitting': ['pet care', 'pet sitting', 'pet', 'dog sitting', 'cat sitting'],
  'dog walker': ['pet care', 'dog walker', 'dog walking', 'pet'],
  grooming: ['pet care', 'grooming', 'dog grooming', 'pet'],

  // Gardening / Landscaping
  gardener: ['yard work', 'lawn care', 'landscaping', 'outdoor maintenance', 'gardening', 'garden', 'mowing', 'trimming', 'weeding', 'planting'],
  gardening: ['yard work', 'lawn care', 'landscaping', 'gardening', 'garden', 'outdoor maintenance'],
  'yard work': ['yard work', 'lawn care', 'landscaping', 'outdoor maintenance', 'gardening', 'mowing'],
  'lawn care': ['lawn care', 'yard work', 'landscaping', 'mowing', 'gardening'],
  landscaping: ['landscaping', 'yard work', 'lawn care', 'outdoor maintenance', 'gardening'],
  mowing: ['lawn care', 'yard work', 'mowing', 'landscaping'],

  // Video / Content Creation
  'video creator': ['video editing', 'content creation', 'tiktok editing', 'youtube editing', 'videography', 'filming', 'video production'],
  videography: ['video editing', 'videography', 'filming', 'video production', 'content creation'],
  'video editing': ['video editing', 'content creation', 'tiktok editing', 'youtube editing', 'videography'],
  'content creation': ['content creation', 'video editing', 'tiktok editing', 'youtube editing', 'social media'],
  'social media': ['content creation', 'social media', 'tiktok editing', 'youtube editing'],

  // Photography
  photographer: ['photography', 'photographer', 'photo editing', 'portraits', 'event photography'],
  photography: ['photography', 'photographer', 'photo editing', 'portraits'],

  // Cooking / Chef
  chef: ['cooking', 'chef', 'meal prep', 'catering', 'personal chef', 'baker'],
  cooking: ['cooking', 'chef', 'meal prep', 'catering', 'personal chef'],
  catering: ['catering', 'cooking', 'chef', 'meal prep'],

  // Fitness / Personal Training
  trainer: ['personal training', 'fitness', 'trainer', 'workout', 'personal trainer', 'gym'],
  'personal trainer': ['personal training', 'fitness', 'trainer', 'workout'],
  fitness: ['fitness', 'personal training', 'trainer', 'workout'],

  // IT / Tech
  tech: ['it support', 'tech support', 'computer repair', 'technology', 'tech', 'it help'],
  'it support': ['it support', 'tech support', 'computer repair', 'technology'],
  'computer repair': ['computer repair', 'it support', 'tech support'],
};

/**
 * Expands a search query into a set of related terms using synonym mappings.
 * Returns the original term plus all synonyms found.
 */
export function expandSearchTerms(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const terms = new Set<string>([normalized]);

  // Check full phrase match
  if (SYNONYM_MAP[normalized]) {
    SYNONYM_MAP[normalized].forEach((t) => terms.add(t.toLowerCase()));
  }

  // Check individual words in the query
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (SYNONYM_MAP[word]) {
      SYNONYM_MAP[word].forEach((t) => terms.add(t.toLowerCase()));
    }
  }

  // Check if any synonym key contains the query as a substring
  for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      synonyms.forEach((t) => terms.add(t.toLowerCase()));
    }
  }

  return Array.from(terms);
}

/**
 * Checks if a text value matches any of the expanded search terms.
 */
export function matchesSearch(text: string, expandedTerms: string[]): boolean {
  const lower = text.toLowerCase();
  return expandedTerms.some((term) => lower.includes(term));
}

/**
 * Returns a human-readable label for the search results header.
 * If synonyms were added, shows "related to X", otherwise just the query.
 */
export function getSearchLabel(query: string, expandedTerms: string[]): string {
  if (!query.trim()) return '';
  const normalized = query.toLowerCase().trim();
  const hasExpansion = expandedTerms.some((t) => t !== normalized);
  return hasExpansion ? `Showing results related to "${query}"` : `Results for "${query}"`;
}

// ── Popular Categories (static fallback) ─────────────────────

export const POPULAR_CATEGORIES = [
  { id: 'c1', name: 'Cleaning', color: '#6C47FF', icon: 'sparkles' },
  { id: 'c2', name: 'Plumbing', color: '#3B82F6', icon: 'water' },
  { id: 'c3', name: 'Electrical', color: '#F59E0B', icon: 'flash' },
  { id: 'c4', name: 'Moving', color: '#10B981', icon: 'cube' },
  { id: 'c5', name: 'Handyman', color: '#FF6B35', icon: 'hammer' },
  { id: 'c6', name: 'Delivery', color: '#EC4899', icon: 'bicycle' },
  { id: 'c7', name: 'Tutoring', color: '#8B5CF6', icon: 'book' },
  { id: 'c8', name: 'Pet Care', color: '#14B8A6', icon: 'paw' },
];

// ── Trending Searches ────────────────────────────────────────

export const TRENDING_SEARCHES = [
  'Lawn Care',
  'Dog Walking',
  'Tutoring',
  'House Cleaning',
  'Handyman',
  'Moving Help',
  'Personal Training',
  'Video Editing',
  'Meal Prep',
  'IT Support',
];

// ── Relevance Scoring ────────────────────────────────────────

export type MatchType = 'exact' | 'related' | 'similar';

export interface RelevanceResult {
  score: number;       // 0–100
  matchType: MatchType;
  label: string;       // "Exact Match" | "Related Match" | "Similar Opportunity"
  percent: string;     // e.g. "94%"
}

interface ScoringOptions {
  query: string;
  expandedTerms: string[];
  /** Haystack texts to test (title, skills, category name, bio, etc.) */
  texts: string[];
  /** 0–5 rating, or null if unknown */
  rating?: number | null;
  /** Number of reviews */
  reviewCount?: number;
  /** Distance in km, or null if unavailable */
  distanceKm?: number | null;
  /** ISO date string of creation */
  createdAt?: string;
  /** Popularity score 0–100 if known */
  popularity?: number;
  /** Trust score 0–100 from provider_profiles.trust_score */
  trustScore?: number | null;
  /** Trust level 1–5 from provider_profiles.trust_level */
  trustLevel?: number | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreResult(opts: ScoringOptions): RelevanceResult {
  const normalized = opts.query.toLowerCase().trim();
  const allText = opts.texts.join(' ').toLowerCase();

  // ── 1. Keyword match (35 pts) ──────────────────────────────
  let keywordScore = 0;
  let isExact = false;

  if (normalized && allText.includes(normalized)) {
    keywordScore = 35;
    isExact = true;
  } else if (normalized) {
    const matchedTerms = opts.expandedTerms.filter((t) => t !== normalized && allText.includes(t));
    if (matchedTerms.length > 0) {
      // Partial credit proportional to how many expanded terms hit
      keywordScore = Math.min(26, 13 + matchedTerms.length * 4);
    } else {
      // No direct term match but still in results via category expansion — base credit
      keywordScore = 7;
    }
  } else {
    // No query at all — neutral
    keywordScore = 17;
  }

  // ── 2. Trust Score (20 pts) ───────────────────────────────
  // Trust is the #2 ranking signal — high-trust workers deserve better placement
  let trustScorePoints = 0;
  if (opts.trustScore != null) {
    // Base: trust_score 0–100 → 0–16 pts
    trustScorePoints = (opts.trustScore / 100) * 16;
    // Level bonus: extra 1 pt per level above 1 (up to +4 pts at level 5)
    if (opts.trustLevel != null && opts.trustLevel > 1) {
      trustScorePoints += (opts.trustLevel - 1);
    }
    trustScorePoints = Math.min(20, trustScorePoints);
  } else {
    // Unknown trust — give neutral 10 pts (don't penalize new providers)
    trustScorePoints = 10;
  }

  // ── 3. Rating (15 pts) ────────────────────────────────────
  const rating = opts.rating ?? 0;
  const reviewCount = opts.reviewCount ?? 0;
  // Weight rating by review count confidence (plateaus at 10 reviews)
  const confidence = Math.min(reviewCount / 10, 1);
  const ratingScore = (rating / 5) * 15 * (0.4 + 0.6 * confidence);

  // ── 4. Distance (15 pts) ──────────────────────────────────
  let distScore = 15; // assume nearby if unknown
  if (opts.distanceKm != null) {
    // Full score ≤2 km, zero score at 50 km
    distScore = Math.max(0, 15 * (1 - opts.distanceKm / 50));
  }

  // ── 5. Recency (10 pts) ───────────────────────────────────
  let recencyScore = 10;
  if (opts.createdAt) {
    const ageMs = Date.now() - new Date(opts.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    // Full score if <1 day old, linear decay to 0 at 30 days
    recencyScore = Math.max(0, 10 * (1 - ageDays / 30));
  }

  // ── 6. Popularity (5 pts) ─────────────────────────────────
  const popularityScore = ((opts.popularity ?? 70) / 100) * 5;

  // ── Total ─────────────────────────────────────────────────
  const raw = keywordScore + trustScorePoints + ratingScore + distScore + recencyScore + popularityScore;
  // Clamp to 40–100 so results always look meaningful
  const score = Math.round(Math.min(100, Math.max(40, raw)));

  let matchType: MatchType;
  let label: string;
  if (isExact) {
    matchType = 'exact';
    label = 'Exact Match';
  } else if (keywordScore >= 15) {
    matchType = 'related';
    label = 'Related Match';
  } else {
    matchType = 'similar';
    label = 'Similar Opportunity';
  }

  return { score, matchType, label, percent: `${score}%` };
}

/**
 * Scores and sorts an array of items by relevance.
 * `getTexts` extracts the searchable strings from each item.
 * Returns items with their relevance attached.
 */
export function rankByRelevance<T extends object>(
  items: T[],
  query: string,
  expandedTerms: string[],
  getOpts: (item: T) => Omit<ScoringOptions, 'query' | 'expandedTerms'>,
): (T & { relevance: RelevanceResult })[] {
  return items
    .map((item) => ({
      ...item,
      relevance: scoreResult({ query, expandedTerms, ...getOpts(item) }),
    }))
    .sort((a, b) => b.relevance.score - a.relevance.score);
}

// ── Service-specific search utilities ───────────────────────

import { ProviderService } from '../types';

/**
 * Scores a single ProviderService against a query for relevance ranking.
 * Used by ServicesBrowseScreen when sort = 'recommended' and query is active.
 */
export function scoreService(
  service: ProviderService,
  query: string,
  expandedTerms: string[],
): RelevanceResult {
  return scoreResult({
    query,
    expandedTerms,
    texts: [
      service.title,
      service.description ?? '',
      service.category?.name ?? '',
    ],
    rating: service.rating,
    reviewCount: service.review_count,
    createdAt: service.created_at,
    popularity: Math.min(100, service.review_count * 5 + service.rating * 10),
    trustScore: service.provider_profile?.trust_score ?? null,
    trustLevel: service.provider_profile?.trust_level ?? null,
  });
}

/**
 * Filters services by text query using expanded search terms.
 * Matches against title, description, and category name.
 */
export function filterServicesByQuery(
  services: ProviderService[],
  expandedTerms: string[],
): ProviderService[] {
  if (expandedTerms.length === 0 || (expandedTerms.length === 1 && expandedTerms[0] === '')) {
    return services;
  }
  return services.filter((s) =>
    matchesSearch(s.title, expandedTerms) ||
    matchesSearch(s.description ?? '', expandedTerms) ||
    matchesSearch(s.category?.name ?? '', expandedTerms),
  );
}
