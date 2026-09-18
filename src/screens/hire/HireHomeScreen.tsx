/**
 * Home (Hire) — spec 6.1.
 *
 * The other half of the app: what the user has asked for, and who nearby can do
 * it. Rendered unpadded so the worker category filter can scroll full-bleed;
 * every other block opts into the gutter explicitly.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, GUTTER, S } from '../../design/tokens';
import { CATEGORIES, WORKERS } from '../../data/mock';
import type { CategoryId } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import {
  AppText,
  EmptyState,
  PrimaryButton,
  Screen,
  SectionHeader,
  SecondaryButton,
} from '../../ui';
import { CategoryChips, LocationBar } from '../../features/gigs';
import { RequestCard, WorkerCard } from '../../features/hire';

export function HireHomeScreen() {
  const nav = useNavigation<Nav>();
  const { location, radiusMi, requests, setMode, showToast } = useApp();

  // Local rather than the store's `category`: the Hire filter must not quietly
  // re-filter the gig feed the user left behind on the Earn side.
  const [category, setCategory] = useState<CategoryId>('all');

  const workers = useMemo(
    () =>
      WORKERS.filter((worker) => {
        if (worker.distanceMi > radiusMi) return false;
        if (category === 'all') return true;
        return worker.categories.includes(category);
      }),
    [category, radiusMi],
  );

  const switchToEarning = useCallback(() => {
    setMode('earn');
    showToast('Switched to earning');
    nav.goBack();
  }, [nav, setMode, showToast]);

  const postRequest = useCallback(() => nav.navigate('PostRequest'), [nav]);

  const openWorker = useCallback(
    (workerId: string) => nav.navigate('WorkerProfile', { workerId }),
    [nav],
  );

  return (
    <Screen padded={false}>
      <View style={styles.gutter}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <AppText variant="display" numberOfLines={1}>
              Hire
            </AppText>
            <AppText variant="body" color={C.textMuted} style={styles.tagline}>
              Get it done today.
            </AppText>
          </View>

          <SecondaryButton
            label="Switch to Earning"
            icon="swap-horizontal"
            size="sm"
            onPress={switchToEarning}
            style={styles.switch}
          />
        </View>

        <LocationBar
          place={location.label}
          distanceMi={location.distanceMi}
          onChange={() => nav.navigate('LocationPicker')}
          style={styles.locationBar}
        />

        <PrimaryButton
          label="Post a Request"
          sublabel="Tell us what you need done."
          icon="add"
          onPress={postRequest}
          style={styles.cta}
        />

        <SectionHeader title="Your requests" style={styles.sectionHeader} />

        {requests.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title="No requests yet"
            message="Post what you need done and nearby workers can apply for it."
            actionLabel="Post a Request"
            onAction={postRequest}
          />
        ) : (
          requests.map((request, index) => (
            <View key={request.id} style={index === 0 ? undefined : styles.requestGap}>
              <RequestCard request={request} />
            </View>
          ))
        )}

        <SectionHeader title="Workers near you" style={styles.sectionHeader} />
      </View>

      <CategoryChips
        selected={category}
        onSelect={setCategory}
        categories={CATEGORIES}
        style={styles.chips}
      />

      <View style={styles.gutter}>
        {workers.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No workers in range"
            message="Nobody nearby matches that filter right now. Try another category or widen your search area."
            actionLabel={category === 'all' ? 'Change location' : 'Show everyone'}
            onAction={
              category === 'all'
                ? () => nav.navigate('LocationPicker')
                : () => setCategory('all')
            }
          />
        ) : (
          workers.map((worker, index) => (
            <View key={worker.id} style={index === 0 ? undefined : styles.workerGap}>
              <WorkerCard
                worker={worker}
                onPress={() => openWorker(worker.id)}
                onHire={() => openWorker(worker.id)}
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
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  tagline: {
    marginTop: 2,
  },
  switch: {
    marginLeft: S.md,
  },
  locationBar: {
    marginTop: 18,
  },
  cta: {
    marginTop: S.xl,
  },
  sectionHeader: {
    marginTop: S.xl,
    marginBottom: 18,
  },
  requestGap: {
    marginTop: S.md,
  },
  chips: {
    // The section header above already carries the 18px gap to its content.
    marginBottom: 18,
  },
  workerGap: {
    marginTop: 18,
  },
});
