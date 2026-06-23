/**
 * TrustLevelCard — full-width card for profile pages.
 *
 * Shows:
 *  - Current level badge (large icon + name + "Level N")
 *  - Perks list for current level (checkmarks)
 *  - Animated progress bar to next level
 *  - All 5 levels as a journey track (dots)
 *  - Next level perks preview (locked)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../utils/colors';
import {
  TRUST_LEVELS,
  getTrustLevel,
  getTrustLevelProgress,
  TrustLevelDef,
} from '../utils/trust';

interface TrustLevelCardProps {
  score: number;
}

export function TrustLevelCard({ score }: TrustLevelCardProps) {
  const progress = getTrustLevelProgress(score);
  const { current, next } = progress;
  const barAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress.progressPct,
      duration: 800,
      delay: 150,
      useNativeDriver: false,
    }).start();
  }, [progress.progressPct]);

  return (
    <View style={styles.card}>
      {/* ── Level hero ─────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: current.bg }]}>
        <View style={[styles.heroIcon, { backgroundColor: current.color + '22', borderColor: current.color + '55' }]}>
          <Ionicons name={current.icon as any} size={36} color={current.color} />
        </View>
        <View style={styles.heroText}>
          <View style={styles.heroNameRow}>
            <Text style={[styles.heroName, { color: current.color }]}>{current.name}</Text>
            <View style={[styles.levelNumBadge, { backgroundColor: current.color }]}>
              <Text style={styles.levelNumText}>LEVEL {current.level}</Text>
            </View>
          </View>
          <Text style={[styles.heroDesc, { color: current.color + 'CC' }]}>
            {current.description}
          </Text>
        </View>
      </View>

      {/* ── Journey track ──────────────────────────────────── */}
      <View style={styles.journeySection}>
        <JourneyTrack score={score} current={current} />
      </View>

      {/* ── Progress to next level ─────────────────────────── */}
      {next ? (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progress to {next.name}</Text>
            <Text style={[styles.progressScore, { color: current.color }]}>
              {score}<Text style={styles.progressMax}>/{next.minScore}</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: current.color,
                  width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {progress.pointsToNext === 1
              ? '1 more point to level up!'
              : `${progress.pointsToNext} more points to level up`}
          </Text>
        </View>
      ) : (
        <View style={styles.maxSection}>
          <Ionicons name="trophy" size={20} color="#D97706" />
          <Text style={styles.maxText}>Maximum level reached — you're a TeenWorks Legend!</Text>
        </View>
      )}

      {/* ── Current level perks ────────────────────────────── */}
      <View style={styles.perksSection}>
        <Text style={styles.perksTitle}>
          <Ionicons name="checkmark-circle" size={14} color={current.color} /> Your Perks
        </Text>
        <View style={styles.perksList}>
          {current.perks.map((perk, i) => (
            <View key={i} style={styles.perkRow}>
              <View style={[styles.perkDot, { backgroundColor: current.color }]} />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Next level perks preview ───────────────────────── */}
      {next && (
        <View style={styles.nextPerksSection}>
          <View style={styles.nextPerksHeader}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.muted} />
            <Text style={styles.nextPerksTitle}>Unlock at {next.name}</Text>
          </View>
          <View style={styles.perksList}>
            {next.perks.slice(0, 3).map((perk, i) => (
              <View key={i} style={styles.perkRow}>
                <View style={[styles.perkDot, { backgroundColor: Colors.muted }]} />
                <Text style={[styles.perkText, { color: Colors.muted }]}>{perk}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Journey Track ─────────────────────────────────────────────

function JourneyTrack({ score, current }: { score: number; current: TrustLevelDef }) {
  return (
    <View style={jt.wrap}>
      {TRUST_LEVELS.map((lv, idx) => {
        const isReached  = score >= lv.minScore;
        const isCurrent  = lv.level === current.level;
        const isNext     = idx > 0 && score < lv.minScore && score >= TRUST_LEVELS[idx - 1].minScore;

        return (
          <React.Fragment key={lv.level}>
            {/* Connector line */}
            {idx > 0 && (
              <View
                style={[
                  jt.line,
                  { backgroundColor: score >= lv.minScore ? current.color : Colors.border },
                ]}
              />
            )}

            {/* Node */}
            <View style={jt.nodeWrap}>
              <View
                style={[
                  jt.node,
                  isCurrent && { borderColor: lv.color, backgroundColor: lv.bg, borderWidth: 2 },
                  isReached && !isCurrent && { backgroundColor: lv.color, borderColor: lv.color },
                  !isReached && !isCurrent && { backgroundColor: Colors.border, borderColor: Colors.border },
                ]}
              >
                {isReached ? (
                  <Ionicons name={lv.icon as any} size={isCurrent ? 14 : 12} color={isCurrent ? lv.color : '#fff'} />
                ) : (
                  <Text style={[jt.nodeNum, { color: Colors.muted }]}>{lv.level}</Text>
                )}
              </View>
              <Text
                style={[
                  jt.nodeLabel,
                  isCurrent && { color: lv.color, fontWeight: '700' },
                  !isReached && { color: Colors.muted },
                ]}
                numberOfLines={2}
              >
                {lv.name.replace(' ', '\n')}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const jt = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 13,
    borderRadius: 1,
  },
  nodeWrap: {
    alignItems: 'center',
    gap: 5,
    maxWidth: 52,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  nodeNum: { fontSize: 11, fontWeight: '700' },
  nodeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 12,
  },
});

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.md,
  },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    flexShrink: 0,
  },
  heroText: { flex: 1, gap: 5 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  levelNumBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  levelNumText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  heroDesc: { fontSize: 13, lineHeight: 18 },

  // Journey
  journeySection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // Progress
  progressSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  progressScore: { fontSize: 16, fontWeight: '900' },
  progressMax: { fontSize: 12, fontWeight: '400', color: Colors.muted },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  progressHint: { fontSize: 11, color: Colors.muted },

  // Max level
  maxSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FEF3C7',
  },
  maxText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },

  // Perks
  perksSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  perksTitle: { fontSize: 13, fontWeight: '800', color: Colors.text },
  perksList: { gap: 7 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  perkText: { fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },

  // Next level perks
  nextPerksSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
    backgroundColor: Colors.background,
  },
  nextPerksHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nextPerksTitle: { fontSize: 12, fontWeight: '700', color: Colors.muted },
});
