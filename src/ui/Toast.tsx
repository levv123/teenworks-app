/** Presentational toast pill. The owner of the message controls how long it stays up. */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { C, R, S, T, TAB_BAR_HEIGHT } from '../design/tokens';

export interface ToastProps {
  message: string | null;
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
}

export function Toast({
  message,
  bottomOffset = TAB_BAR_HEIGHT + S.xl,
  style,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={message}
      style={[styles.wrap, { bottom: bottomOffset, opacity }, style]}
    >
      <Animated.Text style={styles.label} numberOfLines={2}>
        {message}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: S.lg,
    right: S.lg,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: R.full,
    paddingVertical: S.md,
    paddingHorizontal: 18,
  },
  label: {
    ...T.small,
    color: C.text,
    textAlign: 'center',
  },
});
