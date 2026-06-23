import { Colors } from './colors';
import { PublicProfile, Review, ProviderProfile } from '../types';

// ── Tiers ─────────────────────────────────────────────────────

export type TrustTier = 'new' | 'building' | 'trusted' | 'top';

export interface TrustMeta {
  tier:  TrustTier;
  label: string;
  color: string;
  bg:    string;
  icon:  string;  // Ionicons name
}

export function trustLabel(score: number): TrustMeta {
  if (score >= 80) return { tier: 'top',      label: 'Top Trusted',    color: Colors.success, bg: Colors.successLight, icon: 'shield-checkmark' };
  if (score >= 55) return { tier: 'trusted',  label: 'Trusted',        color: Colors.info,    bg: Colors.infoLight,   icon: 'shield-half'      };
  if (score >= 30) return { tier: 'building', label: 'Building Trust', color: Colors.warning, bg: Colors.warningLight,icon: 'shield-outline'   };
  return                  { tier: 'new',      label: 'New Member',     color: Colors.muted,   bg: Colors.border,      icon: 'shield-outline'   };
}

// ── Trust Levels ─────────────────────────────────────────────

export type TrustLevelNum = 1 | 2 | 3 | 4 | 5;

export interface TrustLevelDef {
  level:      TrustLevelNum;
  name:       string;
  minScore:   number;  // score >= minScore qualifies for this level
  maxScore:   number;  // score < maxScore (or 100 for L5)
  icon:       string;  // Ionicons name
  color:      string;
  bg:         string;
  description: string;
  perks:      string[];
}

export const TRUST_LEVELS: TrustLevelDef[] = [
  {
    level: 1, name: 'New Worker',        minScore: 0,  maxScore: 30,
    icon: 'person-circle-outline',  color: Colors.muted,    bg: Colors.border,
    description: 'Just getting started on TeenWorks.',
    perks: ['Post services', 'Bid on requests', 'Build your profile'],
  },
  {
    level: 2, name: 'Trusted Worker',    minScore: 30, maxScore: 55,
    icon: 'shield-half',            color: Colors.info,     bg: Colors.infoLight,
    description: 'Established trust with early clients.',
    perks: ['Trusted badge on profile', 'Priority placement in search', 'Access to more requests'],
  },
  {
    level: 3, name: 'Verified Pro',      minScore: 55, maxScore: 75,
    icon: 'shield-checkmark',       color: Colors.primary,  bg: Colors.primaryLight,
    description: 'Consistently delivering quality work.',
    perks: ['Verified Pro badge', 'Featured in Top Providers', 'Reduced platform fee', 'Profile highlight'],
  },
  {
    level: 4, name: 'Elite Worker',      minScore: 75, maxScore: 90,
    icon: 'ribbon',                 color: '#F59E0B',        bg: '#FEF3C7',
    description: 'Top-tier reputation — clients hire with confidence.',
    perks: ['Elite badge + gold border', 'Early access to new features', 'Dedicated support', 'Boosted in search'],
  },
  {
    level: 5, name: 'TeenWorks Legend',  minScore: 90, maxScore: 101,
    icon: 'trophy',                 color: '#D97706',        bg: '#FDE68A',
    description: 'The highest honour on TeenWorks.',
    perks: ['Legend status + special flair', 'Featured on homepage', 'Custom profile banner', 'Free boosts every month', 'Direct contact with TeenWorks team'],
  },
];

/** Get the full level definition from a trust score. */
export function getTrustLevel(score: number): TrustLevelDef {
  for (let i = TRUST_LEVELS.length - 1; i >= 0; i--) {
    if (score >= TRUST_LEVELS[i].minScore) return TRUST_LEVELS[i];
  }
  return TRUST_LEVELS[0];
}

/** Get level def directly from level number (1–5). */
export function getTrustLevelByNum(level: TrustLevelNum): TrustLevelDef {
  return TRUST_LEVELS[level - 1];
}

export interface TrustLevelProgress {
  current:       TrustLevelDef;
  next:          TrustLevelDef | null;  // null at max level
  /** 0–1 progress toward next level's min score */
  progressPct:   number;
  pointsToNext:  number;              // 0 at max level
}

/** Compute progress within current level toward the next. */
export function getTrustLevelProgress(score: number): TrustLevelProgress {
  const current = getTrustLevel(score);
  const nextDef = current.level < 5 ? TRUST_LEVELS[current.level] : null; // level is 1-indexed

  if (!nextDef) {
    return { current, next: null, progressPct: 1, pointsToNext: 0 };
  }

  const rangeSize  = nextDef.minScore - current.minScore;
  const earned     = score - current.minScore;
  const progressPct = Math.min(1, earned / rangeSize);
  const pointsToNext = Math.max(0, nextDef.minScore - score);

  return { current, next: nextDef, progressPct, pointsToNext };
}

// ── Factor model ──────────────────────────────────────────────

export interface TrustFactor {
  id:     string;
  label:  string;
  icon:   string;        // Ionicons name
  score:  number;        // 0–100 for this individual factor
  weight: number;        // % contribution to final score (all weights sum to 100)
  detail: string;        // current state summary
  tip:    string | null; // actionable improvement tip (null when score >= 80)
}

export interface TrustBreakdown {
  score:   number;        // final weighted 0–100
  factors: TrustFactor[];
}

// ── Individual factor scorers ─────────────────────────────────

/** Reviews score (0–100): avg rating × volume dampener × 70% + would-hire-again × 30% */
function reviewsScore(reviews: Review[]): { score: number; detail: string; tip: string | null } {
  const provRevs = reviews.filter((r) => r.reviewee_role === 'provider' || !r.reviewee_role);
  const count = provRevs.length;

  if (count === 0) {
    return { score: 0, detail: 'No reviews yet', tip: 'Complete your first job to earn reviews' };
  }

  const avgRating = provRevs.reduce((s, r) => s + r.rating, 0) / count;
  const volumeDampen = Math.min(count / 3, 1);             // full weight at 3+ reviews
  const ratingScore = (avgRating / 5) * 70 * volumeDampen; // up to 70 pts

  const opinionated = provRevs.filter((r) => r.would_hire_again !== null);
  const hireAgainPct = opinionated.length > 0
    ? opinionated.filter((r) => r.would_hire_again).length / opinionated.length
    : 0;
  const hireScore = opinionated.length >= 3 ? hireAgainPct * 30 : 0; // up to 30 pts

  const score = Math.min(100, Math.round(ratingScore + hireScore));

  const detail = opinionated.length >= 3
    ? `${avgRating.toFixed(1)}★ · ${count} review${count !== 1 ? 's' : ''} · ${Math.round(hireAgainPct * 100)}% would hire again`
    : `${avgRating.toFixed(1)}★ · ${count} review${count !== 1 ? 's' : ''}`;

  const tip = score < 80
    ? avgRating < 4.5
      ? 'Focus on quality — clients rate higher when you exceed expectations'
      : count < 10
      ? `${10 - count} more review${10 - count !== 1 ? 's' : ''} will maximize this score`
      : 'Keep delivering great work!'
    : null;

  return { score, detail, tip };
}

/** Reviews score from DB aggregates (no individual Review objects needed) */
function reviewsScoreFromAggregates(
  rating: number,
  reviewCount: number,
): { score: number; detail: string; tip: string | null } {
  if (reviewCount === 0) {
    return { score: 0, detail: 'No reviews yet', tip: 'Complete your first job to earn reviews' };
  }
  const volumeDampen = Math.min(reviewCount / 3, 1);
  const score = Math.min(100, Math.round((rating / 5) * 70 * volumeDampen));
  const detail = `${rating.toFixed(1)}★ · ${reviewCount} review${reviewCount !== 1 ? 's' : ''}`;
  const tip = score < 80 ? 'More high-rated jobs will improve this score' : null;
  return { score, detail, tip };
}

/** Completion rate score (0–100) */
function completionScore(
  completionRate: number,
  totalBookings: number,
): { score: number; detail: string; tip: string | null } {
  // New providers get benefit-of-the-doubt: 70
  if (totalBookings < 3) {
    return {
      score: 70,
      detail: totalBookings === 0 ? 'No bookings yet' : `${totalBookings} booking${totalBookings !== 1 ? 's' : ''} so far`,
      tip: 'Complete more jobs to establish your completion rate',
    };
  }

  const score = Math.min(100, Math.round(completionRate));
  return {
    score,
    detail: `${score}% of bookings completed (${totalBookings} total)`,
    tip: score < 80 ? 'Avoid cancellations — they lower this score significantly' : null,
  };
}

/** Response speed score (0–100) from avg_response_hours */
function responseScore(
  avgResponseHours: number | null,
  totalBookings: number,
): { score: number; detail: string; tip: string | null } {
  if (avgResponseHours === null || totalBookings === 0) {
    return { score: 60, detail: 'No response data yet', tip: 'Accept bookings quickly to build a fast response score' };
  }

  let score: number;
  let label: string;
  if      (avgResponseHours <  1)  { score = 100; label = 'Under 1 hour';  }
  else if (avgResponseHours <  4)  { score = 90;  label = 'Under 4 hours'; }
  else if (avgResponseHours < 12)  { score = 75;  label = 'Under 12 hours';}
  else if (avgResponseHours < 24)  { score = 60;  label = 'Under 1 day';   }
  else if (avgResponseHours < 48)  { score = 40;  label = 'Under 2 days';  }
  else                             { score = 20;  label = '2+ days';        }

  const hours = avgResponseHours < 24
    ? `${avgResponseHours.toFixed(1)}h avg`
    : `${(avgResponseHours / 24).toFixed(1)}d avg`;

  return {
    score,
    detail: `${label} — ${hours} response time`,
    tip: score < 80 ? 'Reply within 4 hours to reach a 90+ score' : null,
  };
}

/** Repeat clients score (0–100) */
function repeatScore(
  repeatClientRate: number,
  totalBookings: number,
): { score: number; detail: string; tip: string | null } {
  if (totalBookings < 3) {
    return {
      score: 50,
      detail: 'Not enough data yet',
      tip: 'Deliver great work so clients return — repeat bookings boost this score',
    };
  }

  const score = Math.min(100, Math.round(repeatClientRate));
  return {
    score,
    detail: score === 0
      ? 'No repeat clients yet'
      : `${score}% of clients booked again`,
    tip: score < 50 ? 'Go above and beyond — satisfied clients come back' : null,
  };
}

// ── Verification badge definitions (exported for VerificationBadges component) ──

export interface VerificationBadgeDef {
  key:         'email_verified' | 'phone_verified' | 'identity_verified' | 'parent_approved' | 'verified_professional';
  label:       string;
  description: string;   // what it means
  howToEarn:   string;   // CTA text for unearned badge
  icon:        string;   // Ionicons name (solid)
  iconOutline: string;   // Ionicons name (outline/locked)
  color:       string;
  bg:          string;
  trustPts:    number;   // pts out of 100 for the verification factor
}

export const VERIFICATION_BADGES: VerificationBadgeDef[] = [
  {
    key: 'email_verified',
    label: 'Email Verified',
    description: 'Email address confirmed and active.',
    howToEarn: 'Check your inbox for a confirmation link',
    icon: 'mail',            iconOutline: 'mail-outline',
    color: '#3B82F6',        bg: '#EFF6FF',
    trustPts: 20,
  },
  {
    key: 'phone_verified',
    label: 'Phone Verified',
    description: 'Mobile number confirmed via SMS code.',
    howToEarn: 'Add your phone number and verify with SMS',
    icon: 'call',            iconOutline: 'call-outline',
    color: '#8B5CF6',        bg: '#F5F3FF',
    trustPts: 20,
  },
  {
    key: 'identity_verified',
    label: 'Identity Verified',
    description: 'Government-issued ID confirmed by TeenWorks.',
    howToEarn: 'Upload a photo ID in Account Settings',
    icon: 'id-card',         iconOutline: 'id-card-outline',
    color: '#10B981',        bg: '#ECFDF5',
    trustPts: 25,
  },
  {
    key: 'parent_approved',
    label: 'Parent Approved',
    description: 'A parent or guardian has approved this account.',
    howToEarn: 'Ask a parent to approve from their account',
    icon: 'people',          iconOutline: 'people-outline',
    color: '#F59E0B',        bg: '#FFFBEB',
    trustPts: 20,
  },
  {
    key: 'verified_professional',
    label: 'Verified Professional',
    description: 'Skills and qualifications vetted by the TeenWorks team.',
    howToEarn: 'Apply for professional verification in your profile',
    icon: 'ribbon',          iconOutline: 'ribbon-outline',
    color: '#EF4444',        bg: '#FEF2F2',
    trustPts: 15,
  },
];

/** Verification score (0–100) from profile flags — now includes all 5 badges */
function verificationScore(
  profile: { email_verified: boolean; phone_verified: boolean; identity_verified: boolean; parent_approved: boolean; verified_professional?: boolean },
): { score: number; detail: string; tip: string | null } {
  let score = 0;
  const earned: string[] = [];
  const missing: string[] = [];

  for (const badge of VERIFICATION_BADGES) {
    if ((profile as any)[badge.key]) {
      score += badge.trustPts;
      earned.push(badge.label.replace(' Verified', '').replace(' Approved', '').replace(' Professional', ' Pro'));
    } else {
      missing.push(badge.label);
    }
  }

  const earnedCount = earned.length;
  return {
    score: Math.min(100, score),
    detail: earnedCount > 0
      ? `${earnedCount}/5 verified · ${earned.join(' · ')}`
      : 'No verifications yet',
    tip: missing.length > 0 && score < 80
      ? `Add ${missing[0]} to improve your score`
      : null,
  };
}

// ── Full breakdown (profile + provider_profile + reviews) ─────

export function computeTrustBreakdown(
  profile: PublicProfile,
  pp: ProviderProfile | null | undefined,
  reviews: Review[],
): TrustBreakdown {
  const rv = reviewsScore(reviews);
  const cv = completionScore(pp?.completion_rate ?? 0, pp?.total_bookings ?? 0);
  const rs = responseScore(pp?.avg_response_hours ?? null, pp?.total_bookings ?? 0);
  const rp = repeatScore(pp?.repeat_client_rate ?? 0, pp?.total_bookings ?? 0);
  const vf = verificationScore(profile);

  const factors: TrustFactor[] = [
    { id: 'reviews',     label: 'Reviews',         icon: 'star-outline',           score: rv.score, weight: 35, detail: rv.detail, tip: rv.tip },
    { id: 'completion',  label: 'Completion Rate',  icon: 'checkmark-circle-outline',score: cv.score, weight: 25, detail: cv.detail, tip: cv.tip },
    { id: 'response',    label: 'Response Speed',   icon: 'flash-outline',          score: rs.score, weight: 20, detail: rs.detail, tip: rs.tip },
    { id: 'repeat',      label: 'Repeat Clients',   icon: 'repeat-outline',         score: rp.score, weight: 10, detail: rp.detail, tip: rp.tip },
    { id: 'verification',label: 'Verification',     icon: 'shield-checkmark-outline',score: vf.score, weight: 10, detail: vf.detail, tip: vf.tip },
  ];

  const score = Math.min(100, Math.round(
    factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0),
  ));

  return { score, factors };
}

// ── Improvement Suggestions ───────────────────────────────────

export type SuggestionCategory = 'verification' | 'response' | 'completion' | 'reviews' | 'profile' | 'repeat';
export type SuggestionDifficulty = 'easy' | 'medium' | 'hard';

export interface ImprovementSuggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  /** Approximate trust score gain if acted on */
  estimatedGain: number;
  difficulty: SuggestionDifficulty;
  /** Ionicons name */
  icon: string;
  color: string;
  bg: string;
  /** CTA label for the action button */
  ctaLabel: string;
  /** Deep-link action key, consumed by TrustCenterScreen */
  actionKey: string;
}

export function computeImprovementSuggestions(
  profile: { email_verified: boolean; phone_verified: boolean; identity_verified: boolean; parent_approved: boolean; verified_professional?: boolean; avatar_url: string | null; bio?: string | null },
  pp: ProviderProfile | null | undefined,
  reviews: Review[],
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  // ── Verification gaps (exact pts known) ──────────────────────
  for (const badge of VERIFICATION_BADGES) {
    if (!(profile as any)[badge.key]) {
      // Weight: each verification badge contributes trustPts/100 × 10% weight
      const gain = Math.round(badge.trustPts * 0.10);
      let difficulty: SuggestionDifficulty = 'easy';
      if (badge.key === 'identity_verified')    difficulty = 'medium';
      if (badge.key === 'verified_professional') difficulty = 'hard';
      if (badge.key === 'parent_approved')       difficulty = 'medium';

      suggestions.push({
        id: `verify_${badge.key}`,
        category: 'verification',
        title: `Add ${badge.label}`,
        description: badge.howToEarn,
        estimatedGain: gain,
        difficulty,
        icon: badge.iconOutline,
        color: badge.color,
        bg: badge.bg,
        ctaLabel: 'Verify Now',
        actionKey: `verify:${badge.key}`,
      });
    }
  }

  const totalBookings = pp?.total_bookings ?? 0;
  const reviewCount = pp?.review_count ?? 0;
  const avgResponse = pp?.avg_response_hours ?? null;
  const completionRate = pp?.completion_rate ?? 0;
  const repeatRate = pp?.repeat_client_rate ?? 0;

  // ── Response speed ────────────────────────────────────────────
  if (avgResponse === null) {
    suggestions.push({
      id: 'response_first',
      category: 'response',
      title: 'Accept your first booking quickly',
      description: 'Respond within 1 hour to unlock a 100/100 response score',
      estimatedGain: 8,
      difficulty: 'easy',
      icon: 'flash-outline',
      color: Colors.warning,
      bg: Colors.warningLight,
      ctaLabel: 'View Requests',
      actionKey: 'nav:nearby_requests',
    });
  } else if (avgResponse >= 24) {
    suggestions.push({
      id: 'response_speed',
      category: 'response',
      title: 'Improve response time',
      description: `You average ${avgResponse.toFixed(0)}h — responding within 4h adds ~+3 pts`,
      estimatedGain: 3,
      difficulty: 'easy',
      icon: 'flash-outline',
      color: Colors.warning,
      bg: Colors.warningLight,
      ctaLabel: 'Enable Notifications',
      actionKey: 'nav:notifications_settings',
    });
  } else if (avgResponse >= 4) {
    suggestions.push({
      id: 'response_speed_fine',
      category: 'response',
      title: 'Reply within 1 hour',
      description: 'Drop response time below 1 hour for a perfect 100 response score',
      estimatedGain: 2,
      difficulty: 'easy',
      icon: 'flash-outline',
      color: Colors.warning,
      bg: Colors.warningLight,
      ctaLabel: 'Enable Notifications',
      actionKey: 'nav:notifications_settings',
    });
  }

  // ── Reviews ───────────────────────────────────────────────────
  if (reviewCount === 0) {
    suggestions.push({
      id: 'get_first_review',
      category: 'reviews',
      title: 'Complete your first job',
      description: 'Earn your first review — the single biggest trust score unlock',
      estimatedGain: 12,
      difficulty: 'medium',
      icon: 'star-outline',
      color: '#F59E0B',
      bg: '#FEF3C7',
      ctaLabel: 'Browse Requests',
      actionKey: 'nav:nearby_requests',
    });
  } else if (reviewCount < 5) {
    const need = 5 - reviewCount;
    suggestions.push({
      id: 'reviews_5',
      category: 'reviews',
      title: `Get ${need} more review${need !== 1 ? 's' : ''}`,
      description: '5 reviews unlocks full review score weight (+4 pts)',
      estimatedGain: 4,
      difficulty: 'medium',
      icon: 'star-outline',
      color: '#F59E0B',
      bg: '#FEF3C7',
      ctaLabel: 'Browse Requests',
      actionKey: 'nav:nearby_requests',
    });
  } else if (reviewCount < 10) {
    const need = 10 - reviewCount;
    suggestions.push({
      id: 'reviews_10',
      category: 'reviews',
      title: `Reach 10 reviews (${need} to go)`,
      description: 'Double-digit reviews puts you in the top 20% of providers',
      estimatedGain: 3,
      difficulty: 'medium',
      icon: 'star-outline',
      color: '#F59E0B',
      bg: '#FEF3C7',
      ctaLabel: 'Browse Requests',
      actionKey: 'nav:nearby_requests',
    });
  }

  const provRevs = reviews.filter((r) => r.reviewee_role === 'provider' || !r.reviewee_role);
  const avgRating = provRevs.length > 0
    ? provRevs.reduce((s, r) => s + r.rating, 0) / provRevs.length
    : 0;
  if (provRevs.length >= 3 && avgRating < 4.5) {
    suggestions.push({
      id: 'rating_quality',
      category: 'reviews',
      title: 'Push your rating above 4.5★',
      description: `Current average: ${avgRating.toFixed(1)}★. Exceeding expectations earns 5★ reviews`,
      estimatedGain: 5,
      difficulty: 'medium',
      icon: 'star',
      color: '#F59E0B',
      bg: '#FEF3C7',
      ctaLabel: 'View Reviews',
      actionKey: 'scroll:reviews',
    });
  }

  // ── Completion rate ───────────────────────────────────────────
  if (totalBookings >= 3 && completionRate < 90) {
    suggestions.push({
      id: 'completion_rate',
      category: 'completion',
      title: 'Avoid cancelling bookings',
      description: `Completion rate ${completionRate.toFixed(0)}% — reach 95%+ to max this factor`,
      estimatedGain: 5,
      difficulty: 'hard',
      icon: 'checkmark-circle-outline',
      color: Colors.success,
      bg: Colors.successLight,
      ctaLabel: 'View Bookings',
      actionKey: 'nav:bookings',
    });
  }

  // ── Repeat clients ────────────────────────────────────────────
  if (totalBookings >= 5 && repeatRate < 30) {
    suggestions.push({
      id: 'repeat_clients',
      category: 'repeat',
      title: 'Build a loyal client base',
      description: 'Clients who book twice count as repeat. Go the extra mile.',
      estimatedGain: 3,
      difficulty: 'hard',
      icon: 'repeat-outline',
      color: Colors.primary,
      bg: Colors.primaryLight,
      ctaLabel: 'View Past Clients',
      actionKey: 'nav:bookings',
    });
  }

  // ── Profile completeness ──────────────────────────────────────
  if (!profile.avatar_url) {
    suggestions.push({
      id: 'add_avatar',
      category: 'profile',
      title: 'Add a profile photo',
      description: 'Providers with photos get 3× more hires',
      estimatedGain: 2,
      difficulty: 'easy',
      icon: 'camera-outline',
      color: Colors.info,
      bg: Colors.infoLight,
      ctaLabel: 'Edit Profile',
      actionKey: 'nav:edit_profile',
    });
  }
  if (!pp?.bio || (pp.bio?.length ?? 0) < 50) {
    suggestions.push({
      id: 'add_bio',
      category: 'profile',
      title: pp?.bio ? 'Expand your bio' : 'Write a bio',
      description: 'A detailed bio builds client confidence before they hire you',
      estimatedGain: 1,
      difficulty: 'easy',
      icon: 'create-outline',
      color: Colors.info,
      bg: Colors.infoLight,
      ctaLabel: 'Edit Profile',
      actionKey: 'nav:edit_profile',
    });
  }

  // ── Sort: highest gain first, then easiest ───────────────────
  const diffOrder: Record<SuggestionDifficulty, number> = { easy: 0, medium: 1, hard: 2 };
  suggestions.sort((a, b) => {
    if (b.estimatedGain !== a.estimatedGain) return b.estimatedGain - a.estimatedGain;
    return diffOrder[a.difficulty] - diffOrder[b.difficulty];
  });

  return suggestions;
}

// ── Lightweight score (no Review[] needed) ────────────────────

/** Uses pp.trust_score from DB when available (trigger-maintained, always accurate).
 *  Falls back to a profile-only estimate when DB score is missing. */
export function computeTrustScore(
  profile: { email_verified: boolean; phone_verified: boolean; identity_verified: boolean; parent_approved: boolean; verified_professional?: boolean; avatar_url: string | null; created_at: string },
  pp: ProviderProfile | null | undefined,
  reviews?: Review[],
): number {
  // 1. DB-persisted score is always most accurate
  if (pp && typeof (pp as any).trust_score === 'number' && (pp as any).trust_score > 0) {
    return (pp as any).trust_score as number;
  }

  // 2. Full compute when reviews are available
  if (reviews && reviews.length > 0) {
    return computeTrustBreakdown(profile as PublicProfile, pp, reviews).score;
  }

  // 3. Profile-only estimation
  const rv = reviewsScoreFromAggregates(pp?.rating ?? 0, pp?.review_count ?? 0);
  const cv = completionScore(pp?.completion_rate ?? 0, pp?.total_bookings ?? 0);
  const rs = responseScore(pp?.avg_response_hours ?? null, pp?.total_bookings ?? 0);
  const rp = repeatScore(pp?.repeat_client_rate ?? 0, pp?.total_bookings ?? 0);
  const vf = verificationScore(profile);

  return Math.min(100, Math.round(
    rv.score * 0.35 +
    cv.score * 0.25 +
    rs.score * 0.20 +
    rp.score * 0.10 +
    vf.score * 0.10,
  ));
}
