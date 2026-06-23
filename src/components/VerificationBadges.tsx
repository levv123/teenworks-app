/**
 * VerificationBadges — prominent display of all 5 verification badges.
 *
 * Earned badges glow with their color; locked badges show as grayed with
 * a lock icon and a short "how to earn" CTA.
 *
 * Props:
 *   profile   — object with the 5 boolean flags
 *   compact   — 2-col grid (default) vs horizontal strip (compact=true)
 *   showScore — show the verification trust contribution header (default true)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../utils/colors';
import { VERIFICATION_BADGES, VerificationBadgeDef } from '../utils/trust';

interface ProfileVerification {
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  parent_approved: boolean;
  verified_professional?: boolean;
}

interface VerificationBadgesProps {
  profile: ProfileVerification;
  compact?: boolean;
  showScore?: boolean;
  /** Called when user taps a locked badge CTA */
  onVerifyPress?: (badge: VerificationBadgeDef) => void;
}

export function VerificationBadges({
  profile,
  compact = false,
  showScore = true,
  onVerifyPress,
}: VerificationBadgesProps) {
  const earnedCount = VERIFICATION_BADGES.filter((b) => !!(profile as any)[b.key]).length;
  const totalPts    = VERIFICATION_BADGES
    .filter((b) => !!(profile as any)[b.key])
    .reduce((s, b) => s + b.trustPts, 0);

  if (compact) {
    return (
      <View style={cs.strip}>
        {VERIFICATION_BADGES.map((badge) => {
          const earned = !!(profile as any)[badge.key];
          return (
            <CompactBadge key={badge.key} badge={badge} earned={earned} />
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* Score header */}
      {showScore && (
        <View style={styles.scoreHeader}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreCount}>
              <Text style={styles.scoreCountNum}>{earnedCount}</Text>
              <Text style={styles.scoreCountOf}>/5</Text>
            </Text>
            <Text style={styles.scoreLabel}>Verified</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreRight}>
            <Text style={styles.scorePts}>{totalPts}<Text style={styles.scorePtsSuffix}>/100</Text></Text>
            <Text style={styles.scoreLabel}>Verification Score</Text>
          </View>
          <View style={styles.scoreBarWrap}>
            <ScoreBar pct={totalPts / 100} />
          </View>
        </View>
      )}

      {/* 2-column grid */}
      <View style={styles.grid}>
        {VERIFICATION_BADGES.map((badge) => {
          const earned = !!(profile as any)[badge.key];
          return (
            <BadgeCard
              key={badge.key}
              badge={badge}
              earned={earned}
              onVerifyPress={onVerifyPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────

function ScoreBar({ pct }: { pct: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 700, delay: 200, useNativeDriver: false }).start();
  }, [pct]);

  const color = pct >= 0.8 ? Colors.success : pct >= 0.5 ? Colors.warning : Colors.error;

  return (
    <View style={sb.track}>
      <Animated.View
        style={[sb.fill, {
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]}
      />
    </View>
  );
}
const sb = StyleSheet.create({
  track: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', flex: 1 },
  fill:  { height: '100%', borderRadius: 2 },
});

// ── BadgeCard ─────────────────────────────────────────────────

function BadgeCard({
  badge, earned, onVerifyPress,
}: {
  badge: VerificationBadgeDef;
  earned: boolean;
  onVerifyPress?: (badge: VerificationBadgeDef) => void;
}) {
  const pulseAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!earned) return;
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, delay: 200, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }),
    ]).start();
  }, [earned]);

  return (
    <Animated.View
      style={[
        bc.card,
        earned
          ? { backgroundColor: badge.bg, borderColor: badge.color + '55' }
          : { backgroundColor: Colors.card, borderColor: Colors.border },
        earned && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* Icon area */}
      <View style={[bc.iconWrap, { backgroundColor: earned ? badge.color + '18' : Colors.border }]}>
        <Ionicons
          name={(earned ? badge.icon : badge.iconOutline) as any}
          size={24}
          color={earned ? badge.color : Colors.muted}
        />
        {/* Earned checkmark overlay */}
        {earned && (
          <View style={[bc.checkOverlay, { backgroundColor: badge.color }]}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
        {/* Locked icon overlay */}
        {!earned && (
          <View style={bc.lockOverlay}>
            <Ionicons name="lock-closed" size={9} color={Colors.muted} />
          </View>
        )}
      </View>

      {/* Text */}
      <Text style={[bc.label, { color: earned ? badge.color : Colors.muted }]} numberOfLines={2}>
        {badge.label}
      </Text>

      {/* Trust pts pill */}
      <View style={[bc.ptsPill, { backgroundColor: earned ? badge.color : Colors.border }]}>
        <Ionicons name="shield-checkmark" size={9} color={earned ? '#fff' : Colors.muted} />
        <Text style={[bc.ptsText, { color: earned ? '#fff' : Colors.muted }]}>
          +{badge.trustPts}
        </Text>
      </View>

      {/* Earned sub-label */}
      {earned && (
        <Text style={[bc.earnedSub, { color: badge.color + 'BB' }]}>Verified ✓</Text>
      )}

      {/* Locked CTA */}
      {!earned && onVerifyPress && (
        <TouchableOpacity
          style={bc.ctaBtn}
          onPress={() => onVerifyPress(badge)}
          activeOpacity={0.8}
        >
          <Text style={bc.ctaText}>Verify →</Text>
        </TouchableOpacity>
      )}
      {!earned && !onVerifyPress && (
        <Text style={bc.lockedHint} numberOfLines={2}>{badge.howToEarn}</Text>
      )}
    </Animated.View>
  );
}

const bc = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: 7,
    alignItems: 'center',
    ...Shadow.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkOverlay: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  ptsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  ptsText: { fontSize: 10, fontWeight: '800' },
  earnedSub: { fontSize: 10, fontWeight: '600' },
  ctaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
  },
  ctaText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  lockedHint: { fontSize: 10, color: Colors.muted, textAlign: 'center', lineHeight: 14 },
});

// ── CompactBadge (strip variant) ──────────────────────────────

function CompactBadge({ badge, earned }: { badge: VerificationBadgeDef; earned: boolean }) {
  return (
    <View style={[
      cb.chip,
      earned
        ? { backgroundColor: badge.bg, borderColor: badge.color + '55' }
        : { backgroundColor: Colors.border, borderColor: 'transparent' },
    ]}>
      <Ionicons
        name={(earned ? badge.icon : badge.iconOutline) as any}
        size={13}
        color={earned ? badge.color : Colors.muted}
      />
      <Text style={[cb.label, { color: earned ? badge.color : Colors.muted }]}>
        {badge.label.replace(' Verified', '').replace(' Approved', '').replace(' Professional', ' Pro')}
      </Text>
      {!earned && <Ionicons name="lock-closed" size={9} color={Colors.muted} />}
    </View>
  );
}

const cb = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: '600' },
});

// ── Main styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },

  // Score header
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
    flexWrap: 'wrap',
  },
  scoreLeft:  { alignItems: 'center', gap: 1 },
  scoreRight: { alignItems: 'center', gap: 1 },
  scoreCount: { lineHeight: 32 },
  scoreCountNum: { fontSize: 28, fontWeight: '900', color: Colors.text },
  scoreCountOf:  { fontSize: 14, fontWeight: '600', color: Colors.muted },
  scoreLabel: { fontSize: 10, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  scorePts:   { fontSize: 22, fontWeight: '900', color: Colors.text },
  scorePtsSuffix: { fontSize: 12, fontWeight: '500', color: Colors.muted },
  scoreDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  scoreBarWrap: { flex: 1, minWidth: 80 },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});

const cs = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
