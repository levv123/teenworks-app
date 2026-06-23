/**
 * TrustBadge — compact, reusable trust signal.
 *
 * Sizes:
 *   xs  — icon + number only (worker cards, tight lists)
 *   sm  — icon + number + short label  (service cards, search results)
 *   md  — icon + number + label + thin progress bar  (section headers)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../utils/colors';
import { trustLabel } from '../utils/trust';

export type TrustBadgeSize = 'xs' | 'sm' | 'md';

interface TrustBadgeProps {
  score: number;
  size?: TrustBadgeSize;
  /** Show progress bar (only meaningful for md) */
  showBar?: boolean;
  /** Override the auto-derived label */
  labelOverride?: string;
}

export function TrustBadge({ score, size = 'sm', showBar, labelOverride }: TrustBadgeProps) {
  const trust = trustLabel(score);
  const label = labelOverride ?? trust.label;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: score / 100,
      duration: 700,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  if (size === 'xs') {
    return (
      <View style={[styles.xs, { backgroundColor: trust.bg }]}>
        <Ionicons name={trust.icon as any} size={10} color={trust.color} />
        <Text style={[styles.xsNum, { color: trust.color }]}>{score}</Text>
      </View>
    );
  }

  if (size === 'sm') {
    return (
      <View style={[styles.sm, { backgroundColor: trust.bg }]}>
        <Ionicons name={trust.icon as any} size={12} color={trust.color} />
        <Text style={[styles.smNum, { color: trust.color }]}>{score}</Text>
        <Text style={[styles.smLabel, { color: trust.color }]}>· {label}</Text>
      </View>
    );
  }

  // md
  return (
    <View style={[styles.md, { backgroundColor: trust.bg, borderColor: trust.color + '33' }]}>
      <View style={styles.mdTop}>
        <Ionicons name={trust.icon as any} size={16} color={trust.color} />
        <Text style={[styles.mdScore, { color: trust.color }]}>{score}<Text style={styles.mdOf}>/100</Text></Text>
        <View style={[styles.mdLabelPill, { backgroundColor: trust.color + '22' }]}>
          <Text style={[styles.mdLabelText, { color: trust.color }]}>{label}</Text>
        </View>
      </View>
      {(showBar ?? true) && (
        <View style={styles.mdBarTrack}>
          <Animated.View
            style={[
              styles.mdBarFill,
              {
                backgroundColor: trust.color,
                width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // xs
  xs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  xsNum: { fontSize: 10, fontWeight: '800' },

  // sm
  sm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  smNum: { fontSize: 12, fontWeight: '800' },
  smLabel: { fontSize: 11, fontWeight: '600' },

  // md
  md: {
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    gap: 8,
  },
  mdTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mdScore: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  mdOf: { fontSize: 13, fontWeight: '500' },
  mdLabelPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  mdLabelText: { fontSize: 12, fontWeight: '700' },
  mdBarTrack: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  mdBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
