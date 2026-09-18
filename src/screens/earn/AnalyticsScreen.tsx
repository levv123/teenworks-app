/**
 * Spec section 4 — the Analytics tab.
 *
 * Range pill + avatar, the display title, Total Earned, the three stat tiles, a
 * four-row earnings breakdown and the two-up reviews summary. Every figure comes
 * from useEarnings(), so picking a new range re-renders the whole screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, S } from '../../design/tokens';
import type { TimeRange } from '../../data/types';
import { REVIEW_COUNT, TIME_RANGES } from '../../data/mock';
import type { Nav } from '../../navigation/routes';
import { useApp, useEarnings } from '../../store/AppStore';
import {
  AppText,
  EmptyState,
  OptionSheet,
  Screen,
  SecondaryButton,
  SectionHeader,
} from '../../ui';
import type { SheetOption } from '../../ui';
import { HeaderAvatar } from '../../features/chrome';
import {
  BreakdownRow,
  RatingSummaryCard,
  ReviewQuoteCard,
  StatTiles,
  TotalEarnedCard,
} from '../../features/analytics';

/** Spec 4.5 lists four categories here; longer ranges keep the rest behind "See all". */
const BREAKDOWN_PREVIEW = 4;

const RANGE_OPTIONS: SheetOption<TimeRange>[] = TIME_RANGES.map(({ id, label }) => ({
  id,
  label,
}));

export function AnalyticsScreen() {
  const nav = useNavigation<Nav>();
  const { reviews, timeRange, setTimeRange } = useApp();
  const earnings = useEarnings();
  const [rangeOpen, setRangeOpen] = useState(false);

  // TIME_RANGES covers every TimeRange; the fallback only guards a future id.
  const range = TIME_RANGES.find((option) => option.id === timeRange) ?? TIME_RANGES[0];

  const slices = useMemo(
    () =>
      earnings.breakdown
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .slice(0, BREAKDOWN_PREVIEW),
    [earnings.breakdown],
  );

  const featured = reviews.length > 0 ? reviews[0] : null;

  const selectRange = useCallback(
    (id: TimeRange) => {
      setTimeRange(id);
      setRangeOpen(false);
    },
    [setTimeRange],
  );

  return (
    <Screen tabBarSpacing>
      <View style={styles.topRow}>
        <SecondaryButton
          label={range.label}
          trailingIcon="chevron-down"
          onPress={() => setRangeOpen(true)}
          style={styles.rangePill}
        />
        <View style={styles.avatar}>
          <HeaderAvatar />
        </View>
      </View>

      <AppText variant="display" style={styles.title}>
        Analytics
      </AppText>
      <AppText variant="body" color={C.textMuted} style={styles.subtitle}>
        Track your progress. See your impact.
      </AppText>

      <View style={styles.total}>
        <TotalEarnedCard summary={earnings} comparisonLabel={range.comparisonLabel} />
      </View>

      <View style={styles.tiles}>
        <StatTiles summary={earnings} />
      </View>

      <SectionHeader
        title="Earnings Breakdown"
        onAction={() => nav.navigate('EarningsBreakdown')}
        style={styles.section}
      />

      {slices.length > 0 ? (
        <View style={styles.rows}>
          {slices.map((slice, index) => (
            <View key={slice.category} style={index > 0 ? styles.rowGap : undefined}>
              <BreakdownRow slice={slice} />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="bar-chart-outline"
          title="Nothing earned yet"
          message="Finish a job and it shows up here, split by category."
        />
      )}

      <SectionHeader
        title="Reviews"
        onAction={() => nav.navigate('Reviews')}
        style={styles.section}
      />

      <View style={styles.reviewRow}>
        <RatingSummaryCard
          rating={earnings.avgRating}
          count={REVIEW_COUNT}
          style={featured === null ? styles.soloCard : styles.ratingCard}
        />
        {featured === null ? null : (
          <ReviewQuoteCard review={featured} style={styles.quoteCard} />
        )}
      </View>

      <OptionSheet
        visible={rangeOpen}
        title="Time range"
        options={RANGE_OPTIONS}
        selectedId={timeRange}
        onSelect={selectRange}
        onClose={() => setRangeOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: S.sm,
  },
  // Spec 4.1 sets this pill a touch tighter than the shared "md" size.
  rangePill: {
    paddingHorizontal: S.base,
  },
  avatar: {
    marginLeft: S.md,
  },
  title: {
    marginTop: S.base,
  },
  subtitle: {
    marginTop: 2,
  },
  total: {
    marginTop: S.lg,
  },
  tiles: {
    marginTop: S.md,
  },
  section: {
    marginTop: S.xl,
  },
  rows: {
    marginTop: S.base,
  },
  rowGap: {
    marginTop: S.md + 2,
  },
  reviewRow: {
    flexDirection: 'row',
    // Stretch keeps the two cards the same height whichever one is taller.
    alignItems: 'stretch',
    marginTop: S.base,
  },
  ratingCard: {
    flex: 4,
  },
  soloCard: {
    flex: 1,
  },
  quoteCard: {
    flex: 6,
    marginLeft: S.sm + 2,
  },
});
