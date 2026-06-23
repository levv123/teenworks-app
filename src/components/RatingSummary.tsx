import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../utils/colors';
import { Review } from '../types';
import { StarRating } from './StarRating';
import { CategoryAveragesPanel, computeCategoryAverages } from './CategoryRatingsBar';

interface RatingSummaryProps {
  rating: number;          // aggregate (e.g. from provider_profile or service)
  reviewCount: number;
  reviews?: Review[];      // if provided, show distribution bars + would hire again %
  compact?: boolean;       // smaller inline variant (used in ProviderCard etc.)
}

export function RatingSummary({ rating, reviewCount, reviews, compact }: RatingSummaryProps) {
  // Distribution bars: count per star level from actual reviews
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let wouldHireCount = 0;
  let wouldHireTotal = 0;

  if (reviews && reviews.length > 0) {
    for (const r of reviews) {
      const bucket = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (bucket >= 1 && bucket <= 5) dist[bucket]++;
      if (r.would_hire_again !== null) {
        wouldHireTotal++;
        if (r.would_hire_again) wouldHireCount++;
      }
    }
  }

  const wouldHirePct = wouldHireTotal > 0 ? Math.round((wouldHireCount / wouldHireTotal) * 100) : null;

  const catAverages = reviews && reviews.length > 0 ? computeCategoryAverages(reviews) : null;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactNum}>{reviewCount > 0 ? rating.toFixed(1) : '—'}</Text>
        <StarRating rating={rating} size={14} />
        <Text style={styles.compactCount}>
          {reviewCount === 0 ? 'No reviews yet' : `${reviewCount} review${reviewCount !== 1 ? 's' : ''}`}
        </Text>
      </View>
    );
  }

  // Category averages panel below the hero row (when data available)
  return (
    <View style={styles.outer}>
      <View style={styles.heroRow}>
        {/* Left: big number + stars + count */}
        <View style={styles.left}>
          <Text style={styles.bigNum}>{reviewCount > 0 ? rating.toFixed(1) : '—'}</Text>
          <StarRating rating={rating} size={18} />
          <Text style={styles.countLabel}>
            {reviewCount === 0
              ? 'No reviews yet'
              : `${reviewCount} review${reviewCount !== 1 ? 's' : ''}`}
          </Text>
          {wouldHirePct !== null && (
            <View style={styles.hirePct}>
              <Ionicons name="thumbs-up" size={12} color={Colors.success} />
              <Text style={styles.hirePctText}>{wouldHirePct}% would hire again</Text>
            </View>
          )}
        </View>

        {/* Right: distribution bars */}
        {reviews && reviews.length > 0 && (
          <View style={styles.bars}>
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const pct = reviews.length > 0 ? (dist[star] / reviews.length) : 0;
              return (
                <View key={star} style={styles.barRow}>
                  <Text style={styles.barLabel}>{star}</Text>
                  <Ionicons name="star" size={9} color={Colors.warning} />
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.barCount}>{dist[star]}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Category averages panel */}
      {catAverages && (
        <CategoryAveragesPanel averages={catAverages} reviewCount={reviewCount} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Full variant
  outer: { gap: Spacing.sm },
  heroRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  left: { alignItems: 'center', gap: 5, minWidth: 80 },
  bigNum: { fontSize: 42, fontWeight: '800', color: Colors.text, lineHeight: 46 },
  countLabel: { fontSize: 12, color: Colors.muted, textAlign: 'center' },
  hirePct: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  hirePctText: { fontSize: 11, color: Colors.success, fontWeight: '600' },

  // Distribution bars
  bars: { flex: 1, gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLabel: { fontSize: 11, fontWeight: '600', color: Colors.muted, width: 10, textAlign: 'right' },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: Radius.full,
  },
  barCount: { fontSize: 10, color: Colors.muted, width: 16, textAlign: 'right' },

  // Compact variant
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compactNum: { fontSize: 14, fontWeight: '700', color: Colors.text },
  compactCount: { fontSize: 12, color: Colors.muted },
});
