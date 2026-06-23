import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Shadow, Spacing } from '../../utils/colors';
import { analyzeService } from '../../api/services';
import { ServiceAnalysis, ServiceSuggestion, ServicesStackParamList } from '../../types';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServiceAnalysis'>;

// ── Category metadata ─────────────────────────────────────────
const CATEGORY_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; label: string; maxPoints: number }
> = {
  title:       { icon: 'text-outline',            label: 'Title',       maxPoints: 20 },
  description: { icon: 'document-text-outline',   label: 'Description', maxPoints: 25 },
  images:      { icon: 'images-outline',           label: 'Images',      maxPoints: 20 },
  portfolio:   { icon: 'briefcase-outline',        label: 'Portfolio',   maxPoints: 15 },
  faq:         { icon: 'help-circle-outline',      label: 'FAQ',         maxPoints: 10 },
  packages:    { icon: 'layers-outline',           label: 'Packages',    maxPoints: 10 },
  pricing:     { icon: 'pricetag-outline',         label: 'Pricing',     maxPoints: 0  },
};

const PRIORITY_META = {
  high:   { color: Colors.error,   bg: Colors.error   + '18', label: 'High priority'   },
  medium: { color: Colors.warning, bg: Colors.warning + '18', label: 'Medium priority' },
  low:    { color: Colors.success, bg: Colors.success + '18', label: 'Low priority'    },
};

function scoreColor(score: number): string {
  if (score >= 80) return Colors.success;
  if (score >= 55) return Colors.warning;
  return Colors.error;
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Strong Listing';
  if (score >= 66) return 'Good Start';
  if (score >= 41) return 'Needs Work';
  return 'Major Gaps';
}

export function ServiceAnalysisScreen({ route, navigation }: Props) {
  const { service } = route.params;
  const [analysis, setAnalysis] = useState<ServiceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Animated score counter
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);
  // Animated bar fills
  const barAnims = useRef<Record<string, Animated.Value>>({}).current;

  useEffect(() => {
    analyzeService(service)
      .then((result) => {
        setAnalysis(result);
        // Ensure all breakdown keys have an Animated.Value
        Object.keys(result.breakdown).forEach((key) => {
          if (!barAnims[key]) barAnims[key] = new Animated.Value(0);
        });
        // Animate score counter
        const targetScore = result.score;
        let frame = 0;
        const total = 40;
        const timer = setInterval(() => {
          frame++;
          setDisplayScore(Math.round((frame / total) * targetScore));
          if (frame >= total) clearInterval(timer);
        }, 20);
        // Animate bars after a short delay
        setTimeout(() => {
          const animations = Object.entries(result.breakdown).map(([key, pts]) => {
            const meta = CATEGORY_META[key];
            const max = meta?.maxPoints ?? 20;
            const ratio = max > 0 ? Math.min(1, pts / max) : 0;
            return Animated.timing(barAnims[key] ?? new Animated.Value(0), {
              toValue: ratio,
              duration: 600,
              useNativeDriver: false,
            });
          });
          Animated.stagger(60, animations).start();
        }, 400);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [service.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const color = analysis ? scoreColor(analysis.score) : Colors.primary;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Analysis</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('CreateEditService', { service })}
        >
          <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState />
      ) : error || !analysis ? (
        <ErrorState onRetry={() => {
          setError(false);
          setLoading(true);
          analyzeService(service)
            .then(setAnalysis)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
        }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* ── Score Hero ───────────────────────────────────── */}
          <View style={[styles.scoreHero, { borderColor: color + '44' }]}>
            {/* Source badge */}
            <View style={[styles.sourceBadge, analysis.source === 'ai' ? styles.sourceBadgeAI : styles.sourceBadgeLocal]}>
              <Ionicons
                name={analysis.source === 'ai' ? 'sparkles' : 'calculator-outline'}
                size={11}
                color={analysis.source === 'ai' ? Colors.primary : Colors.muted}
              />
              <Text style={[styles.sourceBadgeText, analysis.source === 'ai' && styles.sourceBadgeTextAI]}>
                {analysis.source === 'ai' ? 'AI Analysis' : 'Local Analysis'}
              </Text>
            </View>

            {/* Circle */}
            <View style={[styles.scoreCircle, { borderColor: color }]}>
              <Text style={[styles.scoreNum, { color }]}>{displayScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>

            <Text style={[styles.scoreLabel, { color }]}>{scoreLabel(analysis.score)}</Text>
            <Text style={styles.serviceTitle} numberOfLines={2}>{service.title}</Text>
          </View>

          {/* ── Strengths ────────────────────────────────────── */}
          {analysis.strengths.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.cardTitle}>What's Working</Text>
              </View>
              {analysis.strengths.map((s, i) => (
                <View key={i} style={styles.strengthItem}>
                  <View style={styles.strengthDot} />
                  <Text style={styles.strengthText}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Score Breakdown ──────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bar-chart-outline" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Score Breakdown</Text>
            </View>
            {Object.entries(analysis.breakdown)
              .filter(([key]) => (CATEGORY_META[key]?.maxPoints ?? 0) > 0)
              .map(([key, pts]) => {
                const meta = CATEGORY_META[key];
                if (!meta) return null;
                const max = meta.maxPoints;
                const ratio = Math.min(1, pts / max);
                const barColor = ratio >= 0.75 ? Colors.success : ratio >= 0.4 ? Colors.warning : Colors.error;
                const anim = barAnims[key] ?? new Animated.Value(ratio);
                return (
                  <View key={key} style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelRow}>
                      <Ionicons name={meta.icon} size={14} color={Colors.muted} />
                      <Text style={styles.breakdownLabel}>{meta.label}</Text>
                      <Text style={styles.breakdownPts}>{pts}/{max}</Text>
                    </View>
                    <View style={styles.breakdownTrack}>
                      <Animated.View
                        style={[
                          styles.breakdownFill,
                          {
                            backgroundColor: barColor,
                            width: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
          </View>

          {/* ── Suggestions ─────────────────────────────────── */}
          {analysis.suggestions.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb-outline" size={18} color={Colors.warning} />
                <Text style={styles.cardTitle}>
                  {analysis.suggestions.length} Suggestion{analysis.suggestions.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {analysis.suggestions.map((s, i) => (
                <SuggestionCard key={i} suggestion={s} last={i === analysis.suggestions.length - 1} />
              ))}
            </View>
          )}

          {/* ── CTAs ────────────────────────────────────────── */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('CreateEditService', { service })}
            >
              <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
              <Text style={styles.editBtnText}>Edit Service</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigation.navigate('MyServices')}
            >
              <Ionicons name="checkmark" size={16} color={Colors.card} />
              <Text style={styles.doneBtnText}>
                {analysis.score >= 75 ? 'Looks Great!' : 'Done for Now'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SuggestionCard({ suggestion, last }: { suggestion: ServiceSuggestion; last: boolean }) {
  const [expanded, setExpanded] = useState(suggestion.priority === 'high');
  const meta = PRIORITY_META[suggestion.priority];
  const catMeta = CATEGORY_META[suggestion.category];

  return (
    <TouchableOpacity
      style={[styles.suggestion, !last && styles.suggestionBorder]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.suggestionHeader}>
        <View style={[styles.suggestionIconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons
            name={catMeta?.icon ?? 'alert-circle-outline'}
            size={16}
            color={meta.color}
          />
        </View>
        <View style={styles.suggestionMeta}>
          <View style={styles.suggestionTopRow}>
            <Text style={styles.suggestionCategory}>
              {catMeta?.label ?? suggestion.category}
            </Text>
            <View style={[styles.priorityPill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.priorityPillText, { color: meta.color }]}>
                {suggestion.priority}
              </Text>
            </View>
          </View>
          <Text style={styles.suggestionIssue}>{suggestion.issue}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.muted}
        />
      </View>
      {expanded && (
        <View style={[styles.suggestionBody, { borderLeftColor: meta.color }]}>
          <Text style={styles.suggestionText}>{suggestion.suggestion}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function LoadingState() {
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.loadingWrap}>
      <Animated.View style={[styles.loadingCircle, { opacity: pulse }]}>
        <Ionicons name="sparkles" size={36} color={Colors.primary} />
      </Animated.View>
      <Text style={styles.loadingTitle}>Analyzing your service…</Text>
      <Text style={styles.loadingSub}>
        Checking title strength, description quality, portfolio, pricing, and more.
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.loadingWrap}>
      <Ionicons name="cloud-offline-outline" size={52} color={Colors.muted} />
      <Text style={styles.loadingTitle}>Analysis unavailable</Text>
      <Text style={styles.loadingSub}>Couldn't reach the analysis service. Check your connection.</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  content: { padding: Spacing.md, gap: Spacing.md },

  // Score hero
  scoreHero: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.md,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  sourceBadgeAI: { backgroundColor: Colors.primaryLight + '44' },
  sourceBadgeLocal: {},
  sourceBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.muted },
  sourceBadgeTextAI: { color: Colors.primary },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 1,
  },
  scoreNum: {
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 50,
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.muted,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  scoreLabel: { fontSize: 18, fontWeight: '800' },
  serviceTitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 260,
  },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },

  // Strengths
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  strengthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  strengthText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },

  // Breakdown
  breakdownRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  breakdownPts: { fontSize: 12, fontWeight: '700', color: Colors.muted },
  breakdownTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  // Suggestions
  suggestion: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  suggestionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  suggestionMeta: { flex: 1, gap: 3 },
  suggestionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  suggestionCategory: { fontSize: 13, fontWeight: '700', color: Colors.text },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  priorityPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  suggestionIssue: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  suggestionBody: {
    marginTop: Spacing.sm,
    marginLeft: 32 + Spacing.sm,
    borderLeftWidth: 2,
    paddingLeft: Spacing.sm,
    paddingVertical: 2,
  },
  suggestionText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // CTAs
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  doneBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: Colors.card },

  // Loading / Error
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  loadingTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  loadingSub: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.card },
});
