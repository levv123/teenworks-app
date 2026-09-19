/**
 * Applications (spec 6) — every gig the user applied to, newest first, each with
 * the status the poster gave it. Applications are stored by gig id, so any whose
 * gig has since left the catalogue are counted and skipped rather than rendered
 * as an empty row.
 */
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { GigCard } from '../../features/gigs';

const STATUS: Record<ApplicationStatus, { label: string; tone: PillTone }> = {
  applied: { label: 'Applied', tone: 'neutral' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
};

/** An application that still points at a gig we can render. */
type ResolvedApplication = Application & { gig: Gig };

export function ApplicationsScreen() {
  const nav = useNavigation<Nav>();
  const { withdrawApplication, showToast } = useApp();
  const entries = useApplications();

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
    (gig: Gig) => {
      withdrawApplication(gig.id);
      showToast(`Withdrew from ${gig.title}`);
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
          const status = STATUS[application.status];
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
                    label={status.label}
                    tone={status.tone}
                    style={styles.status}
                  />
                }
              />
              {application.status === 'applied' ? (
                <SecondaryButton
                  label="Withdraw"
                  size="sm"
                  onPress={() => withdraw(application.gig)}
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
