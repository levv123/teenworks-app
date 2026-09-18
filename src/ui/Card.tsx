/** Raised surface used for stat tiles, review cards and the Total Earned block. */
import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { C, R, S } from '../design/tokens';

export interface CardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  padding = S.base + 2,
  onPress,
  accessibilityLabel,
}: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.card,
          { padding },
          style,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
  },
  pressed: {
    opacity: 0.6,
  },
});
