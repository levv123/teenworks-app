/**
 * Service Listing — one service a nearby worker offers, with who they are,
 * what's included, when they're available, and a pinned "Book" CTA.
 */
import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { Nav, Route } from '../../navigation/routes';
import { useApp, useListing, useWorker } from '../../store/AppStore';
import {
  AppText,
  Avatar,
  EmptyState,
  IconButton,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  Stars,
} from '../../ui';
import { SafetyNote } from '../../features/hire';
import { formatDistance, formatRate, formatRating } from '../../utils/format';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ServiceListingScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'ServiceListing'>>();
  const { blockedWorkerIds } = useApp();
  const listing = useListing(params.listingId);
  const worker = useWorker(listing?.workerId);

  const goBack = useCallback(() => nav.goBack(), [nav]);

  if (listing === null || worker === null) {
    return (
      <Screen header={<ScreenHeader title="Service" onBack={goBack} />}>
        <EmptyState
          icon="pricetag-outline"
          title="Service not found"
          message="This listing was removed or paused by the worker."
          actionLabel="Go back"
          onAction={goBack}
        />
      </Screen>
    );
  }

  const category = CATEGORY_BY_ID[listing.category];
  const blocked = blockedWorkerIds.includes(worker.id);
  const first = worker.name.split(' ')[0] ?? worker.name;

  return (
    <Screen
      header={
        <ScreenHeader
          title="Service"
          onBack={goBack}
          right={
            <IconButton
              icon="flag-outline"
              accessibilityLabel={`Report ${worker.name}`}
              onPress={() =>
                nav.navigate('Report', {
                  targetType: 'worker',
                  targetId: worker.id,
                  name: worker.name,
                  workerId: worker.id,
                })
              }
            />
          }
        />
      }
      footer={
        blocked ? (
          <AppText variant="small" color={C.textMuted} style={styles.blocked}>
            {`You blocked ${first}. Unblock them from their profile to book.`}
          </AppText>
        ) : (
          <PrimaryButton
            label={`Book ${first} · ${formatRate(listing.rate, listing.rateType)}`}
            onPress={() => nav.navigate('BookService', { listingId: listing.id })}
          />
        )
      }
    >
      {listing.imageUrl ? (
        <Image
          source={{ uri: listing.imageUrl }}
          style={styles.hero}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <View style={styles.titleRow}>
        <AppText variant="h1" style={styles.title}>
          {listing.title}
        </AppText>
        <AppText variant="h2" style={[styles.price, TABULAR]}>
          {formatRate(listing.rate, listing.rateType)}
        </AppText>
      </View>

      <View style={styles.pills}>
        <Pill label={category.label} icon={category.icon} size="md" style={styles.pill} />
        <Pill
          label={listing.rateType === 'hourly' ? 'Hourly' : 'Fixed price'}
          size="md"
          style={styles.pill}
        />
        <Pill label={`${formatDistance(listing.distanceMi)} away`} size="md" />
      </View>

      <Pressable
        onPress={() => nav.navigate('WorkerProfile', { workerId: worker.id })}
        accessibilityRole="button"
        accessibilityLabel={`View ${worker.name}'s profile`}
        style={({ pressed }) => [styles.worker, pressed && styles.pressed]}
      >
        <Avatar name={worker.name} uri={worker.avatarUrl} size={48} />
        <View style={styles.workerText}>
          <View style={styles.nameRow}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {worker.name}
            </AppText>
            {worker.verified ? (
              <Ionicons name="shield-checkmark" size={14} color={C.success} style={styles.badge} />
            ) : null}
          </View>
          <View style={styles.nameRow}>
            <Stars rating={listing.rating} size={12} />
            <AppText variant="tiny" color={C.textMuted} style={[styles.ratingText, TABULAR]}>
              {`${formatRating(listing.rating)} · ${listing.reviewCount} reviews · ${worker.jobs} jobs`}
            </AppText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
      </Pressable>

      <AppText variant="h3" style={styles.section}>
        About this service
      </AppText>
      <AppText variant="body" color={C.textMuted}>
        {listing.description}
      </AppText>

      <AppText variant="h3" style={styles.section}>
        What's included
      </AppText>
      {listing.includes.map((item) => (
        <View key={item} style={styles.bullet}>
          <Ionicons name="checkmark" size={16} color={C.success} />
          <AppText variant="body" style={styles.bulletText}>
            {item}
          </AppText>
        </View>
      ))}

      <AppText variant="h3" style={styles.section}>
        Availability
      </AppText>
      <View style={styles.week}>
        {WEEK.map((day) => {
          const on = listing.availability.includes(day);
          return (
            <View
              key={day}
              style={[styles.day, on ? styles.dayOn : styles.dayOff]}
              accessibilityLabel={`${day}: ${on ? 'available' : 'not available'}`}
            >
              <AppText variant="tiny" color={on ? C.onLight : C.textSubtle}>
                {day}
              </AppText>
            </View>
          );
        })}
      </View>
      <AppText variant="tiny" color={C.textSubtle} style={styles.areaNote}>
        {`Based in ${listing.place}. Only the city is shown publicly.`}
      </AppText>

      <SafetyNote compact style={styles.safety} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 200,
    borderRadius: R.xl,
    backgroundColor: C.surfaceAlt,
    marginTop: S.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.lg,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    marginLeft: S.md,
    marginTop: 3,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  pill: {
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  worker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.base,
    padding: S.md,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  workerText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  badge: {
    marginLeft: S.xs,
  },
  ratingText: {
    marginLeft: S.sm - 2,
  },
  section: {
    marginTop: S.xl,
    marginBottom: S.sm,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs + 2,
  },
  bulletText: {
    marginLeft: S.sm,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: {
    backgroundColor: C.text,
  },
  dayOff: {
    backgroundColor: C.surfaceAlt,
  },
  areaNote: {
    marginTop: S.md,
  },
  safety: {
    marginTop: S.xl,
  },
  blocked: {
    textAlign: 'center',
    paddingVertical: S.md,
  },
  pressed: {
    opacity: 0.6,
  },
});
