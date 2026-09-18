/**
 * Home (Earn) — spec 3.
 *
 * Brand header, location bar, category chips, the first four visible gigs and
 * the "Post a Service" CTA. Rendered unpadded so the chip row can scroll
 * full-bleed; every other block opts into the gutter explicitly.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, GUTTER, S } from '../../design/tokens';
import type { CategoryId } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp, useVisibleGigs } from '../../store/AppStore';
import { AppText, EmptyState, PrimaryButton, Screen, SectionHeader } from '../../ui';
import { CategoryChips, GigCard, LocationBar } from '../../features/gigs';
import { HeaderAvatar } from '../../features/chrome';

/** The feed teaser; the full list lives behind "See all". */
const FEED_LIMIT = 4;

export function EarnHomeScreen() {
  const nav = useNavigation<Nav>();
  const { category, location, setCategory } = useApp();
  const visible = useVisibleGigs();
  const feed = visible.slice(0, FEED_LIMIT);

  const openGig = useCallback(
    (gigId: string) => nav.navigate('GigDetail', { gigId }),
    [nav],
  );

  const selectCategory = useCallback(
    (next: CategoryId) => setCategory(next),
    [setCategory],
  );

  const clearCategory = useCallback(() => setCategory('all'), [setCategory]);

  return (
    <Screen padded={false} tabBarSpacing>
      <View style={styles.gutter}>
        <View style={styles.headerRow}>
          <AppText variant="display" numberOfLines={1} style={styles.brand}>
            TeenWorks
          </AppText>

          <View style={styles.headerRight}>
            <Pressable
              onPress={() => nav.navigate('PastJobs')}
              accessibilityRole="button"
              accessibilityLabel="Past Jobs"
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <AppText variant="small" style={styles.linkText}>
                Past Jobs
              </AppText>
            </Pressable>
            <HeaderAvatar />
          </View>
        </View>

        <AppText variant="body" color={C.textMuted} style={styles.tagline}>
          Make money. Build your future.
        </AppText>

        <LocationBar
          place={location.label}
          distanceMi={location.distanceMi}
          onChange={() => nav.navigate('LocationPicker')}
          style={styles.locationBar}
        />
      </View>

      <CategoryChips
        selected={category}
        onSelect={selectCategory}
        style={styles.chips}
      />

      <View style={styles.gutter}>
        <SectionHeader
          title="Find Your Next Gig"
          onAction={() => nav.navigate('Gigs')}
          style={styles.sectionHeader}
        />

        {feed.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No gigs in this category"
            message="Nothing nearby matches that filter right now. Try another category or widen your search."
            actionLabel={category === 'all' ? undefined : 'Show all gigs'}
            onAction={category === 'all' ? undefined : clearCategory}
          />
        ) : (
          // Spec 3.6: rows sit 18px apart with nothing above the first one.
          feed.map((gig, index) => (
            <View key={gig.id} style={index === 0 ? undefined : styles.gigGap}>
              <GigCard gig={gig} onPress={() => openGig(gig.id)} />
            </View>
          ))
        )}
      </View>

      <View style={styles.gutter}>
        <PrimaryButton
          label="Post a Service"
          sublabel="Set your skills. Get hired."
          icon="add"
          onPress={() => nav.navigate('PostService')}
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
  tagline: {
    marginTop: 2,
  },
  locationBar: {
    marginTop: 18,
  },
  chips: {
    marginTop: S.xl,
  },
  sectionHeader: {
    marginTop: S.xl,
    marginBottom: 18,
  },
  gigGap: {
    marginTop: 18,
  },
  cta: {
    // 8px clear of the last gig row, then the 24px section gap.
    marginTop: S.sm + S.xl,
  },
  pressed: {
    opacity: 0.6,
  },
});
