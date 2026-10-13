/**
 * Applications (spec 6) — every gig the user applied to, newest first, each with
 * the status the poster gave it. Applications are stored by gig id, so any whose
 * gig has since left the catalogue are counted and skipped rather than rendered
 * as an empty row. Withdraw cancels the booking behind the application and only
 * drops the row once that is confirmed.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { C, S } from '../../design/tokens';
import type { Application, ApplicationStatus, Gig } from '../../data/types';
import type { PillTone } from '../../ui';
import type { Nav } from '../../navigation/routes';
import { useApp, useApplications } from '../../store/AppStore';
import {
  AppText,
  EmptyState,
  Pill,
  Screen,
  ScreenHeader,
  SecondaryButton,
} from '../../ui';
import { APPLICATION_STATUS_LABEL, GigCard } from '../../features/gigs';

const STATUS_TONE: Record<ApplicationStatus, PillTone> = {
  applied: 'neutral',
  accepted: 'success',
  declined: 'danger',
};

/** An application that still points at a gig we can render. */
type ResolvedApplication = Application & { gig: Gig };

export function ApplicationsScreen() {
  const nav = useNavigation<Nav>();
  const { refreshApplications, withdrawApplication, showToast } = useApp();
  const entries = useApplications();
  // Gig ids whose withdrawal is still waiting on the server.
  const [withdrawing, setWithdrawing] = useState<string[]>([]);

  // Statuses are the poster's to change, so re-read them whenever this opens.
  useFocusEffect(
    useCallback(() => {
      void refreshApplications();
    }, [refreshApplications]),
  );

  const { resolved, missing } = useMemo(() => {
    const rows: ResolvedApplication[] = [];
    let gone = 0;
    for (const entry of entries) {
      if (entry.gig === null) {
        gone += 1;
        continue;
      }
      rows.push({ ...entry, gig: entry.gig });
    }
    return { resolved: rows, missing: gone };
  }, [entries]);

  const withdraw = useCallback(
    async (gig: Gig) => {
      setWithdrawing((ids) => (ids.includes(gig.id) ? ids : [...ids, gig.id]));
      const result = await withdrawApplication(gig.id);
      setWithdrawing((ids) => ids.filter((id) => id !== gig.id));
      showToast(result.status === 'done' ? `Withdrew from ${gig.title}` : result.message);
    },
    [showToast, withdrawApplication],
  );

  return (
    <Screen
      header={<ScreenHeader title="Applications" onBack={() => nav.goBack()} />}
    >
      {resolved.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No applications yet"
          message="Apply to a gig and you can track its status right here."
          actionLabel="Find gigs"
          onAction={() => nav.navigate('Gigs')}
        />
      ) : (
        resolved.map((application, index) => {
          const pending = withdrawing.includes(application.gigId);
          return (
            <View
              key={application.gigId}
              style={index > 0 ? styles.rowGap : undefined}
            >
              <GigCard
                gig={application.gig}
                onPress={() =>
                  nav.navigate('GigDetail', { gigId: application.gigId })
                }
                right={
                  <Pill
                    label={APPLICATION_STATUS_LABEL[application.status]}
                    tone={STATUS_TONE[application.status]}
                    style={styles.status}
                  />
                }
              />
              {application.status === 'applied' ? (
                <SecondaryButton
                  label={pending ? 'Withdrawing…' : 'Withdraw'}
                  size="sm"
                  onPress={() => void withdraw(application.gig)}
                  disabled={pending}
                  style={styles.withdraw}
                />
              ) : null}
            </View>
          );
        })
      )}

      {missing > 0 ? (
        <AppText variant="small" color={C.textMuted} style={styles.missing}>
          {missing === 1
            ? '1 application is for a gig that is no longer listed.'
            : `${missing} applications are for gigs that are no longer listed.`}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** The 18px feed rhythm from spec 3, expressed in tokens. */
  rowGap: {
    marginTop: S.base + 2,
  },
  /** Keeps the pill level with the gig title instead of centred on the row. */
  status: {
    marginLeft: S.md,
  },
  withdraw: {
    alignSelf: 'flex-start',
    marginTop: S.md,
  },
  missing: {
    marginTop: S.xl,
  },
});
