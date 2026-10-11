/**
 * A service listing row on the Hire side. Borderless, same rhythm as GigCard:
 * 72px photo, title, who offers it, rating and distance, price on the right.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, TABULAR } from '../../design/tokens';
import type { ServiceListing, Worker } from '../../data/types';
import { formatDistance, formatRate, formatRating } from '../../utils/format';
import { AppText } from '../../ui';
import { GigThumb } from '../gigs/GigThumb';

const THUMB = 72;

export interface ListingCardProps {
  listing: ServiceListing;
  worker: Worker | null;
  onPress: () => void;
}

export function ListingCard({ listing, worker, onPress }: ListingCardProps) {
  const price = formatRate(listing.rate, listing.rateType);
  const by = worker?.name ?? 'TeenWorks worker';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title} by ${by}, ${price}, rated ${formatRating(listing.rating)}, ${formatDistance(listing.distanceMi)} away`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <GigThumb gig={listing} size={THUMB} />

      <View style={styles.main}>
        <AppText variant="h3" numberOfLines={1}>
          {listing.title}
        </AppText>

        <View style={styles.byRow}>
          <AppText variant="small" color={C.textMuted} numberOfLines={1} style={styles.by}>
            {by}
          </AppText>
          {worker?.verified ? (
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={C.success}
              style={styles.badge}
              accessibilityLabel="ID verified"
            />
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="star" size={11} color={C.star} />
          <AppText variant="tiny" color={C.textMuted} numberOfLines={1} style={[styles.meta, TABULAR]}>
            {`${formatRating(listing.rating)} (${listing.reviewCount}) · ${formatDistance(listing.distanceMi)}`}
          </AppText>
        </View>
      </View>

      <AppText variant="h3" numberOfLines={1} style={[styles.price, TABULAR]}>
        {price}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md + 2,
  },
  byRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  by: {
    flexShrink: 1,
  },
  badge: {
    marginLeft: S.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm - 2,
  },
  meta: {
    marginLeft: S.xs,
  },
  price: {
    marginLeft: S.md,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
});
