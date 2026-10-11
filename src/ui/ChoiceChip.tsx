/** A selectable pill: idle on surfaceAlt, selected in solid white. Used in forms. */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../design/tokens';
import type { IoniconName } from '../data/types';
import { AppText } from './AppText';

export interface ChoiceChipProps {
  label: string;
  /** Second line, e.g. a time range under a slot name. */
  sublabel?: string;
  icon?: IoniconName;
  iconColor?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** 'radio' for single choice, 'checkbox' for multi. */
  role?: 'radio' | 'checkbox';
  style?: StyleProp<ViewStyle>;
}

export function ChoiceChip({
  label,
  sublabel,
  icon,
  iconColor,
  selected,
  onPress,
  disabled = false,
  role = 'radio',
  style,
}: ChoiceChipProps) {
  const fg = selected ? C.onLight : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      accessibilityState={{ selected, checked: selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        sublabel ? styles.tall : null,
        selected ? styles.selected : styles.idle,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <Ionicons
            name={icon}
            size={15}
            color={selected ? C.onLight : iconColor ?? C.text}
            style={styles.icon}
          />
        ) : null}
        <AppText variant="small" color={fg} numberOfLines={1}>
          {label}
        </AppText>
      </View>
      {sublabel ? (
        <AppText variant="tiny" color={selected ? C.onLightMuted : C.textMuted} numberOfLines={1}>
          {sublabel}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: R.full,
    paddingVertical: S.sm + 2,
    paddingHorizontal: 14,
    marginRight: S.sm,
    marginBottom: S.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  tall: {
    borderRadius: R.lg,
    paddingVertical: S.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: S.xs + 2,
  },
  idle: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  selected: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.6,
  },
});
