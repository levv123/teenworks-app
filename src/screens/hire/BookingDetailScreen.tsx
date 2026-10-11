/**
 * Booking Detail — status, progress, the job's details and every action the
 * customer can take at this stage: cancel, mark done, review, book again or
 * report a problem. Destructive actions ask once inline before they run.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import type { BookingStatus, IoniconName } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp, useWorker } from '../../store/AppStore';
import { errorMessage } from '../../services/marketplace';
import {
  AppText,
  Avatar,
  Card,
  EmptyState,
  ErrorBanner,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  Stars,
  TextField,
} from '../../ui';
import { BOOKING_STATUS, SafetyNote } from '../../features/hire';
import { formatDay, isOnOrBeforeToday, slotLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/format';

const STEPS: { id: BookingStatus; label: string }[] = [
  { id: 'requested', label: 'Requested' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
];

type Busy = null | 'cancel' | 'complete' | 'review';

export function BookingDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'BookingDetail'>>();
  const { bookings, cancelBooking, completeBooking, reviewBooking } = useApp();
  const booking = bookings.find((b) => b.id === params.bookingId) ?? null;
  const worker = useWorker(booking?.workerId);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState('');

  const goBack = () => nav.goBack();

  if (booking === null) {
    return (
      <Screen header={<ScreenHeader title="Booking" onBack={goBack} />}>
        <EmptyState
          icon="calendar-outline"
          title="Booking not found"
          message="It may have been removed. Your other bookings are still in the Bookings tab."
          actionLabel="Go back"
          onAction={goBack}
        />
      </Screen>
    );
  }

  const name = worker?.name ?? 'Worker';
  const first = name.split(' ')[0] ?? name;
  const status = BOOKING_STATUS[booking.status];
  const active = booking.status === 'requested' || booking.status === 'confirmed';
  const canComplete = booking.status === 'confirmed' && isOnOrBeforeToday(booking.date);
  const stepIndex = STEPS.findIndex((s) => s.id === booking.status);

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
      setLastAction(null);
      setConfirmCancel(false);
    } catch (e) {
      setError(errorMessage(e));
      setLastAction(() => () => void run(kind, action));
    } finally {
      setBusy(null);
    }
  };

  const rows: { icon: IoniconName; label: string; value: string }[] = [
    { icon: 'calendar-outline', label: 'Date', value: formatDay(booking.date, booking.whenLabel || 'To be agreed') },
    ...(booking.slot ? [{ icon: 'time-outline' as IoniconName, label: 'Time', value: slotLabel(booking.slot) }] : []),
    ...(booking.hours ? [{ icon: 'hourglass-outline' as IoniconName, label: 'Length', value: `${booking.hours} ${booking.hours === 1 ? 'hour' : 'hours'}` }] : []),
    { icon: 'location-outline', label: 'Area', value: booking.place || 'Not set' },
    { icon: 'cash-outline', label: 'Estimated total', value: formatMoney(booking.total) },
  ];

  return (
    <Screen
      header={
        <ScreenHeader
          title="Booking"
          onBack={goBack}
          right={<Pill label={status.label} tone={status.tone} />}
        />
      }
    >
      <AppText variant="h1" style={styles.title}>
        {booking.title}
      </AppText>
      <AppText variant="body" color={C.textMuted} style={styles.explain}>
        {status.explain(first)}
      </AppText>

      {booking.status !== 'cancelled' && booking.status !== 'declined' ? (
        <View style={styles.progress} accessibilityLabel={`Progress: ${status.label}`}>
          {STEPS.map((step, i) => {
            const reached = i <= stepIndex;
            return (
              <React.Fragment key={step.id}>
                {i > 0 ? <View style={[styles.line, reached && styles.lineOn]} /> : null}
                <View style={styles.stepWrap}>
                  <View style={[styles.dot, reached && styles.dotOn]}>
                    {reached ? <Ionicons name="checkmark" size={12} color={C.onLight} /> : null}
                  </View>
                  <AppText variant="tiny" color={reached ? C.text : C.textSubtle} style={styles.stepLabel}>
                    {step.label}
                  </AppText>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      ) : null}

      <Pressable
        onPress={() => worker && nav.navigate('WorkerProfile', { workerId: worker.id })}
        disabled={worker === null}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}'s profile`}
        style={({ pressed }) => [styles.worker, pressed && styles.pressed]}
      >
        <Avatar name={name} uri={worker?.avatarUrl ?? null} size={44} />
        <View style={styles.workerText}>
          <AppText variant="bodyBold">{name}</AppText>
          <AppText variant="small" color={C.textMuted} numberOfLines={1}>
            {worker?.headline ?? ''}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
      </Pressable>

      <Card style={styles.card}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.row, i > 0 && styles.rowGap]}>
            <Ionicons name={row.icon} size={16} color={C.textMuted} />
            <AppText variant="small" color={C.textMuted} style={styles.rowLabel}>
              {row.label}
            </AppText>
            <AppText variant="bodyBold" style={[styles.rowValue, TABULAR]} numberOfLines={2}>
              {row.value}
            </AppText>
          </View>
        ))}
        {booking.notes ? (
          <View style={styles.notes}>
            <AppText variant="tiny" color={C.textMuted}>
              Your notes
            </AppText>
            <AppText variant="body" style={styles.notesText}>
              {booking.notes}
            </AppText>
          </View>
        ) : null}
      </Card>

      <ErrorBanner message={error} onRetry={lastAction ?? undefined} style={styles.block} />

      {/* ── Actions by status ── */}
      {booking.status === 'confirmed' ? (
        <View style={styles.block}>
          <PrimaryButton
            label="Mark as completed"
            icon="checkmark-done"
            onPress={() => void run('complete', () => completeBooking(booking.id))}
            loading={busy === 'complete'}
            disabled={!canComplete || busy !== null}
          />
          {!canComplete ? (
            <AppText variant="tiny" color={C.textSubtle} style={styles.hint}>
              {`You can mark it done on ${formatDay(booking.date)}.`}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {booking.status === 'completed' && booking.review === undefined ? (
        <Card style={styles.block}>
          <AppText variant="h3">{`How did ${first} do?`}</AppText>
          <View style={styles.starRow} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setStars(n)}
                accessibilityRole="radio"
                accessibilityState={{ selected: stars === n }}
                accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`}
                hitSlop={4}
                style={styles.starBtn}
              >
                <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={30} color={n <= stars ? C.star : C.textSubtle} />
              </Pressable>
            ))}
          </View>
          <TextField
            label="Review (optional)"
            value={body}
            onChangeText={setBody}
            placeholder="On time? Friendly? Would you book again?"
            multiline
            numberOfLines={3}
            maxLength={400}
          />
          <PrimaryButton
            label="Post review"
            onPress={() => void run('review', () => reviewBooking(booking.id, stars, body))}
            loading={busy === 'review'}
            disabled={stars === 0 || busy !== null}
            style={styles.reviewBtn}
          />
        </Card>
      ) : null}

      {booking.review ? (
        <Card style={styles.block}>
          <AppText variant="small" color={C.textMuted}>
            Your review
          </AppText>
          <Stars rating={booking.review.rating} size={16} style={styles.reviewStars} />
          {booking.review.body ? <AppText variant="body">{booking.review.body}</AppText> : null}
        </Card>
      ) : null}

      {!active && booking.listingId ? (
        <SecondaryButton
          label="Book again"
          icon="refresh"
          onPress={() => nav.navigate('BookService', { listingId: booking.listingId as string })}
          style={styles.block}
        />
      ) : null}

      {active ? (
        confirmCancel ? (
          <View style={[styles.confirm, styles.block]}>
            <AppText variant="body">
              {booking.status === 'confirmed'
                ? `Cancel this booking? ${first} has already planned for it.`
                : 'Cancel this request?'}
            </AppText>
            <View style={styles.confirmRow}>
              <SecondaryButton
                label="Keep it"
                onPress={() => setConfirmCancel(false)}
                disabled={busy !== null}
                style={styles.confirmBtn}
              />
              <Pressable
                onPress={() => void run('cancel', () => cancelBooking(booking.id))}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel="Yes, cancel booking"
                style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
              >
                <AppText variant="bodyBold" color={C.onLight}>
                  {busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirmCancel(true)}
            accessibilityRole="button"
            accessibilityLabel={booking.status === 'confirmed' ? 'Cancel booking' : 'Cancel request'}
            style={({ pressed }) => [styles.textBtn, pressed && styles.pressed]}
          >
            <AppText variant="bodyBold" color={C.danger}>
              {booking.status === 'confirmed' ? 'Cancel booking' : 'Cancel request'}
            </AppText>
          </Pressable>
        )
      ) : null}

      <SafetyNote style={styles.block} />

      <Pressable
        onPress={() =>
          nav.navigate('Report', {
            targetType: 'booking',
            targetId: booking.id,
            name: `${booking.title} with ${name}`,
            workerId: booking.workerId,
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Report a problem with this booking"
        style={({ pressed }) => [styles.report, pressed && styles.pressed]}
      >
        <Ionicons name="flag-outline" size={16} color={C.textMuted} />
        <AppText variant="small" color={C.textMuted} style={styles.reportText}>
          Report a problem
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: S.sm,
  },
  explain: {
    marginTop: S.sm,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.xl,
  },
  stepWrap: {
    alignItems: 'center',
    width: 72,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 10,
    marginHorizontal: -24,
    backgroundColor: C.surfaceHigh,
  },
  lineOn: {
    backgroundColor: C.text,
  },
  stepLabel: {
    marginTop: S.xs + 2,
  },
  worker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xl,
  },
  workerText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  card: {
    marginTop: S.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowGap: {
    marginTop: S.md,
  },
  rowLabel: {
    marginLeft: S.sm,
    width: 110,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  notes: {
    marginTop: S.base,
    paddingTop: S.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  notesText: {
    marginTop: S.xs,
  },
  block: {
    marginTop: S.lg,
  },
  hint: {
    marginTop: S.sm,
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    marginTop: S.md,
    marginBottom: S.base,
  },
  starBtn: {
    marginRight: S.sm,
  },
  reviewBtn: {
    marginTop: S.base,
  },
  reviewStars: {
    marginTop: S.sm,
    marginBottom: S.sm,
  },
  confirm: {
    padding: S.base,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.danger,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  confirmBtn: {
    flex: 1,
    marginRight: S.sm,
  },
  dangerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.md,
    borderRadius: R.full,
    backgroundColor: C.danger,
  },
  textBtn: {
    alignItems: 'center',
    paddingVertical: S.md,
    marginTop: S.md,
  },
  report: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S.lg,
    paddingVertical: S.sm,
  },
  reportText: {
    marginLeft: S.sm - 2,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.6,
  },
});
