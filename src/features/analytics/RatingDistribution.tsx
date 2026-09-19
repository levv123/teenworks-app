/** Five-to-one star histogram for the Reviews screen. Buckets are derived here. */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S } from '../../design/tokens';
import type { Review } from '../../data/types';
import { AppText, ProgressBar } from '../../ui';

const STAR_ICON_SIZE = 11;
const STARS = [5, 4, 3, 2, 1] as const;
/** Fixed columns so the numbers and counts stay in line down the five rows. */
const NUMBER_WIDTH = 10;
const COUNT_WIDTH = 28;

export interface RatingDistributionProps {
  reviews: Review[];
  /**
   * Lifetime star counts. Pass these when the listed reviews are only the most
   * recent page — otherwise the histogram would describe the page rather than
   * the record it sits under.
   */
  buckets?: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function RatingDistribution({ reviews, buckets }: RatingDistributionProps) {
  // counts[0] is the one-star bucket; a 4.6 rating counts as five stars.
  const counts = useMemo(() => {
    if (buckets) return [buckets[1], buckets[2], buckets[3], buckets[4], buckets[5]];

    const derived = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      const rounded = Math.round(Number.isFinite(review.rating) ? review.rating : 0);
      const star = Math.min(5, Math.max(1, rounded));
      derived[star - 1] += 1;
    });
    return derived;
  }, [reviews, buckets]);

  const total = counts.reduce((sum, count) => sum + count, 0);

  return (
    <View>
      {STARS.map((star, index) => {
        const count = counts[star - 1];

        return (
          <View
            key={star}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}: ${count} ${
              count === 1 ? 'review' : 'reviews'
            }`}
            style={[styles.row, index > 0 && styles.rowGap]}
          >
            <AppText variant="small" color={C.textMuted} style={styles.number}>
              {String(star)}
            </AppText>
            <Ionicons name="star" size={STAR_ICON_SIZE} color={C.star} />

            <View style={styles.barWrap}>
              <ProgressBar value={total > 0 ? count / total : 0} />
            </View>

            <AppText variant="small" color={C.textMuted} style={styles.count}>
              {String(count)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowGap: {
    marginTop: S.sm,
  },
  number: {
    width: NUMBER_WIDTH,
    marginRight: S.xs,
    textAlign: 'right',
  },
  barWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
    marginRight: S.sm,
  },
  count: {
    width: COUNT_WIDTH,
    textAlign: 'right',
  },
});
