/** Small rounded label: tags, statuses and the earnings delta badge. */
import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../design/tokens';
import type { IoniconName } from '../data/types';
import { AppText } from './AppText';

export type PillTone = 'neutral' | 'light' | 'success' | 'danger' | 'outline';
export type PillSize = 'sm' | 'md';

export interface PillProps {
  label: string;
  icon?: IoniconName;
  tone?: PillTone;
  size?: PillSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const TONES: Record<PillTone, { bg: string; fg: string; border?: string }> = {
  neutral: { bg: C.surfaceAlt, fg: C.textMuted },
  light: { bg: C.text, fg: C.onLight },
  success: { bg: C.successBg, fg: C.success },
  danger: { bg: C.dangerBg, fg: C.danger },
  outline: { bg: 'transparent', fg: C.textMuted, border: C.border },
};

export function Pill({
  label,
  icon,
  tone = 'neutral',
  size = 'sm',
  style,
  textStyle,
}: PillProps) {
  const palette = TONES[tone];
  const small = size === 'sm';
  const iconSize = small ? 11 : 13;

  return (
    <View
      style={[
        styles.pill,
        small ? styles.sm : styles.md,
        { backgroundColor: palette.bg },
        palette.border
          ? { borderWidth: 1, borderColor: palette.border }
          : null,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSize}
          color={palette.fg}
          style={styles.icon}
        />
      ) : null}
      <AppText
        variant={small ? 'tiny' : 'small'}
        color={palette.fg}
        numberOfLines={1}
        style={textStyle}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: R.full,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingVertical: S.xs,
    paddingHorizontal: S.sm + 2,
  },
  md: {
    paddingVertical: S.xs + 2,
    paddingHorizontal: S.md,
  },
  icon: {
    marginRight: S.xs,
  },
});
