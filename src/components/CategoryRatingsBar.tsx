/**
 * CategoryRatingsBar
 *
 * Two display modes:
 *  - "breakdown"  (default): shows individual scores from a single review
 *  - "averages":  shows averaged scores across many reviews with fill bars
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../utils/colors';
import {
  CategoryRatings,
  CATEGORY_RATING_KEYS,
  CATEGORY_RATING_LABELS,
  CATEGORY_RATING_ICONS,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────

function starColor(v: number): string {
  if (v >= 4.5) return Colors.success;
  if (v >= 3.5) return '#FACC15'; // amber
  if (v >= 2.5) return Colors.warning;
  return Colors.error;
}

// ── Single-review breakdown (compact dots + label) ────────────

interface BreakdownProps {
  ratings: CategoryRatings;
}

export function CategoryRatingsBreakdown({ ratings }: BreakdownProps) {
  const pairs = CATEGORY_RATING_KEYS
    .map((k) => ({ key: k, val: ratings[k] }))
    .filter((p): p is { key: keyof CategoryRatings; val: number } => p.val !== undefined);

  if (pairs.length === 0) return null;

  return (
    <View style={styles.breakdownWrap}>
      {pairs.map(({ key, val }) => (
        <View key={key} style={styles.breakdownItem}>
          <Ionicons
            name={CATEGORY_RATING_ICONS[key] as any}
            size={11}
            color={Colors.muted}
          />
          <Text style={styles.breakdownLabel}>{CATEGORY_RATING_LABELS[key]}</Text>
          <View style={styles.breakdownDots}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View
                key={n}
                style={[
                  styles.dot,
                  n <= val ? { backgroundColor: starColor(val) } : { backgroundColor: Colors.border },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.breakdownNum, { color: starColor(val) }]}>{val.toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Averaged bars (used in profile / service summaries) ────────

/** Same shape as CategoryRatings — all keys optional. */
export type CategoryAverages = CategoryRatings;

/** Compute per-category averages from an array of reviews.
 *  Works for both provider categories and client categories. */
export function computeCategoryAverages(reviews: { category_ratings: CategoryRatings | null }[]): CategoryAverages | null {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const rev of reviews) {
    if (!rev.category_ratings) continue;
    for (const key of Object.keys(rev.category_ratings) as (keyof CategoryRatings)[]) {
      const v = rev.category_ratings[key];
      if (v !== undefined) {
        sums[key]   = (sums[key]   ?? 0) + v;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  }

  const keys = Object.keys(sums) as (keyof CategoryRatings)[];
  if (keys.length === 0) return null;

  const out: CategoryAverages = {};
  for (const key of keys) {
    out[key] = Math.round((sums[key]! / counts[key]!) * 10) / 10;
  }
  return out;
}

interface AveragesProps {
  averages: CategoryAverages;
  reviewCount?: number;
}

export function CategoryAveragesPanel({ averages, reviewCount }: AveragesProps) {
  const pairs = (Object.keys(averages) as (keyof CategoryRatings)[])
    .map((k) => ({ key: k, val: averages[k] }))
    .filter((p): p is { key: keyof CategoryRatings; val: number } => p.val !== undefined);

  if (pairs.length === 0) return null;

  return (
    <View style={styles.avgPanel}>
      <Text style={styles.avgTitle}>
        Category Ratings{reviewCount ? ` · ${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : ''}
      </Text>
      {pairs.map(({ key, val }) => (
        <View key={key} style={styles.avgRow}>
          {/* Icon + label */}
          <View style={styles.avgLabelWrap}>
            <Ionicons
              name={CATEGORY_RATING_ICONS[key] as any}
              size={13}
              color={Colors.muted}
            />
            <Text style={styles.avgLabel}>{CATEGORY_RATING_LABELS[key]}</Text>
          </View>

          {/* Bar track */}
          <View style={styles.avgTrack}>
            <View style={[styles.avgFill, { width: `${(val / 5) * 100}%` as any, backgroundColor: starColor(val) }]} />
          </View>

          {/* Numeric score */}
          <Text style={[styles.avgNum, { color: starColor(val) }]}>{val.toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Breakdown (single review)
  breakdownWrap: { gap: 6 },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  breakdownLabel: { flex: 1, fontSize: 11, color: Colors.muted },
  breakdownDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakdownNum: { fontSize: 11, fontWeight: '700', width: 26, textAlign: 'right' },

  // Averages panel
  avgPanel: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 11,
  },
  avgTitle: { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avgLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 150 },
  avgLabel: { fontSize: 13, color: Colors.text, flex: 1 },
  avgTrack: {
    flex: 1,
    height: 7,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  avgFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  avgNum: { fontSize: 13, fontWeight: '700', width: 30, textAlign: 'right' },
});
