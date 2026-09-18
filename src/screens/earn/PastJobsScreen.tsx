/**
 * Past Jobs — every completed job, newest first, under a month heading, with a
 * summary of what they added up to.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, S, TABULAR } from '../../design/tokens';
import type { PastJob } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { formatDate, formatMoney, formatRating } from '../../utils/format';
import {
  AppText,
  Card,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
  Stars,
} from '../../ui';
import { GigThumb } from '../../features/gigs';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthGroup {
  /** "2026-09" — also the sort key, since ISO dates sort lexically. */
  key: string;
  label: string;
  jobs: PastJob[];
}

/** "2026-09-12" -> "September 2026", straight off the string: no Date parsing. */
function monthLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key;
  const index = Number(match[2]) - 1;
  if (index < 0 || index > 11) return key;
  return `${MONTHS[index]} ${match[1]}`;
}

function groupByMonth(jobs: PastJob[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const job of jobs) {
    const key = job.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.key === key) {
      last.jobs.push(job);
    } else {
      groups.push({ key, label: monthLabel(key), jobs: [job] });
    }
  }
  return groups;
}

export function PastJobsScreen() {
  const nav = useNavigation<Nav>();
  const { pastJobs } = useApp();

  const groups = useMemo(() => {
    const newestFirst = pastJobs.slice().sort((a, b) => b.date.localeCompare(a.date));
    return groupByMonth(newestFirst);
  }, [pastJobs]);

  const summary = useMemo(() => {
    const count = pastJobs.length;
    const totals = pastJobs.reduce(
      (acc, job) => ({
        payout: acc.payout + job.payout,
        rating: acc.rating + job.rating,
      }),
      { payout: 0, rating: 0 },
    );
    return {
      count,
      total: totals.payout,
      // An empty history has no average to show — '—' rather than NaN.
      avgRating: count > 0 ? formatRating(totals.rating / count) : '—',
    };
  }, [pastJobs]);

  return (
    <Screen header={<ScreenHeader title="Past Jobs" onBack={() => nav.goBack()} />}>
      <Card>
        <AppText variant="small" color={C.textMuted}>
          Total Earned
        </AppText>
        <AppText variant="display" style={styles.total}>
          {formatMoney(summary.total)}
        </AppText>

        <Divider style={styles.divider} />

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <AppText variant="h2" style={styles.summaryValue}>
              {String(summary.count)}
            </AppText>
            <AppText variant="tiny" color={C.textMuted} style={styles.summaryLabel}>
              Jobs Completed
            </AppText>
          </View>
          <View style={styles.summaryStat}>
            <AppText variant="h2" style={styles.summaryValue}>
              {summary.avgRating}
            </AppText>
            <AppText variant="tiny" color={C.textMuted} style={styles.summaryLabel}>
              Avg. Rating
            </AppText>
          </View>
        </View>
      </Card>

      {groups.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No past jobs yet"
          message="Finish your first gig and it will show up here with what you earned."
          style={styles.empty}
        />
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <AppText variant="small" color={C.textMuted}>
              {group.label}
            </AppText>

            {group.jobs.map((job, index) => (
              <View key={job.id} style={[styles.row, index > 0 && styles.rowGap]}>
                <GigThumb gig={job} size={56} />

                <View style={styles.rowBody}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {job.title}
                  </AppText>
                  <AppText
                    variant="small"
                    color={C.textMuted}
                    numberOfLines={1}
                    style={styles.rowMeta}
                  >
                    {`${job.client} · ${formatDate(job.date)}`}
                  </AppText>
                  <Stars rating={job.rating} size={12} style={styles.rowStars} />
                </View>

                <AppText variant="bodyBold" style={styles.payout}>
                  {formatMoney(job.payout)}
                </AppText>
              </View>
            ))}
          </View>
        ))
      )}
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
  summaryStats: {
    flexDirection: 'row',
  },
  summaryStat: {
    flex: 1,
    minWidth: 0,
  },
  summaryValue: {
    ...TABULAR,
  },
  summaryLabel: {
    marginTop: S.xs + 2,
  },
  empty: {
    marginTop: S.md,
  },
  group: {
    marginTop: S.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  rowGap: {
    marginTop: S.base,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: S.md,
  },
  rowMeta: {
    marginTop: 2,
  },
  rowStars: {
    marginTop: S.xs + 2,
  },
  payout: {
    ...TABULAR,
    textAlign: 'right',
  },
});
