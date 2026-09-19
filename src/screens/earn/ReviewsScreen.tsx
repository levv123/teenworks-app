/**
 * "See all" from the Analytics reviews section: the rating summary with its 5-to-1
 * distribution, then every review the user has received, newest first.
 */
import React, { Fragment, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, S, TABULAR } from '../../design/tokens';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { LIFETIME_RATING, RATING_BUCKETS, REVIEW_COUNT } from '../../data/mock';
import { AppText, Card, Divider, EmptyState, Screen, ScreenHeader, Stars } from '../../ui';
import { RatingDistribution, ReviewRow } from '../../features/analytics';
import { formatRating } from '../../utils/format';

const STAR_SIZE = 15;

export function ReviewsScreen() {
  const nav = useNavigation<Nav>();
  const { reviews } = useApp();

  // ISO dates sort lexicographically, so no Date parsing is needed.
  const sorted = useMemo(
    () => reviews.slice().sort((a, b) => b.date.localeCompare(a.date)),
    [reviews],
  );

  // The summary describes the whole history; the list below is the most recent
  // page of it. Deriving the average from the page would misreport the record.
  const average = LIFETIME_RATING;
  const count = REVIEW_COUNT;
  const listed = sorted.length;

  return (
    <Screen header={<ScreenHeader title="Reviews" onBack={() => nav.goBack()} />}>
      {listed === 0 ? (
        <EmptyState
          icon="star-outline"
          title="No reviews yet"
          message="Finish a job and the people you worked for can leave you a review."
        />
      ) : (
        <>
          <Card>
            <View style={styles.summary}>
              <View style={styles.average}>
                <AppText variant="display" style={styles.averageValue}>
                  {formatRating(average)}
                </AppText>
                <Stars rating={average} size={STAR_SIZE} style={styles.stars} />
                <AppText variant="tiny" color={C.textMuted}>
                  {`${count} ${count === 1 ? 'review' : 'reviews'}`}
                </AppText>
              </View>

              <View style={styles.distribution}>
                <RatingDistribution reviews={sorted} buckets={RATING_BUCKETS} />
              </View>
            </View>
          </Card>

          <AppText variant="small" color={C.textSubtle} style={styles.listNote}>
            {`Showing your ${listed} most recent`}
          </AppText>

          <View style={styles.list}>
            {sorted.map((review, index) => (
              <Fragment key={review.id}>
                {index > 0 ? <Divider style={styles.divider} /> : null}
                <ReviewRow review={review} />
              </Fragment>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  average: {
    marginRight: S.lg,
  },
  averageValue: {
    ...TABULAR,
  },
  stars: {
    marginTop: S.xs,
    marginBottom: S.xs + 2,
  },
  distribution: {
    flex: 1,
    minWidth: 0,
  },
  listNote: {
    marginTop: S.lg,
  },
  list: {
    marginTop: S.xl,
  },
  divider: {
    marginVertical: S.base,
  },
});
