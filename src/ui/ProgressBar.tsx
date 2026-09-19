/** Thin rounded meter used by the earnings breakdown and the trust score card. */
import React from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { C, R } from '../design/tokens';

export interface ProgressBarProps {
  /** 0..1 — anything outside the range (or NaN) is clamped. */
  value: number;
  height?: number;
  fill?: string;
  track?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  height = 6,
  fill = C.text,
  track = C.surfaceHigh,
  style,
}: ProgressBarProps) {
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const width: DimensionValue = `${clamped * 100}%`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
      style={[styles.track, { height, backgroundColor: track }, style]}
    >
      <View style={[styles.fill, { width, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: R.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: R.full,
  },
});
