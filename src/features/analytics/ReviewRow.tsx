/** A full review — avatar, author, stars, date, job and body — for the Reviews screen. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C, S } from '../../design/tokens';
import type { Review } from '../../data/types';
import { formatDate } from '../../utils/format';
import { AppText, Avatar, Stars } from '../../ui';

const AVATAR_SIZE = 40;
const STAR_SIZE = 13;

export interface ReviewRowProps {
  review: Review;
}

export function ReviewRow({ review }: ReviewRowProps) {
  return (
    <View style={styles.row}>
      <Avatar name={review.author} uri={review.avatarUrl} size={AVATAR_SIZE} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.who}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {review.author}
            </AppText>
            <AppText variant="small" color={C.textMuted} numberOfLines={1}>
              {review.role}
            </AppText>
          </View>
          <AppText variant="tiny" color={C.textSubtle}>
            {formatDate(review.date)}
          </AppText>
        </View>

        <View style={styles.meta}>
          <Stars rating={review.rating} size={STAR_SIZE} />
          <AppText
            variant="tiny"
            color={C.textSubtle}
            numberOfLines={1}
            style={styles.job}
          >
            {review.jobTitle}
          </AppText>
        </View>

        <AppText style={styles.body}>{review.body}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  who: {
    flex: 1,
    minWidth: 0,
    marginRight: S.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm,
  },
  job: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  body: {
    marginTop: S.sm,
  },
});
