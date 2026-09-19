import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dark, S, R, TOUCH, GUTTER } from './theme';

export const TOTAL_STEPS = 3;

/**
 * Three thin rounded segments, centered. The active step is white, the rest
 * are a low-contrast dark fill. Replaces the old single continuous progress bar.
 */
export function ProgressSteps({ step }: { step: number }) {
  return (
    <View
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step + 1} of ${TOTAL_STEPS}`}
      accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: step + 1 }}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View key={i} style={[styles.segment, i === step && styles.segmentActive]} />
      ))}
    </View>
  );
}

/**
 * Back button on the left, progress in the middle, optional action on the right.
 * The right slot is kept the same width as the back button so the progress
 * indicator stays optically centered whether or not an action is present.
 */
export function FlowHeader({
  step,
  onBack,
  action,
}: {
  step: number;
  onBack: () => void;
  action?: { label: string; onPress: () => void; disabled?: boolean } | null;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={24} color={Dark.text} />
      </TouchableOpacity>

      <ProgressSteps step={step} />

      <View style={styles.actionSlot}>
        {action ? (
          <TouchableOpacity
            onPress={action.onPress}
            disabled={action.disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionText, action.disabled && styles.actionTextDisabled]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/** Page title + subtitle block used at the top of every step. */
export function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const ACTION_SLOT_WIDTH = 76;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER - 8,
    paddingVertical: S.sm,
    minHeight: TOUCH + 8,
  },
  backBtn: {
    width: ACTION_SLOT_WIDTH,
    height: TOUCH,
    justifyContent: 'center',
  },
  actionSlot: {
    width: ACTION_SLOT_WIDTH,
    height: TOUCH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionText: { fontSize: 14, fontWeight: '600', color: Dark.textSecondary },
  actionTextDisabled: { color: Dark.textMuted },

  progress: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  segment: {
    width: 34,
    height: 4,
    borderRadius: R.full,
    backgroundColor: Dark.surfaceActive,
  },
  segmentActive: { backgroundColor: Dark.text },

  heading: { gap: 6, paddingTop: S.sm, paddingBottom: S.lg },
  title: { fontSize: 30, fontWeight: '700', color: Dark.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: Dark.textSecondary, lineHeight: 22 },
});
