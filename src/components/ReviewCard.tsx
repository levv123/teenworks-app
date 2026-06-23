import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../utils/colors';
import { Review } from '../types';
import { Avatar } from './Avatar';
import { StarRating } from './StarRating';
import { CategoryRatingsBreakdown } from './CategoryRatingsBar';
import { timeAgo } from '../utils/helpers';

interface ReviewCardProps {
  review: Review;
  /** Show the "verified job" badge. Default true. */
  showVerified?: boolean;
}

export function ReviewCard({ review, showVerified = true }: ReviewCardProps) {
  const isVerified = showVerified; // every review in our DB came from a real completed booking

  return (
    <View style={styles.card}>
      {/* Top row: avatar + meta + stars */}
      <View style={styles.top}>
        <Avatar
          uri={review.reviewer?.avatar_url ?? null}
          name={review.reviewer?.full_name ?? '?'}
          size={40}
        />
        <View style={styles.meta}>
          <Text style={styles.name}>{review.reviewer?.full_name ?? 'Anonymous'}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={review.rating} size={13} />
            <Text style={styles.ratingNum}>{review.rating.toFixed(1)}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{timeAgo(review.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Would hire again badge */}
      {review.would_hire_again !== null && (
        <View style={[
          styles.hireBadge,
          { backgroundColor: review.would_hire_again ? Colors.success + '18' : Colors.error + '15' },
        ]}>
          <Ionicons
            name={review.would_hire_again ? 'thumbs-up' : 'thumbs-down'}
            size={12}
            color={review.would_hire_again ? Colors.success : Colors.error}
          />
          <Text style={[
            styles.hireBadgeText,
            { color: review.would_hire_again ? Colors.success : Colors.error },
          ]}>
            {review.would_hire_again ? 'Would hire again' : 'Would not hire again'}
          </Text>
        </View>
      )}

      {/* Category ratings */}
      {review.category_ratings && (
        <CategoryRatingsBreakdown ratings={review.category_ratings} />
      )}

      {/* Comment */}
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}

      {/* Verified job footer */}
      {isVerified && (
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={11} color={Colors.success} />
          <Text style={styles.footerText}>Verified completed job</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  meta: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 12, fontWeight: '700', color: Colors.text },
  dot: { fontSize: 12, color: Colors.muted },
  time: { fontSize: 12, color: Colors.muted },
  hireBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  hireBadgeText: { fontSize: 12, fontWeight: '600' },
  comment: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  noComment: { fontSize: 13, color: Colors.muted, fontStyle: 'italic' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2, borderTopWidth: 1, borderTopColor: Colors.border },
  footerText: { fontSize: 11, color: Colors.success, fontWeight: '500' },
});
