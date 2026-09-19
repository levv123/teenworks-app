/** The white full-width CTA ("Post a Service", "Apply"). Two lines when a sublabel is given. */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../design/tokens';
import type { IoniconName } from '../data/types';
import { AppText } from './AppText';

export interface PrimaryButtonProps {
  label: string;
  sublabel?: string;
  icon?: IoniconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  sublabel,
  icon,
  onPress,
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const locked = disabled || loading;

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
      accessibilityState={{ disabled: locked, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        style,
        pressed && !locked && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={C.onLight} />
      ) : (
        <>
          <View style={styles.line}>
            {icon ? (
              <Ionicons
                name={icon}
                size={20}
                color={C.onLight}
                style={styles.icon}
              />
            ) : null}
            <AppText variant="h3" color={C.onLight}>
              {label}
            </AppText>
          </View>
          {sublabel ? (
            <AppText variant="tiny" color={C.onLightMuted} style={styles.sublabel}>
              {sublabel}
            </AppText>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: C.text,
    borderRadius: R.full,
    paddingVertical: 14,
    paddingHorizontal: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: S.sm - 2,
  },
  sublabel: {
    marginTop: 2,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
