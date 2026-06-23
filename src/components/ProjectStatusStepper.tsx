/**
 * ProjectStatusStepper
 *
 * Visual timeline showing where a project is in its lifecycle.
 * Past steps are checked, current step pulses, future steps are grey.
 * Cancelled shows a red terminal state.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../utils/colors';
import { ProjectStatus } from '../types';

// ── Step definitions ──────────────────────────────────────────
interface StepDef {
  key: ProjectStatus;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STEPS: StepDef[] = [
  {
    key: 'inquiry',
    label: 'Inquiry',
    shortLabel: 'Inquiry',
    icon: 'chatbubble-ellipses-outline',
    color: '#8B5CF6',
  },
  {
    key: 'offer_sent',
    label: 'Offer Sent',
    shortLabel: 'Offer',
    icon: 'send-outline',
    color: '#3B82F6',
  },
  {
    key: 'accepted',
    label: 'Accepted',
    shortLabel: 'Accepted',
    icon: 'checkmark-circle-outline',
    color: '#10B981',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    shortLabel: 'Active',
    icon: 'construct-outline',
    color: Colors.primary,
  },
  {
    key: 'review_requested',
    label: 'Under Review',
    shortLabel: 'Review',
    icon: 'eye-outline',
    color: '#F59E0B',
  },
  {
    key: 'completed',
    label: 'Completed',
    shortLabel: 'Done',
    icon: 'trophy-outline',
    color: '#10B981',
  },
];

// Cancelled is a terminal off-track state shown separately
const CANCELLED_STEP: StepDef = {
  key: 'cancelled',
  label: 'Cancelled',
  shortLabel: 'Cancelled',
  icon: 'close-circle-outline',
  color: Colors.error,
};

// Normal progression order (index in STEPS array)
const STEP_ORDER = STEPS.map(s => s.key);

function getStepIndex(status: ProjectStatus): number {
  return STEP_ORDER.indexOf(status);
}

// ── Pulsing dot for active step ───────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.35, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,    duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.pulseWrap}>
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: color, transform: [{ scale }], opacity },
        ]}
      />
    </View>
  );
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  status: ProjectStatus;
  /** If true, shows compact single-line view */
  compact?: boolean;
}

// ── Component ─────────────────────────────────────────────────
export function ProjectStatusStepper({ status, compact = false }: Props) {
  const isCancelled = status === 'cancelled';
  const currentIdx  = isCancelled ? -1 : getStepIndex(status);

  if (compact) {
    return <CompactStepper status={status} currentIdx={currentIdx} isCancelled={isCancelled} />;
  }

  return <FullStepper status={status} currentIdx={currentIdx} isCancelled={isCancelled} />;
}

// ── Full stepper (used inside ProjectContextCard) ─────────────
function FullStepper({
  status,
  currentIdx,
  isCancelled,
}: {
  status: ProjectStatus;
  currentIdx: number;
  isCancelled: boolean;
}) {
  if (isCancelled) {
    return (
      <View style={styles.cancelledWrap}>
        <View style={[styles.cancelledBadge, { backgroundColor: Colors.error + '15' }]}>
          <Ionicons name="close-circle" size={16} color={Colors.error} />
          <Text style={styles.cancelledText}>Project Cancelled</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isActive  = idx === currentIdx;
        const isFuture  = idx > currentIdx;
        const isLast    = idx === STEPS.length - 1;

        const dotColor = isDone || isActive ? step.color : Colors.border;
        const lineColor = isDone ? step.color : Colors.border;

        return (
          <View key={step.key} style={styles.stepCell}>
            {/* Step circle */}
            <View style={styles.stepRow}>
              {/* Left connector line */}
              {idx > 0 && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: idx <= currentIdx ? STEPS[idx - 1].color : Colors.border },
                  ]}
                />
              )}

              {/* Dot */}
              <View style={styles.dotWrap}>
                {isActive && <PulsingDot color={step.color} />}
                <View
                  style={[
                    styles.dot,
                    isDone && { backgroundColor: step.color, borderColor: step.color },
                    isActive && { backgroundColor: step.color, borderColor: step.color },
                    isFuture && { backgroundColor: Colors.card, borderColor: Colors.border },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  ) : isActive ? (
                    <Ionicons name={step.icon} size={10} color="#fff" />
                  ) : (
                    <View style={[styles.dotInner, { backgroundColor: Colors.border }]} />
                  )}
                </View>
              </View>

              {/* Right connector line */}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: lineColor },
                  ]}
                />
              )}
            </View>

            {/* Label */}
            <Text
              style={[
                styles.stepLabel,
                isActive  && [styles.stepLabelActive,  { color: step.color }],
                isDone    && styles.stepLabelDone,
                isFuture  && styles.stepLabelFuture,
              ]}
              numberOfLines={1}
            >
              {step.shortLabel}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Compact stepper (used in InboxScreen rows) ─────────────────
function CompactStepper({
  status,
  currentIdx,
  isCancelled,
}: {
  status: ProjectStatus;
  currentIdx: number;
  isCancelled: boolean;
}) {
  const step = isCancelled ? CANCELLED_STEP : (STEPS[currentIdx] ?? STEPS[0]);
  const pct  = isCancelled ? 0 : Math.round(((currentIdx) / (STEPS.length - 1)) * 100);

  return (
    <View style={styles.compactWrap}>
      {/* Status pill */}
      <View style={[styles.compactPill, { backgroundColor: step.color + '18' }]}>
        <Ionicons name={step.icon} size={11} color={step.color} />
        <Text style={[styles.compactPillText, { color: step.color }]}>{step.label}</Text>
      </View>

      {/* Progress bar */}
      {!isCancelled && (
        <View style={styles.compactBar}>
          <View style={[styles.compactBarFill, { width: `${pct}%` as any, backgroundColor: step.color }]} />
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const STEP_WIDTH = 52;
const LINE_WIDTH  = 28;
const DOT_SIZE    = 22;

const styles = StyleSheet.create({
  // Full stepper
  scrollContent: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
  },
  stepCell: {
    alignItems: 'center',
    width: STEP_WIDTH,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    width: LINE_WIDTH,
    height: 2,
    borderRadius: 1,
  },
  dotWrap: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseWrap: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: DOT_SIZE + 4,
    height: DOT_SIZE + 4,
    borderRadius: (DOT_SIZE + 4) / 2,
    borderWidth: 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.muted,
    marginTop: 4,
    textAlign: 'center',
    width: STEP_WIDTH,
  },
  stepLabelActive: { fontWeight: '800', fontSize: 10 },
  stepLabelDone:   { color: Colors.textSecondary, fontWeight: '600' },
  stepLabelFuture: { color: Colors.border },

  // Cancelled state
  cancelledWrap: { paddingVertical: 4 },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  cancelledText: { fontSize: 12, fontWeight: '700', color: Colors.error },

  // Compact stepper
  compactWrap: { gap: 4 },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  compactPillText: { fontSize: 11, fontWeight: '700' },
  compactBar: {
    height: 3,
    width: 80,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
