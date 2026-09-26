/**
 * Home (Hire) — the hire side's first tab.
 *
 * PLACEHOLDER. The layout is the one the hire side will ship with (brand
 * header, location, search, categories, a service feed and the white CTA),
 * but nothing behind it is real yet: the search does not search, the feed is
 * seeded preview rows and tapping them only says booking is on its way.
 * Rendered unpadded so the chip row can scroll full-bleed.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, GUTTER, R, S } from '../../design/tokens';
import { GIGS } from '../../data/mock';
import type { CategoryId } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { AppText, EmptyState, PrimaryButton, Screen, SectionHeader } from '../../ui';
import { CategoryChips, GigCard, LocationBar } from '../../features/gigs';
import { HeaderAvatar } from '../../features/chrome';

/** Preview rows until real provider listings exist; same four the reference shows. */
const PREVIEW_FEED = GIGS.slice(0, 4);

export function HireHomeScreen() {
  const nav = useNavigation<Nav>();
  const { location, radiusMi, showToast } = useApp();

  // Local rather than the store's `category`: the hire filter must not quietly
  // re-filter the gig feed the user left behind on the Earn side.
  const [category, setCategory] = useState<CategoryId>('all');

  const feed = useMemo(
    () =>
      category === 'all'
        ? PREVIEW_FEED
        : PREVIEW_FEED.filter((item) => item.category === category),
    [category],
  );

  const comingSoon = useCallback(
    (what: string) => () => showToast(`${what} coming soon`),
    [showToast],
  );

  return (
    <Screen padded={false}>
      <View style={styles.gutter}>
        <View style={styles.headerRow}>
          <AppText variant="display" numberOfLines={1} style={styles.brand}>
            TeenWorks
          </AppText>
          <HeaderAvatar />
        </View>

        <AppText variant="body" color={C.textMuted} style={styles.tagline}>
          Get things done. Support local teens.
        </AppText>

        <LocationBar
          place={location.label}
          distanceMi={radiusMi}
          onChange={() => nav.navigate('LocationPicker')}
          style={styles.locationBar}
        />

        {/* Looks like the search field; opens nothing until service search exists. */}
        <Pressable
          onPress={comingSoon('Service search')}
          accessibilityRole="search"
          accessibilityLabel="What do you need help with?"
          style={({ pressed }) => [styles.search, pressed && styles.pressed]}
        >
          <Ionicons name="search" size={16} color={C.textMuted} />
          <AppText variant="body" color={C.textSubtle} style={styles.searchText}>
            What do you need help with?
          </AppText>
        </Pressable>
      </View>

      <CategoryChips selected={category} onSelect={setCategory} style={styles.chips} />

      <View style={styles.gutter}>
        <SectionHeader
          title="Find Help Nearby"
          onAction={comingSoon('All services')}
          style={styles.sectionHeader}
        />

        {feed.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No services in this category"
            message="Nothing nearby matches that filter yet. Try another category."
            actionLabel="Show all services"
            onAction={() => setCategory('all')}
          />
        ) : (
          feed.map((item, index) => (
            <View key={item.id} style={index === 0 ? undefined : styles.rowGap}>
              <GigCard gig={item} onPress={comingSoon('Booking')} />
            </View>
          ))
        )}

        <PrimaryButton
          label="Upload a Need"
          sublabel="Get help. Support local teens."
          icon="add"
          onPress={comingSoon('Upload a Need')}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: {
    paddingHorizontal: GUTTER,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flex: 1,
    minWidth: 0,
    marginRight: S.md,
  },
  tagline: {
    marginTop: 2,
  },
  locationBar: {
    marginTop: 18,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.base,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: S.md,
  },
  searchText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  chips: {
    marginTop: S.xl,
  },
  sectionHeader: {
    marginTop: S.xl,
    marginBottom: 18,
  },
  rowGap: {
    marginTop: 18,
  },
  cta: {
    marginTop: S.sm + S.xl,
  },
  pressed: {
    opacity: 0.6,
  },
});
