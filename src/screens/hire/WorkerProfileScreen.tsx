/**
 * Worker Profile — who a nearby worker is, reached from a WorkerCard (spec 6.1).
 *
 * Workers are static reference data, so this screen reads WORKERS directly and
 * renders an empty state rather than throwing on an id that no longer resolves.
 */
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { IoniconName, Worker } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp, useWorker } from '../../store/AppStore';
import { ListingCard } from '../../features/hire';
import {
  AppText,
  Avatar,
  Card,
  EmptyState,
  IconButton,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  Stars,
} from '../../ui';
import { formatDistance, formatMoney, formatRating } from '../../utils/format';

const AVATAR = 88;

function firstNameOf(name: string): string {
  const trimmed = (name ?? '').trim();
  if (trimmed.length === 0) return 'this worker';
  return trimmed.split(' ')[0] ?? trimmed;
}

/** "Yard Work and Cleaning" — an Oxford-comma-free list for the bio sentence. */
function listOf(labels: string[]): string {
  if (labels.length === 0) return 'all kinds of work';
  if (labels.length === 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1] ?? ''}`;
}

function bioFor(worker: Worker, categoryLabels: string[]): string {
  const first = firstNameOf(worker.name);
  const jobs = Math.max(0, Math.round(worker.jobs));
  return [
    `${first} works within ${formatDistance(worker.distanceMi)} of you and takes on ${listOf(categoryLabels)}.`,
    `${worker.headline}.`,
    `${jobs} ${jobs === 1 ? 'job' : 'jobs'} finished through TeenWorks at a ${formatRating(worker.rating)} average rating, starting at ${formatMoney(worker.startingPrice)}.`,
  ].join(' ');
}

export function WorkerProfileScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'WorkerProfile'>>();
  const { listings, blockedWorkerIds, toggleBlockWorker } = useApp();
  const worker = useWorker(params.workerId);
  const theirListings = listings.filter((l) => l.workerId === params.workerId);
  const blocked = blockedWorkerIds.includes(params.workerId);

  const goBack = useCallback(() => nav.goBack(), [nav]);
  const header = (
    <ScreenHeader
      title="Worker"
      onBack={goBack}
      right={
        worker ? (
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
        ) : undefined
      }
    />
  );

  const book = useCallback(() => {
    const first = theirListings[0];
    if (first) nav.navigate('BookService', { listingId: first.id });
    else nav.navigate('PostRequest');
  }, [nav, theirListings]);

  if (worker === null) {
    return (
      <Screen header={header}>
        <EmptyState
          icon="person-outline"
          title="Worker not found"
          message="This worker is no longer listed. They may have paused their profile."
          actionLabel="Go back"
          onAction={goBack}
        />
      </Screen>
    );
  }

  const categories = worker.categories.map((id) => CATEGORY_BY_ID[id]);
  const categoryLabels = categories.map((category) => category.label);

  const stats: { icon: IoniconName; value: string; label: string }[] = [
    {
      icon: 'star-outline',
      value: formatRating(worker.rating),
      label: 'Rating',
    },
    {
      icon: 'briefcase-outline',
      value: String(Math.max(0, Math.round(worker.jobs))),
      label: 'Jobs Done',
    },
    {
      icon: 'location-outline',
      value: formatDistance(worker.distanceMi),
      label: 'Away',
    },
  ];

  return (
    <Screen
      header={header}
      footer={
        blocked ? (
          <SecondaryButton
            label={`Unblock ${firstNameOf(worker.name)}`}
            icon="lock-open-outline"
            onPress={() => toggleBlockWorker(worker.id)}
          />
        ) : (
          <PrimaryButton
            label={
              theirListings.length > 0
                ? `Book ${firstNameOf(worker.name)}`
                : 'Upload a Need instead'
            }
            onPress={book}
          />
        )
      }
    >
      <View style={styles.identity}>
        <Avatar name={worker.name} uri={worker.avatarUrl} size={AVATAR} />

        <View style={styles.nameRow}>
          <AppText variant="h1" numberOfLines={1} style={styles.name}>
            {worker.name}
          </AppText>
          {worker.verified ? (
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={C.success}
              style={styles.badge}
              accessibilityRole="image"
              accessibilityLabel="Verified worker"
            />
          ) : null}
        </View>

        <AppText
          variant="small"
          color={C.textMuted}
          numberOfLines={2}
          style={styles.headline}
        >
          {worker.headline}
        </AppText>

        <Stars rating={worker.rating} size={15} style={styles.stars} />
      </View>

      <View style={styles.statRow}>
        {stats.map((stat, index) => (
          <Card
            key={stat.label}
            padding={S.md + 2}
            style={[styles.stat, index > 0 && styles.statGap]}
          >
            <View style={styles.statValueRow}>
              <Ionicons name={stat.icon} size={17} color={C.text} />
              <AppText variant="h2" numberOfLines={1} style={styles.statValue}>
                {stat.value}
              </AppText>
            </View>
            <AppText variant="tiny" color={C.textMuted} style={styles.statLabel}>
              {stat.label}
            </AppText>
          </Card>
        ))}
      </View>

      <AppText variant="h3" style={styles.sectionTitle}>
        Works in
      </AppText>
      <View style={styles.pills}>
        {categories.map((category) => (
          <Pill
            key={category.id}
            label={category.label}
            icon={category.icon}
            size="md"
            style={styles.pill}
          />
        ))}
      </View>

      <AppText variant="h3" style={styles.sectionTitle}>
        About
      </AppText>
      <AppText variant="body" color={C.textMuted}>
        {bioFor(worker, categoryLabels)}
      </AppText>

      <AppText variant="small" color={C.textSubtle} style={styles.priceNote}>
        {`Jobs start at ${formatMoney(worker.startingPrice)}`}
      </AppText>

      {theirListings.length > 0 ? (
        <>
          <AppText variant="h3" style={styles.sectionTitle}>
            Services
          </AppText>
          {theirListings.map((listing, index) => (
            <View key={listing.id} style={index > 0 ? styles.listingGap : undefined}>
              <ListingCard
                listing={listing}
                worker={worker}
                onPress={() => nav.navigate('ServiceListing', { listingId: listing.id })}
              />
            </View>
          ))}
        </>
      ) : null}

      {blocked ? (
        <AppText variant="small" color={C.danger} style={styles.blockNote}>
          You blocked this worker. They're hidden from your results.
        </AppText>
      ) : (
        <SecondaryButton
          label="Block"
          icon="ban-outline"
          size="sm"
          onPress={() => toggleBlockWorker(worker.id)}
          style={styles.blockBtn}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    paddingTop: S.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
  },
  badge: {
    marginLeft: S.sm - 2,
  },
  headline: {
    marginTop: S.xs,
    textAlign: 'center',
  },
  stars: {
    marginTop: S.sm,
  },
  statRow: {
    flexDirection: 'row',
    // Stretch keeps the three tiles level when a label wraps to a second line.
    alignItems: 'stretch',
    marginTop: S.xl,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    borderRadius: R.lg,
  },
  statGap: {
    marginLeft: S.sm + 2,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    ...TABULAR,
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  statLabel: {
    marginTop: S.xs + 2,
  },
  sectionTitle: {
    marginTop: S.xl,
    marginBottom: S.md,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  priceNote: {
    marginTop: S.base,
  },
  listingGap: {
    marginTop: 18,
  },
  blockNote: {
    marginTop: S.xl,
    textAlign: 'center',
  },
  blockBtn: {
    marginTop: S.xl,
    alignSelf: 'center',
  },
});
