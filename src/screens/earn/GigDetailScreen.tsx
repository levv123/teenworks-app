/**
 * Gig Detail — spec 6, "Gig Detail".
 *
 * Hero photo, headline price, pills, meta rows, description and duties, with a
 * sticky Apply / save bar. A gig id that no longer resolves renders an empty
 * state instead of throwing.
 *
 * Apply waits for the store to confirm the application before the button reads
 * Applied; a refusal or a failed request shows above the bar instead.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { IoniconName } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp, useApplication, useIsSaved } from '../../store/AppStore';
import { useSession } from '../../store/SessionStore';
import {
  AppText,
  EmptyState,
  IconButton,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  Stars,
} from '../../ui';
import { APPLICATION_STATUS_LABEL, GigThumb } from '../../features/gigs';
import {
  formatDistance,
  formatRate,
  formatRating,
  timeAgo,
} from '../../utils/format';

export function GigDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'GigDetail'>>();
  const { gigs, applyToGig, refreshApplications, toggleSave } = useApp();

  const gig = gigs.find((candidate) => candidate.id === params.gigId) ?? null;
  const application = useApplication(params.gigId);
  const saved = useIsSaved(params.gigId);

  // Both carry the gig they belong to: a deep link can hand this same screen a
  // different gig, which must not inherit the last one's spinner or message.
  const [applyingFor, setApplyingFor] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<{
    gigId: string;
    message: string;
    signedOut?: boolean;
  } | null>(null);
  const session = useSession();
  // A repeat tap needs no guard here: the store hands back the request already
  // in flight for this gig instead of sending another.
  const apply = useCallback(async () => {
    const gigId = params.gigId;
    setApplyingFor(gigId);
    setApplyError(null);
    const result = await applyToGig(gigId);
    setApplyingFor((current) => (current === gigId ? null : current));
    if (result.status === 'failed') {
      setApplyError({ gigId, message: result.message, signedOut: result.signedOut });
    }
  }, [applyToGig, params.gigId]);

  // A recorded application may have been accepted or declined since.
  const hasApplication = application !== null;
  useFocusEffect(
    useCallback(() => {
      if (hasApplication) void refreshApplications();
    }, [hasApplication, refreshApplications]),
  );

  const goBack = useCallback(() => nav.goBack(), [nav]);
  const header = <ScreenHeader title="Gig Detail" onBack={goBack} />;

  if (gig === null) {
    return (
      <Screen header={header}>
        <EmptyState
          icon="alert-circle-outline"
          title="Gig not found"
          message="This gig is no longer listed. It may have been filled or taken down."
          actionLabel="Go back"
          onAction={goBack}
        />
      </Screen>
    );
  }

  const category = CATEGORY_BY_ID[gig.category];
  const scheduleLabel = gig.scheduleType === 'recurring' ? 'Recurring' : 'One-time';
  // The seed tags already carry the schedule word on some gigs; the dedicated
  // schedule pill is the canonical one, so drop the duplicate tag.
  const tags = gig.tags.filter(
    (tag) => tag.toLowerCase() !== scheduleLabel.toLowerCase(),
  );

  const shownError = applyError?.gigId === gig.id ? applyError : null;
  // Signing in fixes this one, so the button offers it instead of a message.
  const needsSignIn = shownError?.signedOut === true && session.status !== 'signed-in';
  // Once signed in, that old "Sign in to apply" message no longer applies either.
  const errorMessage = shownError === null || shownError.signedOut ? null : shownError.message;

  const metaRows: { icon: IoniconName; text: string }[] = [
    {
      icon: 'location-outline',
      text: `${gig.place} • ${formatDistance(gig.distanceMi)}`,
    },
    {
      icon: 'time-outline',
      text: `Posted ${timeAgo(gig.postedMinutesAgo)}`,
    },
    {
      icon: 'cash-outline',
      text:
        gig.rateType === 'hourly'
          ? `${formatRate(gig.price, gig.rateType)} • Hourly rate`
          : `${formatRate(gig.price, gig.rateType)} • Fixed price`,
    },
  ];

  return (
    <Screen
      header={header}
      footer={
        <>
          {errorMessage ? (
            <AppText
              variant="small"
              // A sample gig can't take applications: a known limit, not a failure.
              color={gig.remote === undefined ? C.textMuted : C.danger}
              accessibilityLiveRegion="polite"
              style={styles.footerNote}
            >
              {errorMessage}
            </AppText>
          ) : null}
          <View style={styles.footer}>
            <IconButton
              icon={saved ? 'bookmark' : 'bookmark-outline'}
              variant="surface"
              color={saved ? C.text : C.textMuted}
              onPress={() => toggleSave(gig.id)}
              accessibilityLabel={saved ? `Unsave ${gig.title}` : `Save ${gig.title}`}
            />
            <View style={styles.applyWrap}>
              <PrimaryButton
                label={
                  application
                    ? APPLICATION_STATUS_LABEL[application.status]
                    : needsSignIn
                      ? 'Sign in to apply'
                      : 'Apply'
                }
                onPress={needsSignIn ? () => nav.navigate('SignIn') : () => void apply()}
                disabled={application !== null}
                loading={applyingFor === gig.id}
              />
            </View>
          </View>
        </>
      }
    >
      <GigThumb gig={gig} size={200} radius={R.xl} style={styles.hero} />

      <View style={styles.titleRow}>
        <AppText variant="h1" style={styles.title}>
          {gig.title}
        </AppText>
        <AppText variant="h1" style={[styles.price, TABULAR]}>
          {formatRate(gig.price, gig.rateType)}
        </AppText>
      </View>

      <View style={styles.pills}>
        <Pill
          label={category.label}
          icon={category.icon}
          style={styles.pill}
        />
        {tags.map((tag) => (
          <Pill key={tag} label={tag} style={styles.pill} />
        ))}
        <Pill
          label={scheduleLabel}
          icon={gig.scheduleType === 'recurring' ? 'repeat' : 'flash-outline'}
          style={styles.pill}
        />
      </View>

      <View style={styles.meta}>
        {metaRows.map((row) => (
          <View key={row.icon} style={styles.metaRow}>
            <Ionicons name={row.icon} size={16} color={C.textMuted} />
            <AppText
              variant="small"
              color={C.textMuted}
              numberOfLines={1}
              style={styles.metaText}
            >
              {row.text}
            </AppText>
          </View>
        ))}

        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={16} color={C.textMuted} />
          <View style={styles.poster}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {gig.poster.name}
            </AppText>
            <View style={styles.posterMeta}>
              <Stars rating={gig.poster.rating} size={12} />
              <AppText
                variant="tiny"
                color={C.textMuted}
                numberOfLines={1}
                style={styles.posterText}
              >
                {`${formatRating(gig.poster.rating)} • ${gig.poster.jobsPosted} jobs posted`}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <AppText variant="body" color={C.textMuted} style={styles.description}>
        {gig.description}
      </AppText>

      {gig.duties.length > 0 ? (
        <View style={styles.duties}>
          <AppText variant="h3">What you&apos;ll do</AppText>
          {gig.duties.map((duty) => (
            <View key={duty} style={styles.duty}>
              <View style={styles.bullet} />
              <AppText variant="body" style={styles.dutyText}>
                {duty}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
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
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
    // Cancels the per-pill bottom margin so the block hugs the row above.
    marginBottom: -S.sm,
  },
  pill: {
    marginRight: S.sm - 2,
    marginBottom: S.sm,
  },
  meta: {
    marginTop: S.xl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.md,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  poster: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  posterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  posterText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm - 2,
  },
  description: {
    marginTop: S.sm,
  },
  duties: {
    marginTop: S.xl,
  },
  duty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.md,
  },
  bullet: {
    width: S.xs,
    height: S.xs,
    borderRadius: R.full,
    backgroundColor: C.textMuted,
    // Drops the dot onto the first line's optical centre.
    marginTop: S.sm,
    marginRight: S.md,
  },
  dutyText: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerNote: {
    marginBottom: S.md,
    textAlign: 'center',
  },
  applyWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
});
