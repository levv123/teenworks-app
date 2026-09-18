/**
 * Gigs — the full, filterable gig list (spec 6, "All Gigs").
 *
 * Search, category and sort all live in the store so the feed on Home and this
 * list stay in agreement. The list is a FlatList because the seeded catalogue
 * already runs past the "short list" threshold in spec 8.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GUTTER, S } from '../../design/tokens';
import type { CategoryId, Gig, GigSort } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp, useVisibleGigs } from '../../store/AppStore';
import { EmptyState, OptionSheet, Screen, ScreenHeader } from '../../ui';
import { GigCard, GigFilterBar, SORT_OPTIONS } from '../../features/gigs';

export function GigsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route<'Gigs'>>();
  const paramCategory = route.params?.category;

  const { category, query, sort, setCategory, setQuery, setSort } = useApp();
  const gigs = useVisibleGigs();
  const [sortOpen, setSortOpen] = useState(false);

  // The incoming category is a starting point, not a lock: apply it once and
  // then leave the chip row entirely to the user.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (paramCategory !== undefined) setCategory(paramCategory);
  }, [paramCategory, setCategory]);

  const openGig = useCallback(
    (gigId: string) => nav.navigate('GigDetail', { gigId }),
    [nav],
  );

  const chooseSort = useCallback(
    (next: GigSort) => {
      setSort(next);
      setSortOpen(false);
    },
    [setSort],
  );

  const clearFilters = useCallback(() => {
    setQuery('');
    setCategory('all');
    setSort('newest');
  }, [setCategory, setQuery, setSort]);

  const selectCategory = useCallback(
    (next: CategoryId) => setCategory(next),
    [setCategory],
  );

  const renderGig = useCallback(
    // 18px between rows, matching the Home feed rhythm.
    ({ item, index }: ListRenderItemInfo<Gig>) => (
      <View style={[styles.gutter, index > 0 && styles.gap]}>
        <GigCard gig={item} onPress={() => openGig(item.id)} showSaveButton />
      </View>
    ),
    [openGig],
  );

  return (
    <Screen
      scroll={false}
      padded={false}
      contentStyle={styles.content}
      header={
        <ScreenHeader
          title="Find Gigs"
          onBack={() => nav.goBack()}
          style={styles.gutter}
        />
      }
    >
      <FlatList
        data={gigs}
        keyExtractor={(gig) => gig.id}
        renderItem={renderGig}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <GigFilterBar
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={selectCategory}
            sort={sort}
            onSortPress={() => setSortOpen(true)}
            resultCount={gigs.length}
            style={styles.filters}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No gigs match"
            message="Nothing nearby fits that search. Clear the filters to see everything within your radius."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        }
      />

      <OptionSheet<GigSort>
        visible={sortOpen}
        title="Sort by"
        options={SORT_OPTIONS}
        selectedId={sort}
        onSelect={chooseSort}
        onClose={() => setSortOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The FlatList owns the bottom padding, so the container gives up its own.
  content: {
    paddingBottom: 0,
  },
  gutter: {
    paddingHorizontal: GUTTER,
  },
  list: {
    paddingBottom: S.xxl,
    flexGrow: 1,
  },
  filters: {
    marginBottom: S.lg,
  },
  gap: {
    marginTop: 18,
  },
});
