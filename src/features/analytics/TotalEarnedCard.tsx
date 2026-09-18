/** Spec 4.3 — Total Earned: the period total and its delta on the left, the chart on the right. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C, S, TABULAR } from '../../design/tokens';
import type { EarningsSummary } from '../../data/types';
import { formatMoney, formatMoneyDelta } from '../../utils/format';
import { AppText, Card } from '../../ui';
import { DeltaBadge } from './DeltaBadge';
import { MiniBarChart } from './MiniBarChart';

export interface TotalEarnedCardProps {
  summary: EarningsSummary;
  /** Wording for the delta line, e.g. "last month" -> "+ $184 from last month". */
  comparisonLabel: string;
}

export function TotalEarnedCard({ summary, comparisonLabel }: TotalEarnedCardProps) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.left}>
          <AppText variant="small" color={C.textMuted}>
            Total Earned
          </AppText>

          <View style={styles.totalRow}>
            <AppText variant="display" style={styles.total}>
              {formatMoney(summary.total)}
            </AppText>
            <View style={styles.badge}>
              <DeltaBadge percent={summary.deltaPercent} />
            </View>
          </View>

          <AppText variant="tiny" color={C.textMuted} style={styles.delta}>
            {`${formatMoneyDelta(summary.deltaAmount)} from ${comparisonLabel}`}
          </AppText>
        </View>

        <MiniBarChart bars={summary.chart} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    minWidth: 0,
    marginRight: S.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs,
  },
  total: {
    ...TABULAR,
  },
  badge: {
    marginLeft: S.sm,
  },
  delta: {
    marginTop: S.xs + 2,
  },
});
