/**
 * Bookings (Hire) — the hire side's second tab.
 *
 * PLACEHOLDER. There is no booking system yet, so this is the header and the
 * empty state the tab will show before a user's first booking.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, S } from '../../design/tokens';
import type { Nav } from '../../navigation/routes';
import { AppText, EmptyState, Screen } from '../../ui';
import { HeaderAvatar } from '../../features/chrome';

export function BookingsScreen() {
  const nav = useNavigation<Nav>();

  return (
    <Screen>
      <View style={styles.headerRow}>
        <AppText variant="display" numberOfLines={1} style={styles.title}>
          Bookings
        </AppText>
        <HeaderAvatar />
      </View>
      <AppText variant="body" color={C.textMuted} style={styles.tagline}>
        Everything you've booked, in one place.
      </AppText>

      <EmptyState
        icon="calendar-outline"
        title="No bookings yet"
        message="When you book help from a local teen, it will show up here."
        actionLabel="Find help"
        onAction={() => nav.navigate('HireTabs', { screen: 'HireHome' })}
        style={styles.empty}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    minWidth: 0,
    marginRight: S.md,
  },
  tagline: {
    marginTop: 2,
  },
  empty: {
    marginTop: S.huge,
  },
});
