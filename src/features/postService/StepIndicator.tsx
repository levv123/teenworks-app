/**
 * The 1 — 2 — 3 progress row of Post a Service: Category, Details, Preview.
 *
 * Finished steps show a check and can be tapped to go back to; the current step
 * is the white dot; steps ahead stay muted and inert, so the only way forward
 * is each screen's own primary button.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, HIT_SLOP, R, S } from '../../design/tokens';
import { AppText } from '../../ui';

export type Step = 1 | 2 | 3;

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: 'Category' },
  { step: 2, label: 'Details' },
  { step: 3, label: 'Preview' },
];

const DOT = 26;

export interface StepIndicatorProps {
  current: Step;
  onStepPress: (step: Step) => void;
  style?: StyleProp<ViewStyle>;
}

export function StepIndicator({ current, onStepPress, style }: StepIndicatorProps) {
  return (
    <View style={[styles.row, style]}>
      {STEPS.map(({ step, label }, index) => {
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            {index > 0 ? (
              <View style={[styles.line, step <= current ? styles.lineDone : styles.lineTodo]} />
            ) : null}
            <Pressable
              onPress={done ? () => onStepPress(step) : undefined}
              disabled={!done}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`Step ${step} of 3, ${label}${
                done ? ', done' : active ? ', current' : ''
              }`}
              accessibilityState={{ disabled: !done, selected: active }}
              style={({ pressed }) => [styles.step, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.dot,
                  done || active ? styles.dotOn : styles.dotOff,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={15} color={C.onLight} />
                ) : (
                  <AppText variant="tiny" color={active ? C.onLight : C.textMuted}>
                    {String(step)}
                  </AppText>
                )}
              </View>
              <AppText
                variant="tiny"
                color={active ? C.text : C.textMuted}
                style={styles.label}
              >
                {label}
              </AppText>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  step: {
    alignItems: 'center',
    minWidth: 56,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    // Kept on both states so a lit dot is not 2px smaller inside.
    borderWidth: 1,
  },
  dotOn: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  dotOff: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  label: {
    marginTop: S.xs + 2,
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: R.full,
    // Centred on the dots, which the labels hang below.
    marginTop: DOT / 2 - 1,
    marginHorizontal: -S.sm,
  },
  lineDone: {
    backgroundColor: C.text,
  },
  lineTodo: {
    backgroundColor: C.surfaceHigh,
  },
  pressed: {
    opacity: 0.6,
  },
});
