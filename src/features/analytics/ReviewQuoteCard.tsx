/** Spec 4.6 (right card) — a pull-quote from a review with its author underneath. */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { C, R, S } from '../../design/tokens';
import type { Review } from '../../data/types';
import { AppText, Avatar, Card } from '../../ui';

const AVATAR_SIZE = 28;
const QUOTE_LINES = 3;

export interface ReviewQuoteCardProps {
  review: Review;
  /** The caller owns the flex weight — spec 4.6 gives this card flex: 6. */
  style?: StyleProp<ViewStyle>;
}

export function ReviewQuoteCard({ review, style }: ReviewQuoteCardProps) {
  return (
    <Card padding={S.base} style={[styles.card, style]}>
      <AppText variant="small" numberOfLines={QUOTE_LINES} style={styles.quote}>
        {`“${review.body}”`}
      </AppText>

      <View style={styles.author}>
        <Avatar name={review.author} uri={review.avatarUrl} size={AVATAR_SIZE} />
        <View style={styles.names}>
          <AppText variant="tiny" numberOfLines={1}>
            {review.author}
          </AppText>
          <AppText variant="tiny" color={C.textSubtle} numberOfLines={1}>
            {review.role}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.lg,
  },
  quote: {
    marginBottom: S.md,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    // Pins the author to the bottom when the sibling card makes this one taller.
    marginTop: 'auto',
  },
  names: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
});
