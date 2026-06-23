import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from '../utils/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'flat';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.card, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
  },
  default: {
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    ...Shadow.md,
  },
  flat: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
