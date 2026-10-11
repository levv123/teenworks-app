/** A booking in the Bookings tab: what, who, when, how much, and its status. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, TABULAR } from '../../design/tokens';
import type { Booking, Worker } from '../../data/types';
import { formatDay, slotLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/format';
import { AppText, Avatar, Card, Pill } from '../../ui';
import { BOOKING_STATUS } from './bookingStatus';

export interface BookingCardProps {
  booking: Booking;
  worker: Worker | null;
  onPress: () => void;
}

export function bookingWhen(booking: Booking): string {
  const day = formatDay(booking.date, booking.whenLabel || 'Date to be agreed');
  const slot = booking.slot === null ? '' : slotLabel(booking.slot).split(' (')[0];
  return slot ? `${day} · ${slot}` : day;
}

export function BookingCard({ booking, worker, onPress }: BookingCardProps) {
  const status = BOOKING_STATUS[booking.status];
  const name = worker?.name ?? 'Worker';
  const when = bookingWhen(booking);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${booking.title} with ${name}, ${when}, ${formatMoney(booking.total)}, ${status.label}`}
    >
      <View style={styles.top}>
        <AppText variant="h3" numberOfLines={1} style={styles.title}>
          {booking.title}
        </AppText>
        <AppText variant="h3" style={[styles.total, TABULAR]}>
          {formatMoney(booking.total)}
        </AppText>
      </View>

      <View style={styles.whoRow}>
        <Avatar name={name} uri={worker?.avatarUrl ?? null} size={22} />
        <AppText variant="small" color={C.textMuted} numberOfLines={1} style={styles.who}>
          {name}
        </AppText>
      </View>

      <View style={styles.bottom}>
        <View style={styles.whenRow}>
          <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
          <AppText variant="small" color={C.text} numberOfLines={1} style={styles.when}>
            {when}
          </AppText>
        </View>
        <Pill label={status.label} tone={status.tone} />
      </View>

      {booking.status === 'completed' && booking.review === undefined ? (
        <AppText variant="tiny" color={C.star} style={styles.nudge}>
          Tap to leave a review
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  total: {
    marginLeft: S.md,
  },
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm,
  },
  who: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.md,
  },
  whenRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: S.md,
  },
  when: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.xs + 2,
  },
  nudge: {
    marginTop: S.sm,
  },
});
