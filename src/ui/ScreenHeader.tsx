/** Back chevron + title (+ optional subtitle and right slot) shared by every secondary screen. */
import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S } from '../design/tokens';
import { AppText } from './AppText';

export interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  right?: ReactNode;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  onBack,
  right,
  subtitle,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </Pressable>

      <View style={styles.titles}>
        <AppText variant="h2" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color={C.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: S.sm,
    paddingBottom: S.md,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.xs,
  },
  right: {
    marginLeft: S.md,
  },
  pressed: {
    opacity: 0.6,
  },
});
