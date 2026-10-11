/** Inline error with an optional retry, used under forms and failed actions. */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../design/tokens';
import { AppText } from './AppText';

export interface ErrorBannerProps {
  message: string | null;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorBanner({ message, onRetry, style }: ErrorBannerProps) {
  if (message === null || message.length === 0) return null;
  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={C.danger} />
      <AppText variant="small" style={styles.text}>
        {message}
      </AppText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          hitSlop={8}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <AppText variant="small" style={styles.retryText}>
            Try again
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerBg,
    borderRadius: R.md,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
  },
  text: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  retry: {
    marginLeft: S.sm,
  },
  retryText: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.6,
  },
});
