/**
 * Control strip above the full gig list: search, category filter, sort trigger
 * and the result count.
 *
 * Full-bleed like CategoryChips — it applies the gutter to its own rows so the
 * chips can scroll edge to edge. The screen owns the sort OptionSheet and feeds
 * it SORT_OPTIONS; this bar only reports the press.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { C, GUTTER, S } from '../../design/tokens';
import { CATEGORIES } from '../../data/mock';
import type { CategoryId, GigSort } from '../../data/types';
import { AppText, SearchField, SecondaryButton } from '../../ui';
import type { SheetOption } from '../../ui';
import { CategoryChips } from './CategoryChips';

const SORT_LABELS: Record<GigSort, string> = {
  newest: 'Newest',
  closest: 'Closest',
  highest: 'Highest Pay',
};

const SORT_ORDER: GigSort[] = ['newest', 'closest', 'highest'];

/** Feed this straight to an OptionSheet<GigSort>. */
export const SORT_OPTIONS: SheetOption<GigSort>[] = SORT_ORDER.map((id) => ({
  id,
  label: SORT_LABELS[id],
}));

export interface GigFilterBarProps {
  query: string;
  onQuery: (query: string) => void;
  category: CategoryId;
  onCategory: (category: CategoryId) => void;
  sort: GigSort;
  onSortPress: () => void;
  resultCount: number;
  style?: StyleProp<ViewStyle>;
}

export function GigFilterBar({
  query,
  onQuery,
  category,
  onCategory,
  sort,
  onSortPress,
  resultCount,
  style,
}: GigFilterBarProps) {
  const count = Number.isFinite(resultCount) ? Math.max(0, Math.round(resultCount)) : 0;

  return (
    <View style={style}>
      <SearchField
        value={query}
        onChangeText={onQuery}
        placeholder="Search gigs"
        style={styles.search}
      />

      <CategoryChips
        selected={category}
        onSelect={onCategory}
        categories={CATEGORIES}
        style={styles.chips}
      />

      <View style={styles.footer}>
        <AppText variant="small" color={C.textMuted} numberOfLines={1} style={styles.count}>
          {`${count} ${count === 1 ? 'gig' : 'gigs'} nearby`}
        </AppText>
        <SecondaryButton
          label={SORT_LABELS[sort]}
          icon="swap-vertical"
          size="sm"
          onPress={onSortPress}
          style={styles.sort}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    paddingHorizontal: GUTTER,
  },
  chips: {
    marginTop: S.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.base,
    paddingHorizontal: GUTTER,
  },
  count: {
    flex: 1,
    minWidth: 0,
    marginRight: S.md,
  },
  sort: {
    alignSelf: 'center',
  },
});
