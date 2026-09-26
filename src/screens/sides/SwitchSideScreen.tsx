/**
 * Switch sides — the full-screen confirmation between Profile and the other
 * side's Home. Black, centered, a close button, a two-line headline, four
 * rows of what the other side is for and one white CTA.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, HIT_SLOP, S } from '../../design/tokens';
import type { AppMode, IoniconName } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { AppText, PrimaryButton, Screen } from '../../ui';
import { SIDE_ROOT, useSwitchSide } from '../../features/sides';
import { useApp } from '../../store/AppStore';

interface SideCopy {
  title: string;
  body: string;
  rows: { icon: IoniconName; label: string }[];
  cta: string;
}

const COPY: Record<AppMode, SideCopy> = {
  hire: {
    title: 'Get Help\nwith TeenWorks',
    body: 'Switch to the hire side to find services,\nbook help, and get things done.',
    rows: [
      { icon: 'location-outline', label: 'Find services near you' },
      { icon: 'shield-checkmark-outline', label: 'Browse trusted providers' },
      { icon: 'calendar-outline', label: 'Book help' },
      { icon: 'checkmark-circle-outline', label: 'Get things done' },
    ],
    cta: 'Switch to Hire Side',
  },
  earn: {
    title: 'Earn Money\nwith TeenWorks',
    body: 'Switch to the earn side to find jobs,\nget hired, and start making money.',
    rows: [
      { icon: 'location-outline', label: 'Find gigs near you' },
      { icon: 'logo-usd', label: 'Set your own prices' },
      { icon: 'star-outline', label: 'Build your reputation' },
      { icon: 'card-outline', label: 'Get paid' },
    ],
    cta: 'Switch to Earn Side',
  },
};

export function SwitchSideScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'SwitchSide'>>();
  const { mode } = useApp();
  const switchSide = useSwitchSide();

  // A hand-typed /switch/<anything> falls back to "the side you are not on".
  const to: AppMode =
    params?.to === 'earn' || params?.to === 'hire'
      ? params.to
      : mode === 'earn'
        ? 'hire'
        : 'earn';
  const copy = COPY[to];

  const close = useCallback(() => {
    // Opened by deep link there is nothing underneath to return to.
    if (nav.canGoBack()) nav.goBack();
    else nav.reset({ index: 0, routes: [{ name: SIDE_ROOT[mode] }] });
  }, [mode, nav]);

  return (
    <Screen
      scroll={false}
      header={
        <View style={styles.top}>
          <Pressable
            onPress={close}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>
      }
      contentStyle={styles.content}
    >
      <View style={styles.center}>
        <AppText variant="h1" style={styles.title}>
          {copy.title}
        </AppText>
        <AppText variant="small" color={C.textMuted} style={styles.body}>
          {copy.body}
        </AppText>

        <View style={styles.rows}>
          {copy.rows.map((row, index) => (
            <View key={row.label} style={[styles.row, index > 0 && styles.rowGap]}>
              <Ionicons name={row.icon} size={18} color={C.text} />
              <AppText variant="small" style={styles.rowLabel}>
                {row.label}
              </AppText>
            </View>
          ))}
        </View>

        <PrimaryButton
          label={copy.cta}
          onPress={() => switchSide(to)}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingTop: S.sm,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
  },
  center: {
    // Sits a little above true center, like the reference.
    marginBottom: S.huge + S.xl,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginTop: S.md,
  },
  rows: {
    marginTop: S.xxl,
    paddingHorizontal: S.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowGap: {
    marginTop: S.lg,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.base,
  },
  cta: {
    marginTop: S.xxl + S.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
