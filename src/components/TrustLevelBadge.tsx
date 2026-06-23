/**
 * TrustLevelBadge — shows a provider's Trust Level (1–5).
 *
 * Sizes:
 *   xs  — small numbered shield, for search cards / lists
 *   sm  — icon + level number + name, for profile hero rows
 *   md  — icon + name + "Level N" pill + progress bar to next level
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../utils/colors';
import {
  getTrustLevel,
  getTrustLevelByNum,
  getTrustLevelProgress,
  TrustLevelNum,
} from '../utils/trust';

export type TrustLevelBadgeSize = 'xs' | 'sm' | 'md';

interface TrustLevelBadgeProps {
  /** Provide either score (computes level) or explicit level number */
  score?: number;
  level?: TrustLevelNum;
  size?: TrustLevelBadgeSize;
}

export function TrustLevelBadge({ score, level, size = 'sm' }: TrustLevelBadgeProps) {
  const def = level != null
    ? getTrustLevelByNum(level)
    : getTrustLevel(score ?? 0);

  if (size === 'xs') return <XsBadge def={def} />;
  if (size === 'sm') return <SmBadge def={def} />;
  return <MdBadge def={def} score={score ?? 0} />;
}

// ── XS ────────────────────────────────────────────────────────
// Compact numbered shield — fits inline in cards

function XsBadge({ def }: { def: ReturnType<typeof getTrustLevel> }) {
  return (
    <View style={[xs.wrap, { backgroundColor: def.bg, borderColor: def.color + '55' }]}>
      <Ionicons name={def.icon as any} size={12} color={def.color} />
      <Text style={[xs.num, { color: def.color }]}>{def.level}</Text>
    </View>
  );
}

const xs = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  num: { fontSize: 11, fontWeight: '800' },
});

// ── SM ────────────────────────────────────────────────────────
// Icon + "Level N · Name" — for profile hero badge rows

function SmBadge({ def }: { def: ReturnType<typeof getTrustLevel> }) {
  return (
    <View style={[sm.wrap, { backgroundColor: def.bg, borderColor: def.color + '44' }]}>
      <Ionicons name={def.icon as any} size={14} color={def.color} />
      <Text style={[sm.level, { color: def.color }]}>Lvl {def.level}</Text>
      <Text style={[sm.dot, { color: def.color + '88' }]}>·</Text>
      <Text style={[sm.name, { color: def.color }]}>{def.name}</Text>
    </View>
  );
}

const sm = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  level: { fontSize: 12, fontWeight: '800' },
  dot:   { fontSize: 12 },
  name:  { fontSize: 12, fontWeight: '700' },
});

// ── MD ────────────────────────────────────────────────────────
// Full pill with name, level number, and animated progress bar

function MdBadge({ def, score }: { def: ReturnType<typeof getTrustLevel>; score: number }) {
  const progress = getTrustLevelProgress(score);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress.progressPct,
      duration: 700,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [progress.progressPct]);

  return (
    <View style={[md.wrap, { borderColor: def.color + '44' }]}>
      {/* Icon + title row */}
      <View style={md.titleRow}>
        <View style={[md.iconCircle, { backgroundColor: def.bg }]}>
          <Ionicons name={def.icon as any} size={20} color={def.color} />
        </View>
        <View style={md.titleText}>
          <View style={md.nameRow}>
            <Text style={[md.name, { color: def.color }]}>{def.name}</Text>
            <View style={[md.levelPill, { backgroundColor: def.color }]}>
              <Text style={md.levelPillText}>LEVEL {def.level}</Text>
            </View>
          </View>
          <Text style={md.description}>{def.description}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={md.progressSection}>
        <View style={md.progressTrack}>
          <Animated.View
            style={[
              md.progressFill,
              {
                backgroundColor: def.color,
                width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
        <Text style={md.progressLabel}>
          {progress.next
            ? `${progress.pointsToNext} pts to ${progress.next.name}`
            : '🏆 Maximum level reached!'}
        </Text>
      </View>
    </View>
  );
}

const md = StyleSheet.create({
  wrap: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleText: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '800' },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  levelPillText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  description: { fontSize: 12, color: Colors.muted, lineHeight: 17 },
  progressSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  progressLabel: { fontSize: 11, color: Colors.muted },
});
