import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getProviderReviewsForUser } from '../../api/reviews';
import { Review } from '../../types';
import {
  computeTrustBreakdown,
  computeImprovementSuggestions,
  ImprovementSuggestion,
  TrustFactor,
  getTrustLevelProgress,
  getTrustLevel,
  trustLabel,
  VERIFICATION_BADGES,
  TRUST_LEVELS,
} from '../../utils/trust';

type Props = NativeStackScreenProps<ProfileStackParamList, 'TrustCenter'>;

// ── Animated score ring ───────────────────────────────────────

const RING_SIZE = 148;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ score, color }: { score: number; color: string }) {
  const animPct = useRef(new Animated.Value(0)).current;
  const scalePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animPct, {
      toValue: score / 100,
      duration: 900,
      useNativeDriver: false,
    }).start(() => {
      Animated.sequence([
        Animated.timing(scalePulse, { toValue: 1.04, duration: 120, useNativeDriver: true }),
        Animated.timing(scalePulse, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start();
    });
  }, [score]);

  const strokeDashoffset = animPct.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <Animated.View style={[styles.ringWrap, { transform: [{ scale: scalePulse }] }]}>
      {/* Background track */}
      <View style={styles.ringTrack} />
      {/* Score label centered */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringScore, { color }]}>{score}</Text>
        <Text style={styles.ringLabel}>Trust Score</Text>
      </View>
    </Animated.View>
  );
}

// ── Factor row ────────────────────────────────────────────────

function FactorBar({ factor, index }: { factor: TrustFactor; index: number }) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: factor.score / 100,
      duration: 500,
      delay: index * 80,
      useNativeDriver: false,
    }).start();
  }, [factor.score]);

  const barColor = factor.score >= 80 ? Colors.success : factor.score >= 50 ? Colors.warning : Colors.error;
  const contribution = Math.round((factor.score * factor.weight) / 100);

  return (
    <View style={styles.factorRow}>
      <View style={[styles.factorIconWrap, { backgroundColor: barColor + '18' }]}>
        <Ionicons name={factor.icon as any} size={17} color={barColor} />
      </View>
      <View style={styles.factorBody}>
        <View style={styles.factorTop}>
          <Text style={styles.factorLabel}>{factor.label}</Text>
          <View style={styles.factorRight}>
            <Text style={[styles.factorScore, { color: barColor }]}>{factor.score}</Text>
            <Text style={styles.factorWeight}>{factor.weight}%</Text>
          </View>
        </View>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { backgroundColor: barColor, width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
          />
        </View>
        <Text style={styles.factorDetail}>{factor.detail}</Text>
      </View>
    </View>
  );
}

// ── Verification status row ───────────────────────────────────

function VerificationRow({
  profile,
}: {
  profile: { email_verified: boolean; phone_verified: boolean; identity_verified: boolean; parent_approved: boolean; verified_professional?: boolean };
}) {
  const earned = VERIFICATION_BADGES.filter((b) => (profile as any)[b.key]);
  const missing = VERIFICATION_BADGES.filter((b) => !(profile as any)[b.key]);
  const totalPts = earned.reduce((s, b) => s + b.trustPts, 0);

  return (
    <View style={styles.verificationCard}>
      {/* Score bar */}
      <View style={styles.verifyHeader}>
        <View style={styles.verifyHeaderLeft}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
          <Text style={styles.verifyTitle}>Verification Status</Text>
        </View>
        <View style={styles.verifyPtsBadge}>
          <Text style={styles.verifyPtsText}>{totalPts}/100 pts</Text>
        </View>
      </View>

      {/* Badges grid */}
      <View style={styles.badgeGrid}>
        {VERIFICATION_BADGES.map((badge) => {
          const isEarned = (profile as any)[badge.key];
          return (
            <View
              key={badge.key}
              style={[styles.badgeItem, { backgroundColor: isEarned ? badge.bg : Colors.background, borderColor: isEarned ? badge.color + '44' : Colors.border }]}
            >
              <View style={[styles.badgeIconCircle, { backgroundColor: isEarned ? badge.color + '22' : Colors.border }]}>
                <Ionicons
                  name={(isEarned ? badge.icon : badge.iconOutline) as any}
                  size={18}
                  color={isEarned ? badge.color : Colors.muted}
                />
                {isEarned && (
                  <View style={styles.badgeCheck}>
                    <Ionicons name="checkmark" size={8} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[styles.badgeName, { color: isEarned ? badge.color : Colors.muted }]} numberOfLines={2}>
                {badge.label}
              </Text>
              <Text style={[styles.badgePts, { color: isEarned ? badge.color : Colors.muted }]}>
                {isEarned ? `+${badge.trustPts}` : `+${badge.trustPts} pts`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Suggestion card ───────────────────────────────────────────

const DIFF_LABELS: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFF_COLORS: Record<string, string> = { easy: Colors.success, medium: Colors.warning, hard: Colors.error };

function SuggestionCard({
  suggestion,
  index,
  onAction,
}: {
  suggestion: ImprovementSuggestion;
  index: number;
  onAction: (s: ImprovementSuggestion) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.suggestionCard}
        onPress={() => onAction(suggestion)}
        activeOpacity={0.82}
      >
        {/* Left: icon */}
        <View style={[styles.suggIconWrap, { backgroundColor: suggestion.bg }]}>
          <Ionicons name={suggestion.icon as any} size={22} color={suggestion.color} />
        </View>

        {/* Middle: text */}
        <View style={styles.suggBody}>
          <Text style={styles.suggTitle}>{suggestion.title}</Text>
          <Text style={styles.suggDesc} numberOfLines={2}>{suggestion.description}</Text>
          <View style={styles.suggMeta}>
            <View style={[styles.diffBadge, { backgroundColor: DIFF_COLORS[suggestion.difficulty] + '18' }]}>
              <Text style={[styles.diffText, { color: DIFF_COLORS[suggestion.difficulty] }]}>
                {DIFF_LABELS[suggestion.difficulty]}
              </Text>
            </View>
          </View>
        </View>

        {/* Right: gain + arrow */}
        <View style={styles.suggRight}>
          <View style={[styles.gainBadge, { backgroundColor: suggestion.bg }]}>
            <Ionicons name="trending-up" size={11} color={suggestion.color} />
            <Text style={[styles.gainText, { color: suggestion.color }]}>+{suggestion.estimatedGain}</Text>
          </View>
          <TouchableOpacity
            style={[styles.suggCta, { backgroundColor: suggestion.color }]}
            onPress={() => onAction(suggestion)}
          >
            <Text style={styles.suggCtaText}>{suggestion.ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Next level CTA ────────────────────────────────────────────

function NextLevelBanner({ score }: { score: number }) {
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

  if (!progress.next) {
    return (
      <View style={[styles.nextLevelBanner, { backgroundColor: '#FDE68A' }]}>
        <View style={styles.nextLevelLeft}>
          <Ionicons name="trophy" size={28} color="#D97706" />
          <View>
            <Text style={[styles.nextLevelName, { color: '#92400E' }]}>TeenWorks Legend</Text>
            <Text style={[styles.nextLevelSub, { color: '#B45309' }]}>You've reached the highest level!</Text>
          </View>
        </View>
        <Ionicons name="checkmark-circle" size={28} color="#D97706" />
      </View>
    );
  }

  return (
    <View style={[styles.nextLevelBanner, { backgroundColor: progress.next.bg }]}>
      <View style={styles.nextLevelTop}>
        <View style={styles.nextLevelLeft}>
          <Ionicons name={progress.next.icon as any} size={26} color={progress.next.color} />
          <View>
            <Text style={[styles.nextLevelName, { color: progress.next.color }]}>{progress.next.name}</Text>
            <Text style={[styles.nextLevelSub, { color: progress.next.color + 'CC' }]}>
              {progress.pointsToNext} pts to level up
            </Text>
          </View>
        </View>
        <Text style={[styles.nextLevelPct, { color: progress.next.color }]}>
          {Math.round(progress.progressPct * 100)}%
        </Text>
      </View>
      <View style={styles.nextLevelBarTrack}>
        <Animated.View
          style={[
            styles.nextLevelBarFill,
            {
              backgroundColor: progress.next.color,
              width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.nextLevelPerks, { color: progress.next.color + 'CC' }]}>
        Unlock: {progress.next.perks.slice(0, 2).join(' · ')}
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export function TrustCenterScreen({ navigation }: Props) {
  const { user, isProvider } = useAuth();
  const profile = user?.profile;
  const pp = user?.providerProfile;
  const [reviews, setReviews] = useState<Review[]>([]);
  const heroFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) {
      getProviderReviewsForUser(user.id).then(setReviews).catch(console.error);
    }
    Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [user?.id]);

  if (!profile || !pp) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Trust Center is for providers only</Text>
        </View>
      </SafeAreaView>
    );
  }

  const breakdown = computeTrustBreakdown(profile as any, pp, reviews);
  const suggestions = computeImprovementSuggestions(profile as any, pp, reviews);
  const trustMeta = trustLabel(breakdown.score);
  const levelDef = getTrustLevel(breakdown.score);
  const totalGainPossible = suggestions.reduce((s, sg) => s + sg.estimatedGain, 0);

  const handleAction = (suggestion: ImprovementSuggestion) => {
    const key = suggestion.actionKey;
    if (key === 'nav:edit_profile' || key === 'nav:notifications_settings') {
      Alert.alert(suggestion.title, suggestion.description, [{ text: 'Got it', style: 'cancel' }]);
      return;
    }
    if (key === 'nav:nearby_requests') {
      navigation.goBack();
      return;
    }
    if (key === 'scroll:reviews') {
      navigation.goBack();
      return;
    }
    // verify: keys
    if (key.startsWith('verify:')) {
      const badge = VERIFICATION_BADGES.find((b) => `verify:${b.key}` === key);
      if (badge) {
        Alert.alert(badge.label, badge.howToEarn, [{ text: 'OK' }]);
      }
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trust Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Hero ─────────────────────────────────────────── */}
        <Animated.View style={[styles.hero, { opacity: heroFade }]}>
          <View style={[styles.heroBg, { backgroundColor: levelDef.bg }]}>
            {/* Score ring */}
            <ScoreRing score={breakdown.score} color={levelDef.color} />

            {/* Level badge */}
            <View style={[styles.levelPill, { backgroundColor: levelDef.color }]}>
              <Ionicons name={levelDef.icon as any} size={13} color="#fff" />
              <Text style={styles.levelPillText}>Level {levelDef.level} · {levelDef.name}</Text>
            </View>

            {/* Tier label */}
            <View style={[styles.tierBadge, { backgroundColor: trustMeta.bg }]}>
              <Ionicons name={trustMeta.icon as any} size={14} color={trustMeta.color} />
              <Text style={[styles.tierText, { color: trustMeta.color }]}>{trustMeta.label}</Text>
            </View>

            {/* Total possible gain */}
            {totalGainPossible > 0 && (
              <View style={styles.potentialWrap}>
                <Ionicons name="trending-up" size={14} color={Colors.success} />
                <Text style={styles.potentialText}>
                  Up to <Text style={{ fontWeight: '800', color: Colors.success }}>+{totalGainPossible} pts</Text> available to earn
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Next Level Progress ───────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Level</Text>
          <NextLevelBanner score={breakdown.score} />
        </View>

        {/* ── Score Breakdown ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          <View style={styles.factorsCard}>
            {breakdown.factors.map((factor, i) => (
              <React.Fragment key={factor.id}>
                {i > 0 && <View style={styles.factorDivider} />}
                <FactorBar factor={factor} index={i} />
              </React.Fragment>
            ))}
            {/* Final score row */}
            <View style={styles.finalRow}>
              <View style={[styles.finalIconWrap, { backgroundColor: levelDef.bg }]}>
                <Ionicons name={levelDef.icon as any} size={16} color={levelDef.color} />
              </View>
              <Text style={styles.finalLabel}>Final Score</Text>
              <View style={{ flex: 1 }} />
              <Text style={[styles.finalScore, { color: levelDef.color }]}>{breakdown.score}</Text>
              <Text style={styles.finalMax}>/100</Text>
            </View>
          </View>
        </View>

        {/* ── Verification ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <VerificationRow profile={profile as any} />
        </View>

        {/* ── Improvement Suggestions ───────────────────────── */}
        {suggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>How to Improve</Text>
              <View style={styles.suggCountBadge}>
                <Text style={styles.suggCountText}>{suggestions.length} actions</Text>
              </View>
            </View>
            <Text style={styles.sectionSub}>
              Complete these steps to grow your Trust Score and attract more clients.
            </Text>
            <View style={styles.suggestionsList}>
              {suggestions.map((s, i) => (
                <SuggestionCard key={s.id} suggestion={s} index={i} onAction={handleAction} />
              ))}
            </View>
          </View>
        )}

        {/* ── All good state ─────────────────────────────────── */}
        {suggestions.length === 0 && (
          <View style={styles.allGoodWrap}>
            <View style={[styles.allGoodIcon, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="trophy" size={32} color={Colors.success} />
            </View>
            <Text style={styles.allGoodTitle}>You're maxed out!</Text>
            <Text style={styles.allGoodDesc}>
              No improvements available right now. Keep delivering great work to maintain your score.
            </Text>
          </View>
        )}

        {/* ── What affects your score ──────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Trust Score Works</Text>
          <View style={styles.howCard}>
            {[
              { icon: 'star-outline',            label: 'Reviews',         pct: '35%', color: '#F59E0B' },
              { icon: 'checkmark-circle-outline', label: 'Completion Rate', pct: '25%', color: Colors.success },
              { icon: 'flash-outline',            label: 'Response Speed',  pct: '20%', color: Colors.warning },
              { icon: 'repeat-outline',           label: 'Repeat Clients',  pct: '10%', color: Colors.primary },
              { icon: 'shield-checkmark-outline', label: 'Verification',    pct: '10%', color: Colors.info },
            ].map((item, i, arr) => (
              <React.Fragment key={item.label}>
                <View style={styles.howRow}>
                  <View style={[styles.howIconWrap, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <Text style={styles.howLabel}>{item.label}</Text>
                  <View style={[styles.howPctBadge, { backgroundColor: item.color + '18' }]}>
                    <Text style={[styles.howPct, { color: item.color }]}>{item.pct}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={styles.howDivider} />}
              </React.Fragment>
            ))}
            <View style={styles.howFooter}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.muted} />
              <Text style={styles.howFooterText}>
                Score updates automatically when you complete jobs, get reviews, or add verifications.
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: Colors.muted },
  content: { paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },

  // Hero
  hero: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  heroBg: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },

  // Score ring (CSS/SVG-like approximation using a View with border)
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringTrack: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: STROKE,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  ringCenter: { alignItems: 'center', gap: 2 },
  ringScore: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  ringLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
  },
  levelPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  tierText: { fontSize: 12, fontWeight: '700' },

  potentialWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
  },
  potentialText: { fontSize: 12, color: Colors.text },

  // Sections
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  sectionSub: { fontSize: 13, color: Colors.muted, marginBottom: 12, lineHeight: 18 },
  suggCountBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 10,
  },
  suggCountText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // Next level banner
  nextLevelBanner: {
    borderRadius: Radius.lg, padding: Spacing.md, gap: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  nextLevelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextLevelLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextLevelName: { fontSize: 15, fontWeight: '800' },
  nextLevelSub: { fontSize: 12, marginTop: 1 },
  nextLevelPct: { fontSize: 18, fontWeight: '900' },
  nextLevelBarTrack: { height: 7, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' },
  nextLevelBarFill: { height: '100%', borderRadius: 4 },
  nextLevelPerks: { fontSize: 11, fontWeight: '500' },

  // Factors card
  factorsCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm,
  },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: Spacing.md },
  factorIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  factorBody: { flex: 1, gap: 5 },
  factorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  factorLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  factorRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factorScore: { fontSize: 16, fontWeight: '800' },
  factorWeight: { fontSize: 11, color: Colors.muted, fontWeight: '600', backgroundColor: Colors.border, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  barTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  factorDetail: { fontSize: 11, color: Colors.muted, lineHeight: 15 },
  factorDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },

  finalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: Spacing.md, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  finalIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  finalLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  finalScore: { fontSize: 22, fontWeight: '900' },
  finalMax: { fontSize: 13, color: Colors.muted, fontWeight: '600' },

  // Verification card
  verificationCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 12, ...Shadow.sm,
  },
  verifyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  verifyPtsBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  verifyPtsText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: {
    width: '18%', minWidth: 62, alignItems: 'center', gap: 4, borderRadius: Radius.lg,
    padding: 8, borderWidth: 1,
  },
  badgeIconCircle: {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  badgeCheck: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.card,
  },
  badgeName: { fontSize: 9, fontWeight: '600', textAlign: 'center', lineHeight: 12 },
  badgePts: { fontSize: 9, fontWeight: '700' },

  // Suggestions
  suggestionsList: { gap: 10 },
  suggestionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, ...Shadow.sm,
  },
  suggIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  suggBody: { flex: 1, gap: 4 },
  suggTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  suggDesc: { fontSize: 12, color: Colors.muted, lineHeight: 17 },
  suggMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  diffBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  diffText: { fontSize: 10, fontWeight: '700' },
  suggRight: { alignItems: 'flex-end', gap: 8, paddingTop: 2 },
  gainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full,
  },
  gainText: { fontSize: 12, fontWeight: '800' },
  suggCta: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
  },
  suggCtaText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // All good
  allGoodWrap: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.xl, gap: 12 },
  allGoodIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  allGoodTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  allGoodDesc: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  // How it works
  howCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md },
  howIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  howLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  howPctBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  howPct: { fontSize: 13, fontWeight: '800' },
  howDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  howFooter: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    padding: Spacing.md, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  howFooterText: { flex: 1, fontSize: 11, color: Colors.muted, lineHeight: 15 },
});
