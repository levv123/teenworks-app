/** Spec 4.4 — the three-up stat row: jobs completed, average rating, new clients. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, TABULAR } from '../../design/tokens';
import type { EarningsSummary, IoniconName } from '../../data/types';
import { formatRating } from '../../utils/format';
import { AppText, Card } from '../../ui';

const ICON_SIZE = 17;

/** Whole counts only, and a dash rather than NaN if a number ever goes missing. */
function countLabel(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : '—';
}

export interface StatTilesProps {
  summary: EarningsSummary;
}

export function StatTiles({ summary }: StatTilesProps) {
  const tiles: { icon: IoniconName; value: string; label: string }[] = [
    {
      icon: 'briefcase-outline',
      value: countLabel(summary.jobsCompleted),
      label: 'Jobs Completed',
    },
    {
      icon: 'star-outline',
      value: formatRating(summary.avgRating),
      label: 'Avg. Rating',
    },
    {
      icon: 'people-outline',
      value: countLabel(summary.newClients),
      label: 'New Clients',
    },
  ];

  return (
    <View style={styles.row}>
      {tiles.map((tile, index) => (
        <Card
          key={tile.label}
          padding={S.md}
          style={[styles.tile, index > 0 && styles.tileGap]}
        >
          <View style={styles.valueRow}>
            <Ionicons name={tile.icon} size={ICON_SIZE} color={C.text} />
            <AppText variant="h2" numberOfLines={1} style={styles.value}>
              {tile.value}
            </AppText>
          </View>
          <AppText variant="tiny" color={C.textMuted} style={styles.label}>
            {tile.label}
          </AppText>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // Stretch keeps the three tiles level when a label wraps to a second line.
    alignItems: 'stretch',
  },
  tile: {
    flex: 1,
    minWidth: 0,
    borderRadius: R.lg,
  },
  tileGap: {
    marginLeft: S.sm + 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    ...TABULAR,
    marginLeft: S.sm,
    flex: 1,
    minWidth: 0,
  },
  label: {
    marginTop: S.xs + 2,
    // The scale's default tracking pushes 'Jobs Completed' onto a second line
    // in a third of a 390pt screen. Closing it up keeps all three on one line.
    letterSpacing: 0,
  },
});
