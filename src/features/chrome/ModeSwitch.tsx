/**
 * The Earn / Hire switch in the Home header.
 *
 * Both sides live in one account and one tab navigator, so switching is just a
 * tab change: nothing is remounted, signed out or reset. The same
 * `useSwitchMode` hook drives the secondary switch on the Profile screen.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { C, R, S } from '../../design/tokens';
import type { AppMode, IoniconName } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { AppText } from '../../ui';

const OPTIONS: { id: AppMode; label: string; icon: IoniconName }[] = [
  { id: 'earn', label: 'Earn', icon: 'cash-outline' },
  { id: 'hire', label: 'Hire', icon: 'search-outline' },
];

/** Moves to the other side's home tab and records the mode. */
export function useSwitchMode(): (mode: AppMode) => void {
  const nav = useNavigation<Nav>();
  const { setMode } = useApp();
  return useCallback(
    (mode: AppMode) => {
      setMode(mode);
      // From a stacked screen (Profile) this pops back to the tabs first.
      nav.navigate('Tabs', { screen: mode === 'earn' ? 'Home' : 'Hire' });
    },
    [nav, setMode],
  );
}

/** Each tab screen calls this so `mode` always names the side on screen. */
export function useModeOnFocus(mode: AppMode): void {
  const { setMode } = useApp();
  useFocusEffect(
    useCallback(() => {
      setMode(mode);
    }, [mode, setMode]),
  );
}

export interface ModeSwitchProps {
  /** The side this header belongs to. */
  current: AppMode;
  style?: StyleProp<ViewStyle>;
}

export function ModeSwitch({ current, style }: ModeSwitchProps) {
  const switchMode = useSwitchMode();

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const active = option.id === current;
        const tint = active ? C.onLight : C.textMuted;
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              if (!active) switchMode(option.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              option.id === 'earn' ? 'Earn mode: find gigs and make money' : 'Hire mode: get things done'
            }
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && !active && styles.pressed,
            ]}
          >
            <Ionicons name={option.icon} size={15} color={tint} />
            <AppText variant="bodyBold" color={tint} style={styles.label}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.full,
    padding: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.sm,
    borderRadius: R.full,
  },
  segmentActive: {
    backgroundColor: C.text,
  },
  label: {
    marginLeft: S.xs + 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
