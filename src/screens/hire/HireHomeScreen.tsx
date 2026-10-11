/**
 * Home (Hire) — the hiring side's home tab.
 *
 * Mirrors the Earn home: brand header with the Earn / Hire switch, location,
 * category chips, then search and the services nearby workers offer. The white
 * "Upload a Need" CTA covers everything search can't find.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, GUTTER, R, S, TABULAR } from '../../design/tokens';
import { CATEGORIES } from '../../data/mock';
import type { CategoryId } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp, useVisibleListings } from '../../store/AppStore';
import { refreshListings } from '../../services/marketplace';
import {
  AppText,
  EmptyState,
  PrimaryButton,
  Screen,
  SearchField,
  SectionHeader,
} from '../../ui';
import { CategoryChips, LocationBar } from '../../features/gigs';
import { ListingCard } from '../../features/hire';
import { HeaderAvatar, ModeSwitch, useModeOnFocus } from '../../features/chrome';

export function HireHomeScreen() {
  const nav = useNavigation<Nav>();
  const { location, radiusMi, requests, workers, bookings } = useApp();
  useModeOnFocus('hire');

  // Local, not the store's `category` / `query`: those drive the Earn gig feed,
  // and browsing services must not quietly re-filter the side the user left.
  const [category, setCategory] = useState<CategoryId>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const listings = useVisibleListings(category, query);
  const workerById = useMemo(() => new Map(workers.map((w) => [w.id, w])), [workers]);

  const openNeeds = requests.filter((r) => r.status === 'open');
  const applicantCount = openNeeds.reduce((sum, r) => sum + Math.max(0, r.applicants), 0);
  const upcoming = bookings.filter((b) => b.status === 'requested' || b.status === 'confirmed');

  const uploadNeed = useCallback(() => nav.navigate('PostRequest'), [nav]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshListings();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filtered = category !== 'all' || query.trim().length > 0;

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.gutter}>
        <View style={styles.headerRow}>
          <AppText variant="display" numberOfLines={1} style={styles.brand}>
            TeenWorks
          </AppText>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => nav.navigate('Tabs', { screen: 'Bookings', params: { segment: 'upcoming' } })}
              accessibilityRole="button"
              accessibilityLabel={`Bookings, ${upcoming.length} upcoming`}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <AppText variant="small" style={styles.linkText}>
                Bookings
              </AppText>
            </Pressable>
            <HeaderAvatar />
          </View>
        </View>

        <ModeSwitch current="hire" style={styles.modeSwitch} />

        <AppText variant="body" color={C.textMuted} style={styles.tagline}>
          Get it done today. Hire someone nearby.
        </AppText>

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search services, e.g. dog walking"
          style={styles.search}
        />

        <LocationBar
          place={location.label}
          distanceMi={radiusMi}
          onChange={() => nav.navigate('LocationPicker')}
          style={styles.locationBar}
        />
      </View>

      <CategoryChips
        selected={category}
        onSelect={setCategory}
        categories={CATEGORIES}
        style={styles.chips}
      />

      <View style={styles.gutter}>
        <PrimaryButton
          label="Upload a Need"
          sublabel="Describe the job. Nearby workers respond."
          icon="add"
          onPress={uploadNeed}
          style={styles.cta}
        />

        {openNeeds.length > 0 ? (
          <Pressable
            onPress={() => nav.navigate('Tabs', { screen: 'Bookings', params: { segment: 'needs' } })}
            accessibilityRole="button"
            accessibilityLabel={`${openNeeds.length} open needs with ${applicantCount} applicants. View needs.`}
            style={({ pressed }) => [styles.needsRow, pressed && styles.pressed]}
          >
            <Ionicons name="megaphone-outline" size={18} color={C.text} />
            <AppText variant="body" numberOfLines={1} style={styles.needsText}>
              {`${openNeeds.length} open ${openNeeds.length === 1 ? 'need' : 'needs'}`}
            </AppText>
            <AppText variant="small" color={C.textMuted} style={TABULAR}>
              {`${applicantCount} ${applicantCount === 1 ? 'applicant' : 'applicants'}`}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={C.textSubtle} style={styles.chev} />
          </Pressable>
        ) : null}

        <SectionHeader
          title={filtered ? `${listings.length} ${listings.length === 1 ? 'result' : 'results'}` : 'Services Near You'}
          actionLabel={filtered ? 'Clear' : undefined}
          onAction={
            filtered
              ? () => {
                  setCategory('all');
                  setQuery('');
                }
              : undefined
          }
          style={styles.sectionHeader}
        />

        {listings.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={filtered ? 'No services match' : 'No services in range yet'}
            message={
              filtered
                ? "Nobody nearby offers that right now. Upload a need and let workers come to you."
                : 'Widen your search area, or upload a need so nearby workers can find you.'
            }
            actionLabel="Upload a Need"
            onAction={uploadNeed}
          />
        ) : (
          listings.map((listing, index) => (
            <View key={listing.id} style={index === 0 ? undefined : styles.rowGap}>
              <ListingCard
                listing={listing}
                worker={workerById.get(listing.workerId) ?? null}
                onPress={() => nav.navigate('ServiceListing', { listingId: listing.id })}
              />
            </View>
          ))
        )}
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: S.md,
  },
  link: {
    marginRight: S.md,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  modeSwitch: {
    marginTop: S.md,
  },
  tagline: {
    marginTop: S.md,
  },
  search: {
    marginTop: S.base,
  },
  locationBar: {
    marginTop: S.base,
  },
  chips: {
    marginTop: S.xl,
  },
  cta: {
    marginTop: S.xl,
  },
  needsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
    paddingVertical: S.md,
    paddingHorizontal: S.base,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  needsText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  chev: {
    marginLeft: S.sm,
  },
  sectionHeader: {
    marginTop: S.xl,
    marginBottom: 18,
  },
  rowGap: {
    marginTop: 18,
  },
  pressed: {
    opacity: 0.6,
  },
});
