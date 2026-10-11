/**
 * Need Detail — one need the customer uploaded: the brief, who has offered to
 * do it, and the actions that move it along (hire someone, or close it).
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { Nav, Route } from '../../navigation/routes';
import { useApp, useApplicants, useWorker } from '../../store/AppStore';
import { errorMessage } from '../../services/marketplace';
import {
  AppText,
  Card,
  EmptyState,
  ErrorBanner,
  Pill,
  Screen,
  ScreenHeader,
  SecondaryButton,
} from '../../ui';
import { SafetyNote, WorkerCard } from '../../features/hire';
import { formatMoney, timeAgo } from '../../utils/format';

export function NeedDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'NeedDetail'>>();
  const { requests, hireForRequest, closeRequest } = useApp();
  const request = requests.find((r) => r.id === params.requestId) ?? null;
  const applicants = useApplicants(request);
  const hired = useWorker(request?.hiredWorkerId);

  const [pendingHire, setPendingHire] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = () => nav.goBack();

  if (request === null) {
    return (
      <Screen header={<ScreenHeader title="Need" onBack={goBack} />}>
        <EmptyState
          icon="megaphone-outline"
          title="Need not found"
          message="It may have been removed."
          actionLabel="Go back"
          onAction={goBack}
        />
      </Screen>
    );
  }

  const category = CATEGORY_BY_ID[request.category];
  const statusPill =
    request.status === 'open'
      ? { label: 'Open', tone: 'success' as const }
      : request.status === 'hired'
        ? { label: 'Hired', tone: 'light' as const }
        : { label: 'Closed', tone: 'neutral' as const };

  const hire = async (workerId: string) => {
    setBusy(true);
    setError(null);
    try {
      const booking = await hireForRequest(request.id, workerId);
      setPendingHire(null);
      nav.replace('BookingDetail', { bookingId: booking.id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    setError(null);
    try {
      await closeRequest(request.id);
      setConfirmClose(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={
        <ScreenHeader
          title="Your need"
          onBack={goBack}
          right={<Pill label={statusPill.label} tone={statusPill.tone} />}
        />
      }
    >
      <View style={styles.titleRow}>
        <AppText variant="h1" style={styles.title}>
          {request.title}
        </AppText>
        <AppText variant="h2" style={[styles.budget, TABULAR]}>
          {formatMoney(request.budget)}
        </AppText>
      </View>

      <View style={styles.pills}>
        <Pill label={category.label} icon={category.icon} size="md" style={styles.pill} />
        <Pill label={request.when} icon="calendar-outline" size="md" style={styles.pill} />
        {request.place ? <Pill label={request.place} icon="location-outline" size="md" /> : null}
      </View>

      <AppText variant="body" color={C.textMuted} style={styles.desc}>
        {request.description}
      </AppText>
      <AppText variant="tiny" color={C.textSubtle} style={styles.posted}>
        {`Posted ${timeAgo(request.postedMinutesAgo)}`}
      </AppText>

      <ErrorBanner message={error} style={styles.block} />

      {request.status === 'hired' ? (
        <Card style={styles.block}>
          <AppText variant="small" color={C.textMuted}>
            You hired
          </AppText>
          <AppText variant="h3" style={styles.hiredName}>
            {hired?.name ?? 'A worker'}
          </AppText>
          {request.bookingId ? (
            <SecondaryButton
              label="View booking"
              trailingIcon="chevron-forward"
              onPress={() => nav.navigate('BookingDetail', { bookingId: request.bookingId as string })}
              style={styles.viewBooking}
            />
          ) : null}
        </Card>
      ) : null}

      {request.status === 'open' ? (
        <>
          <AppText variant="h3" style={styles.section}>
            {`Applicants (${applicants.length})`}
          </AppText>
          {applicants.length === 0 ? (
            <View style={styles.waiting}>
              <Ionicons name="hourglass-outline" size={20} color={C.textMuted} />
              <AppText variant="body" color={C.textMuted} style={styles.waitingText}>
                No one has applied yet. Offers from nearby workers will show up here.
              </AppText>
            </View>
          ) : (
            applicants.map((worker, i) => (
              <View key={worker.id} style={i > 0 ? styles.gap : undefined}>
                <WorkerCard
                  worker={worker}
                  onPress={() => nav.navigate('WorkerProfile', { workerId: worker.id })}
                  onHire={() => setPendingHire(worker.id)}
                />
                {pendingHire === worker.id ? (
                  <View style={styles.confirm}>
                    <AppText variant="body">
                      {`Hire ${worker.name.split(' ')[0]} for ${formatMoney(request.budget)}? This closes the need to other applicants.`}
                    </AppText>
                    <View style={styles.confirmRow}>
                      <SecondaryButton
                        label="Not yet"
                        onPress={() => setPendingHire(null)}
                        disabled={busy}
                        style={styles.flexBtn}
                      />
                      <Pressable
                        onPress={() => void hire(worker.id)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Confirm hiring ${worker.name}`}
                        style={({ pressed }) => [styles.whiteBtn, pressed && styles.pressed]}
                      >
                        <AppText variant="bodyBold" color={C.onLight}>
                          {busy ? 'Hiring…' : 'Hire'}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {confirmClose ? (
            <View style={[styles.confirm, styles.block]}>
              <AppText variant="body">Close this need? Workers won't be able to apply anymore.</AppText>
              <View style={styles.confirmRow}>
                <SecondaryButton
                  label="Keep open"
                  onPress={() => setConfirmClose(false)}
                  disabled={busy}
                  style={styles.flexBtn}
                />
                <Pressable
                  onPress={() => void close()}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Yes, close need"
                  style={({ pressed }) => [styles.whiteBtn, styles.danger, pressed && styles.pressed]}
                >
                  <AppText variant="bodyBold" color={C.onLight}>
                    {busy ? 'Closing…' : 'Close need'}
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setConfirmClose(true)}
              accessibilityRole="button"
              accessibilityLabel="Close this need"
              style={({ pressed }) => [styles.textBtn, pressed && styles.pressed]}
            >
              <AppText variant="bodyBold" color={C.danger}>
                Close this need
              </AppText>
            </Pressable>
          )}
        </>
      ) : null}

      <SafetyNote compact style={styles.block} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.sm,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  budget: {
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
  desc: {
    marginTop: S.sm,
  },
  posted: {
    marginTop: S.sm,
  },
  section: {
    marginTop: S.xl,
    marginBottom: S.base,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.base,
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
  waitingText: {
    flex: 1,
    marginLeft: S.md,
  },
  gap: {
    marginTop: 18,
  },
  block: {
    marginTop: S.lg,
  },
  hiredName: {
    marginTop: S.xs,
  },
  viewBooking: {
    marginTop: S.md,
  },
  confirm: {
    marginTop: S.md,
    padding: S.base,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  flexBtn: {
    flex: 1,
    marginRight: S.sm,
  },
  whiteBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.md,
    borderRadius: R.full,
    backgroundColor: C.text,
  },
  danger: {
    backgroundColor: C.danger,
  },
  textBtn: {
    alignItems: 'center',
    paddingVertical: S.md,
    marginTop: S.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
