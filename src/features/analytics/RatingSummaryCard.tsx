/** Spec 4.6 (left card) — the average rating, its stars and the review count. */
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { C, R, S, TABULAR } from '../../design/tokens';
import { formatRating } from '../../utils/format';
import { AppText, Card, Stars } from '../../ui';

const STAR_SIZE = 15;

export interface RatingSummaryCardProps {
  rating: number;
  count: number;
  /** The caller owns the flex weight — spec 4.6 gives this card flex: 4. */
  style?: StyleProp<ViewStyle>;
}

export function RatingSummaryCard({ rating, count, style }: RatingSummaryCardProps) {
  const safeCount = Number.isFinite(count) ? Math.round(count) : 0;

  return (
    <Card padding={S.base} style={[styles.card, style]}>
      <AppText variant="display" style={styles.value}>
        {formatRating(rating)}
      </AppText>
      <Stars rating={rating} size={STAR_SIZE} style={styles.stars} />
      <AppText variant="tiny" color={C.textMuted}>
        {`(${safeCount} ${safeCount === 1 ? 'review' : 'reviews'})`}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.lg,
  },
  value: {
    ...TABULAR,
  },
  stars: {
    marginTop: S.xs + 2,
    marginBottom: S.xs + 2,
  },
});
