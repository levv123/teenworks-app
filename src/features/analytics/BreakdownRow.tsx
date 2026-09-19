/** Spec 4.5 — one category row of the earnings breakdown: icon, name, amount, bar, share. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S } from '../../design/tokens';
import type { BreakdownSlice } from '../../data/types';
import { CATEGORY_BY_ID } from '../../data/mock';
import { formatMoney } from '../../utils/format';
import { AppText, ProgressBar } from '../../ui';

const ICON_SIZE = 18;
/** Fixed so the percentages line up in a column down the list. */
const PERCENT_WIDTH = 38;

export interface BreakdownRowProps {
  slice: BreakdownSlice;
  barWidth?: number;
  /** The EarningsBreakdown screen also shows the job count under the name. */
  showJobs?: boolean;
}

export function BreakdownRow({
  slice,
  barWidth = 148,
  showJobs = false,
}: BreakdownRowProps) {
  const category = CATEGORY_BY_ID[slice.category];
  const percent = Number.isFinite(slice.percent) ? Math.round(slice.percent) : 0;
  const jobs = Number.isFinite(slice.jobs) ? Math.round(slice.jobs) : 0;
  const jobsLabel = `${jobs} ${jobs === 1 ? 'job' : 'jobs'}`;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${category.label}: ${formatMoney(slice.amount)}, ${percent} percent${
        showJobs ? `, ${jobsLabel}` : ''
      }`}
      style={styles.row}
    >
      <Ionicons name={category.icon} size={ICON_SIZE} color={category.color} />

      <View style={styles.names}>
        <AppText numberOfLines={1}>{category.label}</AppText>
        {showJobs ? (
          <AppText variant="tiny" color={C.textMuted} numberOfLines={1}>
            {jobsLabel}
          </AppText>
        ) : null}
      </View>

      <AppText variant="bodyBold">{formatMoney(slice.amount)}</AppText>

      <ProgressBar
        value={percent / 100}
        style={[styles.bar, { flexBasis: barWidth, maxWidth: barWidth }]}
      />

      <AppText variant="small" color={C.textMuted} style={styles.percent}>
        {`${percent}%`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  names: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    marginLeft: S.md,
    marginRight: S.md,
  },
  bar: {
    marginLeft: S.md,
    // The track gives up width before the category name does, so a narrow
    // screen shortens the bar instead of ellipsising "Yard Work".
    flexGrow: 0,
    flexShrink: 4,
  },
  percent: {
    width: PERCENT_WIDTH,
    marginLeft: S.sm,
    textAlign: 'right',
  },
});
