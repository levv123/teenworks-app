/**
 * Step 3 of Post a Service: the listing as a customer would see it.
 *
 * Built from the same parts as Gig Detail, the app's customer-facing listing
 * screen: the GigThumb hero (which falls back to the category tile when there
 * is no photo), an h1 title with the price beside it, pills, icon meta rows and
 * the description. It sits on a Card so it reads as a listing, not as the form.
 */
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, TABULAR } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { IoniconName } from '../../data/types';
import { AppText, Card, Divider, Pill } from '../../ui';
import { GigThumb } from '../gigs';
import { formatRate } from '../../utils/format';
import { DAYS, durationLabel } from './constants';
import type { DurationId, RateType, ServiceCategoryId } from './constants';

export interface ServicePreviewProps {
  category: ServiceCategoryId;
  photos: string[];
  title: string;
  description: string;
  rate: number;
  rateType: RateType;
  duration: DurationId;
  place: string;
  availability: string[];
  provider: { name: string; handle: string };
}

const EXTRA_THUMB = 64;

function ExtraPhoto({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.extra}>
      {failed ? (
        <Ionicons name="image-outline" size={20} color={C.textSubtle} />
      ) : (
        <Image
          source={{ uri }}
          style={styles.extraImage}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

export function ServicePreview({
  category,
  photos,
  title,
  description,
  rate,
  rateType,
  duration,
  place,
  availability,
  provider,
}: ServicePreviewProps) {
  const categoryInfo = CATEGORY_BY_ID[category];
  const price = formatRate(rate, rateType);

  const metaRows: { icon: IoniconName; text: string }[] = [
    { icon: 'location-outline', text: place },
    { icon: 'time-outline', text: durationLabel(duration) },
    {
      icon: 'cash-outline',
      text: `${price} • ${rateType === 'hourly' ? 'Hourly rate' : 'Fixed price'}`,
    },
  ];

  return (
    <Card padding={S.md}>
      <GigThumb
        gig={{ imageUrl: photos[0] ?? null, category }}
        size={200}
        radius={R.lg}
        style={styles.hero}
      />

      {photos.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.extras}
          accessibilityLabel={`${photos.length - 1} more photos`}
        >
          {photos.slice(1).map((uri, index) => (
            <ExtraPhoto key={`${index}:${uri}`} uri={uri} />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="h1" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="h1" style={[styles.price, TABULAR]}>
            {price}
          </AppText>
        </View>

        <View style={styles.pills}>
          <Pill label={categoryInfo.label} icon={categoryInfo.icon} style={styles.pill} />
        </View>

        <View style={styles.meta}>
          {metaRows.map((row) => (
            <View key={row.icon} style={styles.metaRow}>
              <Ionicons name={row.icon} size={16} color={C.textMuted} />
              <AppText
                variant="small"
                color={C.textMuted}
                numberOfLines={1}
                style={styles.metaText}
              >
                {row.text}
              </AppText>
            </View>
          ))}

          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={16} color={C.textMuted} />
            <View style={styles.provider}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {provider.name}
              </AppText>
              <AppText variant="tiny" color={C.textMuted} numberOfLines={1}>
                {`@${provider.handle}`}
              </AppText>
            </View>
          </View>
        </View>

        <AppText variant="body" color={C.textMuted} style={styles.description}>
          {description}
        </AppText>

        <Divider style={styles.divider} />

        <AppText variant="h3">Available</AppText>
        <View style={styles.days}>
          {DAYS.map((day) => {
            const open = availability.includes(day);
            return (
              <Pill
                key={day}
                label={day}
                tone={open ? 'light' : 'outline'}
                style={styles.day}
                textStyle={open ? undefined : styles.dayClosed}
              />
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
  },
  extras: {
    marginTop: S.sm,
  },
  extra: {
    width: EXTRA_THUMB,
    height: EXTRA_THUMB,
    borderRadius: R.md,
    marginRight: S.sm,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  extraImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    paddingHorizontal: S.xs,
    paddingBottom: S.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.base,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    marginLeft: S.md,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
    // Cancels the per-pill bottom margin so the block hugs the row above.
    marginBottom: -S.sm,
  },
  pill: {
    marginRight: S.sm - 2,
    marginBottom: S.sm,
  },
  meta: {
    marginTop: S.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.md,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  provider: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  description: {
    marginTop: S.xs,
  },
  divider: {
    marginVertical: S.lg,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  day: {
    marginRight: S.sm - 2,
    marginBottom: S.sm - 2,
  },
  dayClosed: {
    color: C.textSubtle,
  },
});
