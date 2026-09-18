/** Icon-only control. 'plain' sits on the background; 'surface' gets a dark circular chip. */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, HIT_SLOP, R, S } from '../design/tokens';
import type { IoniconName } from '../data/types';

export interface IconButtonProps {
  icon: IoniconName;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: 'plain' | 'surface';
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = 20,
  color = C.text,
  variant = 'plain',
  accessibilityLabel,
  disabled = false,
  style,
}: IconButtonProps) {
  const surface = variant === 'surface';
  // Keeps the chip circular and the touch target comfortable at any icon size.
  const box = size + S.lg;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        surface
          ? [styles.surface, { width: box, height: box }]
          : { padding: S.xs },
        disabled && styles.disabled,
        style,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.full,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
