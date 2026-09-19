/** Section title with an optional "See all >" affordance on the right. */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, HIT_SLOP, S } from '../design/tokens';
import { AppText } from './AppText';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  actionLabel = 'See all',
  onAction,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant="h2" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${title}`}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <AppText variant="small" color={C.textMuted}>
            {actionLabel}
          </AppText>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={C.textMuted}
            style={styles.chevron}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: S.md,
  },
  chevron: {
    marginLeft: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
