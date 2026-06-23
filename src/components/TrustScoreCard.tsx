/**
 * TrustScoreCard — animated breakdown of a provider's Trust Score.
 *
 * Hero: large score + tier badge + overall fill bar
 * Factors: per-factor score (0–100), weight %, animated bar, detail + tip
 *
 * Example output:
 *   Reviews           96  ████████████████████░  35%
 *   Completion Rate   98  ████████████████████░  25%
 *   Response Speed    92  ███████████████████░░  20%
 *   Repeat Clients    88  ██████████████████░░░  10%
 *   Verification     100  ████████████████████░  10%
 *   Final Score: 94
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../utils/colors';
import { TrustBreakdown, TrustFactor, trustLabel } from '../utils/trust';

interface TrustScoreCardProps {
  breakdown: TrustBreakdown;
}

export function TrustScoreCard({ breakdown }: TrustScoreCardProps) {
  const { score, factors } = breakdown;
  const trust = trustLabel(score);
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: score / 100,
      duration: 900,
      delay: 100,
      useNativeDriver: false,
    }).start();
  }, [score]);

  return (
    <View style={styles.card}>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={[styles.scoreNum, { color: trust.color }]}>{score}</Text>
          <Text style={styles.scoreOf}>/100</Text>
        </View>
        <View style={styles.heroRight}>
          <View style={[styles.tierBadge, { backgroundColor: trust.bg }]}>
            <Ionicons name={trust.icon as any} size={14} color={trust.color} />
            <Text style={[styles.tierLabel, { color: trust.color }]}>{trust.label}</Text>
          </View>
          <Text style={styles.heroSub}>
            {score >= 80
              ? 'Clients can hire with full confidence.'
              : score >= 55
              ? 'Building a solid reputation.'
              : score >= 30
              ? 'Keep completing jobs to grow trust.'
              : 'New on TeenWorks — start your journey!'}
          </Text>
          <View style={styles.overallTrack}>
            <Animated.View
              style={[
                styles.overallFill,
                {
                  backgroundColor: trust.color,
                  width: scoreAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* ── Score table header ─────────────────────────────────── */}
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderLabel}>Factor</Text>
        <View style={styles.tableHeaderRight}>
          <Text style={styles.tableHeaderScore}>Score</Text>
          <Text style={styles.tableHeaderWeight}>Weight</Text>
        </View>
      </View>

      {/* ── Factor rows ───────────────────────────────────────── */}
      {factors.map((factor, i) => (
        <FactorRow key={factor.id} factor={factor} delay={i * 90} isLast={i === factors.length - 1} />
      ))}

      {/* ── Final score summary bar ────────────────────────────── */}
      <View style={[styles.finalRow, { borderTopColor: trust.color + '44' }]}>
        <View style={styles.finalLeft}>
          <Ionicons name={trust.icon as any} size={16} color={trust.color} />
          <Text style={styles.finalLabel}>Final Score</Text>
        </View>
        <Text style={[styles.finalScore, { color: trust.color }]}>{score}</Text>
      </View>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.muted} />
        <Text style={styles.footerText}>
          Score updates automatically as you complete jobs, earn reviews, and verify your account.
        </Text>
      </View>
    </View>
  );
}

// ── FactorRow ─────────────────────────────────────────────────

function FactorRow({
  factor,
  delay,
  isLast,
}: {
  factor: TrustFactor;
  delay: number;
  isLast: boolean;
}) {
  const barAnim = useRef(new Animated.Value(0)).current;
  const pct = factor.score / 100;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 650,
      delay: 280 + delay,
      useNativeDriver: false,
    }).start();
  }, [pct, delay]);

  const barColor = pct >= 0.8 ? Colors.success : pct >= 0.5 ? Colors.warning : Colors.error;

  return (
    <View style={[styles.factorRow, !isLast && styles.factorRowBorder]}>
      {/* Left: icon + label + detail */}
      <View style={styles.factorLeft}>
        <View style={[styles.factorIconWrap, { backgroundColor: barColor + '18' }]}>
          <Ionicons name={factor.icon as any} size={15} color={barColor} />
        </View>
        <View style={styles.factorText}>
          <View style={styles.factorTitleRow}>
            <Text style={styles.factorLabel}>{factor.label}</Text>
          </View>
          {/* Progress bar */}
          <View style={styles.factorTrack}>
            <Animated.View
              style={[
                styles.factorFill,
                {
                  backgroundColor: barColor,
                  width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
          <Text style={styles.factorDetail} numberOfLines={1}>{factor.detail}</Text>
          {factor.tip && (
            <View style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={11} color={Colors.warning} />
              <Text style={styles.tipText}>{factor.tip}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right: score number + weight badge */}
      <View style={styles.factorRight}>
        <Text style={[styles.factorScore, { color: barColor }]}>{factor.score}</Text>
        <View style={styles.weightBadge}>
          <Text style={styles.weightText}>{factor.weight}%</Text>
        </View>
      </View>
    </View>
  );
}

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
    backgroundColor: Colors.background,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  scoreNum: { fontSize: 56, fontWeight: '900', lineHeight: 60 },
  scoreOf:  { fontSize: 18, fontWeight: '700', color: Colors.muted, marginBottom: 8 },
  heroRight: { flex: 1, gap: 8 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tierLabel: { fontSize: 13, fontWeight: '700' },
  heroSub:   { fontSize: 12, color: Colors.muted, lineHeight: 17 },
  overallTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  overallFill: { height: '100%', borderRadius: Radius.full },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderLabel:  { fontSize: 10, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableHeaderRight:  { flexDirection: 'row', gap: 20 },
  tableHeaderScore:  { fontSize: 10, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, width: 38, textAlign: 'right' },
  tableHeaderWeight: { fontSize: 10, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, width: 36, textAlign: 'right' },

  // Factor rows
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: 10,
  },
  factorRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  factorLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  factorIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  factorText: { flex: 1, gap: 5 },
  factorTitleRow: { flexDirection: 'row', alignItems: 'center' },
  factorLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  factorTrack: {
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  factorFill: { height: '100%', borderRadius: Radius.full },
  factorDetail: { fontSize: 11, color: Colors.muted, lineHeight: 15 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  tipText: { fontSize: 11, color: Colors.warning, flex: 1, lineHeight: 15 },

  // Right column
  factorRight: { alignItems: 'flex-end', gap: 5, paddingTop: 2 },
  factorScore: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  weightBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  weightText: { fontSize: 10, fontWeight: '700', color: Colors.muted },

  // Final score row
  finalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderTopWidth: 2,
    backgroundColor: Colors.background,
  },
  finalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  finalLabel: { fontSize: 14, fontWeight: '800', color: Colors.text },
  finalScore: { fontSize: 28, fontWeight: '900' },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: { flex: 1, fontSize: 11, color: Colors.muted, lineHeight: 16 },
});
