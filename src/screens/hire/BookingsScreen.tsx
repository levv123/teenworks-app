/**
 * Bookings — the Hire side's second tab. Three views over the same account:
 * Upcoming (awaiting reply + confirmed), Needs (what the user uploaded) and
 * Past (completed, cancelled, declined).
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { C, S } from '../../design/tokens';
import type { BookingsSegment } from '../../data/types';
import type { Nav, TabParamList } from '../../navigation/routes';
import { useApp, useBookings } from '../../store/AppStore';
import { AppText, EmptyState, PrimaryButton, Screen, Segmented } from '../../ui';
import { BookingCard, RequestCard } from '../../features/hire';
import { HeaderAvatar, useModeOnFocus } from '../../features/chrome';

export function BookingsScreen() {
  const nav = useNavigation<Nav>();
  const tabNav = useNavigation<BottomTabNavigationProp<TabParamList, 'Bookings'>>();
  const route = useRoute<RouteProp<TabParamList, 'Bookings'>>();
  const { requests, workers } = useApp();
  useModeOnFocus('hire');

  // The view lives in the route params, so deep links and the Hire home
  // shortcuts can open a specific one and a tap here keeps them in sync.
  const segment: BookingsSegment = route.params?.segment ?? 'upcoming';
  const setSegment = (next: BookingsSegment) => tabNav.setParams({ segment: next });

  const upcoming = useBookings('upcoming');
  const past = useBookings('past');
  const workerById = useMemo(() => new Map(workers.map((w) => [w.id, w])), [workers]);
  const openNeeds = requests.filter((r) => r.status === 'open').length;

  const list = segment === 'upcoming' ? upcoming : past;

  return (
    <Screen
      header={
        <View>
          <View style={styles.headerRow}>
            <AppText variant="display">Bookings</AppText>
            <HeaderAvatar />
          </View>
          <AppText variant="body" color={C.textMuted} style={styles.sub}>
            Everything you've booked and asked for.
          </AppText>
          <Segmented<BookingsSegment>
            value={segment}
            onChange={setSegment}
            options={[
              { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
              { id: 'needs', label: 'Needs', count: openNeeds },
              { id: 'past', label: 'Past' },
            ]}
            style={styles.segments}
          />
        </View>
      }
    >
      {segment === 'needs' ? (
        <>
          <PrimaryButton
            label="Upload a Need"
            icon="add"
            onPress={() => nav.navigate('PostRequest')}
            style={styles.topCta}
          />
          {requests.length === 0 ? (
            <EmptyState
              icon="megaphone-outline"
              title="No needs yet"
              message="Describe a job and nearby workers can offer to do it."
            />
          ) : (
            requests.map((request) => (
              <View key={request.id} style={styles.gap}>
                <RequestCard
                  request={request}
                  onPress={() => nav.navigate('NeedDetail', { requestId: request.id })}
                />
              </View>
            ))
          )}
        </>
      ) : list.length === 0 ? (
        <EmptyState
          icon={segment === 'upcoming' ? 'calendar-outline' : 'time-outline'}
          title={segment === 'upcoming' ? 'Nothing booked yet' : 'No past bookings'}
          message={
            segment === 'upcoming'
              ? 'Find a service nearby and book it, or upload a need.'
              : 'Finished and cancelled bookings will show up here.'
          }
          actionLabel={segment === 'upcoming' ? 'Browse services' : undefined}
          onAction={segment === 'upcoming' ? () => nav.navigate('Tabs', { screen: 'Hire' }) : undefined}
          style={styles.empty}
        />
      ) : (
        list.map((booking) => (
          <View key={booking.id} style={styles.gap}>
            <BookingCard
              booking={booking}
              worker={workerById.get(booking.workerId) ?? null}
              onPress={() => nav.navigate('BookingDetail', { bookingId: booking.id })}
            />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sub: {
    marginTop: 2,
  },
  segments: {
    marginTop: S.base,
  },
  topCta: {
    marginTop: S.base,
  },
  gap: {
    marginTop: S.md,
  },
  empty: {
    marginTop: S.xl,
  },
});
