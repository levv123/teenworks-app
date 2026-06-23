/**
 * TrustSignalBar
 *
 * A horizontally-scrollable strip of trust data points shown wherever
 * clients make hiring decisions. Renders only the signals that have data.
 *
 * Examples:
 *   Trusted by 32 clients · 94 Trust Score · 98% Completion · 7 Repeat Clients
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../utils/colors';
import { getTrustLevel } from '../utils/trust';

export interface TrustSignals {
  trustScore?: number | null;
  trustLevel?: number | null;
  reviewCount?: number | null;
  completionRate?: number | null;
  repeatClientRate?: number | null;
  totalBookings?: number | null;
  completedBookings?: number | null;
}

interface SignalItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  highlight?: boolean;
}

function buildSignals(s: TrustSignals): SignalItem[] {
  const items: SignalItem[] = [];

  // Trust score — most prominent, shown first
  if (s.trustScore != null && s.trustScore > 0) {
    const lvl = getTrustLevel(s.trustScore);
    items.push({
      icon: lvl.icon as keyof typeof Ionicons.glyphMap,
      label: `${s.trustScore} Trust Score`,
      color: lvl.color,
      bg: lvl.bg,
      highlight: true,
    });
  }

  // Trusted by N clients (review_count)
  if (s.reviewCount != null && s.reviewCount > 0) {
    items.push({
      icon: 'people',
      label: `Trusted by ${s.reviewCount} client${s.reviewCount !== 1 ? 's' : ''}`,
      color: '#8B5CF6',
      bg: '#F5F3FF',
    });
  }

  // Completion rate
  if (s.completionRate != null && s.completionRate > 0 && (s.totalBookings ?? 0) >= 3) {
    const color = s.completionRate >= 95 ? Colors.success
      : s.completionRate >= 80 ? Colors.warning
      : Colors.error;
    items.push({
      icon: 'checkmark-circle',
      label: `${Math.round(s.completionRate)}% Completion`,
      color,
      bg: color + '18',
    });
  }

  // Repeat clients
  if (s.repeatClientRate != null && s.repeatClientRate > 0 && (s.totalBookings ?? 0) >= 3) {
    const repeatCount = Math.round(((s.repeatClientRate / 100) * (s.completedBookings ?? s.totalBookings ?? 0)));
    if (repeatCount > 0) {
      items.push({
        icon: 'repeat',
        label: `${repeatCount} Repeat Client${repeatCount !== 1 ? 's' : ''}`,
        color: Colors.primary,
        bg: Colors.primaryLight,
      });
    }
  }

  // Jobs completed (only if no completion rate available, to avoid duplication)
  if (
    s.completedBookings != null &&
    s.completedBookings >= 5 &&
    s.completionRate == null
  ) {
    items.push({
      icon: 'briefcase',
      label: `${s.completedBookings} Jobs Done`,
      color: Colors.info,
      bg: Colors.infoLight,
    });
  }

  return items;
}

interface Props {
  signals: TrustSignals;
  /** 'scroll' wraps in horizontal ScrollView; 'wrap' wraps naturally */
  layout?: 'scroll' | 'wrap';
  size?: 'sm' | 'md';
}

export function TrustSignalBar({ signals, layout = 'scroll', size = 'md' }: Props) {
  const items = buildSignals(signals);
  if (items.length === 0) return null;

  const pillStyle = size === 'sm' ? styles.pillSm : styles.pillMd;
  const iconSize = size === 'sm' ? 11 : 13;
  const textStyle = size === 'sm' ? styles.pillTextSm : styles.pillTextMd;

  const pills = items.map((item) => (
    <View
      key={item.label}
      style={[
        styles.pill,
        pillStyle,
        { backgroundColor: item.bg },
        item.highlight && styles.pillHighlight,
        item.highlight && { borderColor: item.color + '55' },
      ]}
    >
      <Ionicons name={item.icon} size={iconSize} color={item.color} />
      <Text style={[styles.pillText, textStyle, { color: item.color }]}>
        {item.label}
      </Text>
    </View>
  ));

  if (layout === 'wrap') {
    return <View style={styles.wrapRow}>{pills}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollRow}
    >
      {pills}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillMd: { paddingHorizontal: 10, paddingVertical: 5 },
  pillSm: { paddingHorizontal: 8, paddingVertical: 3 },
  pillHighlight: { borderWidth: 1.5 },

  pillText: { fontWeight: '700' },
  pillTextMd: { fontSize: 12 },
  pillTextSm: { fontSize: 11 },
});
