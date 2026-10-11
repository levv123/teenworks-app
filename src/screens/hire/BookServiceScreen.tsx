/**
 * Book a Service — pick a day the worker is available, a time slot, hours for
 * hourly work, the area and any notes, agree to the safety terms, and send the
 * request. The worker then accepts or declines; nothing is charged in-app.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, GUTTER, R, S, TABULAR } from '../../design/tokens';
import type { Booking, TimeSlot } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp, useListing, useWorker } from '../../store/AppStore';
import { BOOKING_LIMITS, errorMessage, estimateTotal } from '../../services/marketplace';
import {
  AppText,
  ChoiceChip,
  EmptyState,
  ErrorBanner,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  TextField,
} from '../../ui';
import { GigThumb } from '../../features/gigs';
import { bookingWhen } from '../../features/hire';
import { TIME_SLOTS, dayParts, upcomingAvailableDates } from '../../utils/dates';
import { formatMoney, formatRate } from '../../utils/format';

export function BookServiceScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'BookService'>>();
  const { createBooking, location } = useApp();
  const listing = useListing(params.listingId);
  const worker = useWorker(listing?.workerId);

  const dates = useMemo(
    () => (listing ? upcomingAvailableDates(listing.availability, 10) : []),
    [listing],
  );

  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [hours, setHours] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);

  const goBack = () => nav.goBack();

  if (listing === null || worker === null) {
    return (
      <Screen header={<ScreenHeader title="Book" onBack={goBack} />}>
        <EmptyState
          icon="pricetag-outline"
          title="Service not available"
          message="This listing was removed or paused, so it can't be booked."
          actionLabel="Go back"
          onAction={goBack}
        />
      </Screen>
    );
  }

  const first = worker.name.split(' ')[0] ?? worker.name;
  const hourly = listing.rateType === 'hourly';
  const total = estimateTotal(listing, hourly ? hours : null);

  const missing: string[] = [];
  if (date === null) missing.push('a day');
  if (slot === null) missing.push('a time');
  if (!agreed) missing.push('the safety checkbox');
  const valid = missing.length === 0 && notes.length <= BOOKING_LIMITS.notesMax;

  const submit = async () => {
    setAttempted(true);
    if (!valid || date === null || slot === null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createBooking({
        listingId: listing.id,
        date,
        slot,
        hours: hourly ? hours : null,
        notes,
        place: location.label,
      });
      setDone(booking);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (done !== null) {
    return (
      <Screen
        header={<ScreenHeader title="Request sent" onBack={goBack} />}
        footer={
          <View>
            <PrimaryButton
              label="View booking"
              onPress={() => nav.replace('BookingDetail', { bookingId: done.id })}
            />
            <SecondaryButton
              label="Back to Hire"
              onPress={() => nav.navigate('Tabs', { screen: 'Hire' })}
              style={styles.secondary}
            />
          </View>
        }
      >
        <View style={styles.successIcon}>
          <Ionicons name="paper-plane" size={30} color={C.onLight} />
        </View>
        <AppText variant="h1" style={styles.center}>
          {`Request sent to ${first}`}
        </AppText>
        <AppText variant="body" color={C.textMuted} style={[styles.center, styles.successSub]}>
          {`${done.title} · ${bookingWhen(done)} · ${formatMoney(done.total)}`}
        </AppText>

        <View style={styles.steps}>
          {[
            `${first} accepts or declines. You'll see the status change in Bookings.`,
            'Once it’s confirmed, share your exact address and any access details.',
            'After the job, mark it done and leave a review.',
          ].map((text, i) => (
            <View key={text} style={styles.step}>
              <View style={styles.stepNum}>
                <AppText variant="tiny" color={C.onLight}>
                  {String(i + 1)}
                </AppText>
              </View>
              <AppText variant="body" color={C.textMuted} style={styles.stepText}>
                {text}
              </AppText>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <Screen
      header={<ScreenHeader title={`Book ${first}`} onBack={goBack} />}
      footer={
        <View>
          {attempted && missing.length > 0 ? (
            <AppText variant="tiny" color={C.danger} style={styles.missing}>
              {`Choose ${missing.join(', ')} to continue.`}
            </AppText>
          ) : null}
          <PrimaryButton
            label={submitting ? 'Sending…' : `Send request · ${formatMoney(total)}`}
            onPress={submit}
            loading={submitting}
            disabled={submitting}
          />
        </View>
      }
    >
      <View style={styles.summary}>
        <GigThumb gig={listing} size={52} />
        <View style={styles.summaryText}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {listing.title}
          </AppText>
          <AppText variant="small" color={C.textMuted} numberOfLines={1}>
            {`${worker.name} · ${formatRate(listing.rate, listing.rateType)}`}
          </AppText>
        </View>
      </View>

      <AppText variant="h3" style={styles.section}>
        Day
      </AppText>
      {dates.length === 0 ? (
        <AppText variant="small" color={C.textMuted}>
          {`${first} has no open days in the next four weeks. Try uploading a need instead.`}
        </AppText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.dateRow}
        >
          {dates.map((iso) => {
            const parts = dayParts(iso);
            const selected = date === iso;
            return (
              <Pressable
                key={iso}
                onPress={() => setDate(iso)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${parts.dow} ${parts.month} ${parts.day}`}
                style={({ pressed }) => [
                  styles.date,
                  selected ? styles.dateOn : styles.dateOff,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="tiny" color={selected ? C.onLightMuted : C.textMuted}>
                  {parts.dow}
                </AppText>
                <AppText variant="h2" color={selected ? C.onLight : C.text} style={TABULAR}>
                  {parts.day}
                </AppText>
                <AppText variant="tiny" color={selected ? C.onLightMuted : C.textMuted}>
                  {parts.month}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <AppText variant="h3" style={styles.section}>
        Time
      </AppText>
      <View style={styles.wrap}>
        {TIME_SLOTS.map((option) => (
          <ChoiceChip
            key={option.id}
            label={option.label}
            sublabel={option.range}
            selected={slot === option.id}
            onPress={() => setSlot(option.id)}
          />
        ))}
      </View>
      <AppText variant="tiny" color={C.textSubtle}>
        Jobs finish by 7pm so teen workers stay inside school-night hour limits.
      </AppText>

      {hourly ? (
        <>
          <AppText variant="h3" style={styles.section}>
            Hours
          </AppText>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setHours((h) => Math.max(BOOKING_LIMITS.minHours, h - 1))}
              disabled={hours <= BOOKING_LIMITS.minHours}
              accessibilityRole="button"
              accessibilityLabel="Fewer hours"
              style={({ pressed }) => [
                styles.stepBtn,
                hours <= BOOKING_LIMITS.minHours && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="remove" size={20} color={C.text} />
            </Pressable>
            <AppText variant="h2" style={[styles.hours, TABULAR]} accessibilityLiveRegion="polite">
              {`${hours} ${hours === 1 ? 'hour' : 'hours'}`}
            </AppText>
            <Pressable
              onPress={() => setHours((h) => Math.min(BOOKING_LIMITS.maxHours, h + 1))}
              disabled={hours >= BOOKING_LIMITS.maxHours}
              accessibilityRole="button"
              accessibilityLabel="More hours"
              style={({ pressed }) => [
                styles.stepBtn,
                hours >= BOOKING_LIMITS.maxHours && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add" size={20} color={C.text} />
            </Pressable>
          </View>
        </>
      ) : null}

      <AppText variant="h3" style={styles.section}>
        Where
      </AppText>
      <View style={styles.where}>
        <Ionicons name="location-outline" size={16} color={C.text} />
        <AppText variant="body" style={styles.whereText}>
          {location.label}
        </AppText>
        <Pressable
          onPress={() => nav.navigate('LocationPicker')}
          accessibilityRole="button"
          accessibilityLabel="Change area"
          hitSlop={8}
        >
          <AppText variant="small" style={styles.underline}>
            Change
          </AppText>
        </Pressable>
      </View>
      <AppText variant="tiny" color={C.textSubtle} style={styles.whereNote}>
        Only your area goes in the request. Share the street address after the booking is confirmed.
      </AppText>

      <TextField
        label="Notes for the worker (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="What should they know? What should they bring?"
        multiline
        numberOfLines={3}
        maxLength={BOOKING_LIMITS.notesMax}
        style={styles.section}
      />
      <AppText variant="tiny" color={C.textSubtle} style={styles.counter}>
        {`${notes.length}/${BOOKING_LIMITS.notesMax}`}
      </AppText>

      <Pressable
        onPress={() => setAgreed((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="I confirm this job is safe for a teen worker and an adult will be home or reachable"
        style={({ pressed }) => [
          styles.agree,
          attempted && !agreed && styles.agreeError,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name={agreed ? 'checkbox' : 'square-outline'}
          size={22}
          color={agreed ? C.text : C.textMuted}
        />
        <AppText variant="small" color={C.textMuted} style={styles.agreeText}>
          This job is safe for a teen worker: no driving, ladders or roofs, power tools or harsh
          chemicals. An adult will be home or reachable while they work.
        </AppText>
      </Pressable>

      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <AppText variant="body" color={C.textMuted}>
            {hourly ? `${formatMoney(listing.rate)} × ${hours} ${hours === 1 ? 'hour' : 'hours'}` : 'Fixed price'}
          </AppText>
          <AppText variant="bodyBold" style={TABULAR}>
            {formatMoney(total)}
          </AppText>
        </View>
        <AppText variant="tiny" color={C.textSubtle} style={styles.payNote}>
          Estimated total. In-app payments aren't live in this version yet, so nothing is charged
          here.
        </AppText>
      </View>

      <ErrorBanner message={error} onRetry={submit} style={styles.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  section: {
    marginTop: S.xl,
    marginBottom: S.md,
  },
  bleed: {
    marginHorizontal: -GUTTER,
  },
  dateRow: {
    paddingHorizontal: GUTTER,
  },
  date: {
    width: 60,
    paddingVertical: S.sm + 2,
    borderRadius: R.lg,
    alignItems: 'center',
    marginRight: S.sm,
    borderWidth: 1,
  },
  dateOn: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  dateOff: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  hours: {
    minWidth: 110,
    textAlign: 'center',
  },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whereText: {
    flex: 1,
    marginLeft: S.sm,
  },
  whereNote: {
    marginTop: S.sm,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  counter: {
    marginTop: S.xs + 2,
    textAlign: 'right',
  },
  agree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.xl,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  agreeError: {
    borderColor: C.danger,
  },
  agreeText: {
    flex: 1,
    marginLeft: S.md,
  },
  totalBox: {
    marginTop: S.xl,
    padding: S.base,
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payNote: {
    marginTop: S.sm,
  },
  error: {
    marginTop: S.base,
  },
  missing: {
    marginBottom: S.sm,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: S.huge,
    marginBottom: S.lg,
  },
  center: {
    textAlign: 'center',
  },
  successSub: {
    marginTop: S.sm,
  },
  steps: {
    marginTop: S.xxl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: S.base,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.md,
    marginTop: 1,
  },
  stepText: {
    flex: 1,
  },
  secondary: {
    marginTop: S.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
