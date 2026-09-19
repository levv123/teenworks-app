/** Centered placeholder for empty lists and no-result searches. */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../design/tokens';
import type { IoniconName } from '../data/types';
import { AppText } from './AppText';
import { SecondaryButton } from './SecondaryButton';

export interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.circle}>
        <Ionicons name={icon} size={36} color={C.textSubtle} />
      </View>
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="small" color={C.textMuted} style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <SecondaryButton
          label={actionLabel}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.huge,
    paddingHorizontal: S.lg,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: S.base,
    textAlign: 'center',
  },
  message: {
    marginTop: S.sm - 2,
    textAlign: 'center',
  },
  action: {
    marginTop: S.lg,
  },
});
