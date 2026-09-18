/** Dark pill button: the "Change" control and the "This Month v" range selector. */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../design/tokens';
import type { IoniconName } from '../data/types';
import { AppText } from './AppText';

export interface SecondaryButtonProps {
  label: string;
  icon?: IoniconName;
  trailingIcon?: IoniconName;
  onPress: () => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SecondaryButton({
  label,
  icon,
  trailingIcon,
  onPress,
  size = 'md',
  disabled = false,
  style,
}: SecondaryButtonProps) {
  const small = size === 'sm';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        small ? styles.sm : styles.md,
        disabled && styles.disabled,
        style,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={small ? 14 : 16}
          color={C.text}
          style={styles.leading}
        />
      ) : null}
      <AppText variant={small ? 'small' : 'body'} numberOfLines={1}>
        {label}
      </AppText>
      {trailingIcon ? (
        <Ionicons
          name={trailingIcon}
          size={14}
          color={C.textMuted}
          style={styles.trailing}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.full,
  },
  sm: {
    paddingVertical: S.sm - 2,
    paddingHorizontal: 14,
  },
  md: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  leading: {
    marginRight: S.sm - 2,
  },
  trailing: {
    marginLeft: S.sm - 2,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
