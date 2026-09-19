/**
 * "See all" from the Analytics breakdown: a totals header for the active range and
 * every category slice with its amount, share and job count. The header carries the
 * same range picker as the Analytics tab, so both screens stay on one period.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, S, TABULAR } from '../../design/tokens';
import type { TimeRange } from '../../data/types';
import { TIME_RANGES } from '../../data/mock';
import type { Nav } from '../../navigation/routes';
import { useApp, useEarnings } from '../../store/AppStore';
import {
  AppText,
  Card,
  Divider,
  EmptyState,
  OptionSheet,
  Screen,
  ScreenHeader,
  SecondaryButton,
} from '../../ui';
import type { SheetOption } from '../../ui';
import { BreakdownRow } from '../../features/analytics';
import { formatMoney } from '../../utils/format';

/** Narrower than the Analytics default: these rows also carry a job-count line. */
const BAR_WIDTH = 96;

const RANGE_OPTIONS: SheetOption<TimeRange>[] = TIME_RANGES.map(({ id, label }) => ({
  id,
  label,
}));

/** Plain English for the period; TIME_RANGES only gives a label and a comparison. */
const PERIOD_NOTE: Record<TimeRange, string> = {
  week: 'the last seven days',
  month: 'the current calendar month',
  quarter: 'the last three calendar months',
  year: 'the year so far',
  all: 'every job since you joined',
};

export function EarningsBreakdownScreen() {
  const nav = useNavigation<Nav>();
  const { timeRange, setTimeRange } = useApp();
  const earnings = useEarnings();
  const [rangeOpen, setRangeOpen] = useState(false);

  // TIME_RANGES covers every TimeRange; the fallback only guards a future id.
  const range = TIME_RANGES.find((option) => option.id === timeRange) ?? TIME_RANGES[0];

  const slices = useMemo(
    () => earnings.breakdown.slice().sort((a, b) => b.amount - a.amount),
    [earnings.breakdown],
  );

  const jobs = Number.isFinite(earnings.jobsCompleted)
    ? Math.max(0, Math.round(earnings.jobsCompleted))
    : 0;
  // A range with no completed jobs still has to render a number, not NaN.
  const averagePerJob = jobs > 0 ? earnings.total / jobs : 0;

  const selectRange = useCallback(
    (id: TimeRange) => {
      setTimeRange(id);
      setRangeOpen(false);
    },
    [setTimeRange],
  );

  return (
    <Screen
      header={
        <ScreenHeader
          title="Earnings Breakdown"
          onBack={() => nav.goBack()}
          right={
            <SecondaryButton
              label={range.label}
              trailingIcon="chevron-down"
              size="sm"
              onPress={() => setRangeOpen(true)}
            />
          }
        />
      }
    >
      <Card>
        <AppText variant="small" color={C.textMuted}>
          Total Earned
        </AppText>
        <AppText variant="display" style={styles.total}>
          {formatMoney(earnings.total)}
        </AppText>

        <Divider style={styles.divider} />

        <View style={styles.stats}>
          <View style={styles.stat}>
            <AppText variant="h2" style={styles.statValue}>
              {String(jobs)}
            </AppText>
            <AppText variant="tiny" color={C.textMuted} style={styles.statLabel}>
              Jobs Completed
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="h2" style={styles.statValue}>
              {formatMoney(averagePerJob)}
            </AppText>
            <AppText variant="tiny" color={C.textMuted} style={styles.statLabel}>
              Avg. per Job
            </AppText>
          </View>
        </View>
      </Card>

      {slices.length > 0 ? (
        <View style={styles.rows}>
          {slices.map((slice, index) => (
            <View key={slice.category} style={index > 0 ? styles.rowGap : undefined}>
              <BreakdownRow slice={slice} barWidth={BAR_WIDTH} showJobs />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="pie-chart-outline"
          title="Nothing to break down"
          message="No earnings in this period yet. Try a wider range."
        />
      )}

      <View style={styles.note}>
        <AppText variant="h3">Where it came from</AppText>
        <AppText variant="small" color={C.textMuted} style={styles.noteBody}>
          {`These totals cover ${PERIOD_NOTE[range.id]}, measured against ${range.comparisonLabel}.`}
        </AppText>
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
  total: {
    ...TABULAR,
    marginTop: S.xs,
  },
  divider: {
    marginVertical: S.base,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    ...TABULAR,
  },
  statLabel: {
    marginTop: S.xs + 2,
  },
  rows: {
    marginTop: S.xl,
  },
  rowGap: {
    marginTop: S.base,
  },
  note: {
    marginTop: S.xl,
  },
  noteBody: {
    marginTop: S.xs + 2,
  },
});
