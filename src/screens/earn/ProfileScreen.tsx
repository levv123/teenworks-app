/**
 * Profile (spec 6) — who the user is on TeenWorks: identity, trust score,
 * verification badges, headline stats and the links out to everything they own,
 * ending with the switch over to the hiring side.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import type { IoniconName } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import {
  AppText,
  Avatar,
  Card,
  Divider,
  ProgressBar,
  Pill,
  Screen,
  ScreenHeader,
  SecondaryButton,
} from '../../ui';
import { formatDate, formatDuration, formatRating } from '../../utils/format';

const AVATAR = 72;
const TRUST_MAX = 100;

interface LinkRow {
  label: string;
  icon: IoniconName;
  count?: number;
  onPress: () => void;
  /** Separates the account links from the mode switch. */
  dividerBefore?: boolean;
}

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { user, pastJobs, savedIds, applications, setMode, showToast } = useApp();

  // The profile rating is the average of what clients actually paid for, so it
  // stays put while the Analytics range changes.
  const avgRating = useMemo<number | null>(() => {
    const rated = pastJobs.filter((job) => Number.isFinite(job.rating));
    if (rated.length === 0) return null;
    return rated.reduce((sum, job) => sum + job.rating, 0) / rated.length;
  }, [pastJobs]);

  const switchToHiring = useCallback(() => {
    setMode('hire');
    nav.navigate('HireHome');
    showToast('Switched to hiring');
  }, [nav, setMode, showToast]);

  const score = Number.isFinite(user.trustScore) ? Math.round(user.trustScore) : 0;

  const stats: { icon: IoniconName; value: string; label: string }[] = [
    {
      icon: 'briefcase-outline',
      value: String(pastJobs.length),
      label: 'Jobs Completed',
    },
    {
      icon: 'star-outline',
      value: avgRating === null ? '—' : formatRating(avgRating),
      label: 'Avg. Rating',
    },
    {
      icon: 'time-outline',
      value: formatDuration(user.responseMins),
      label: 'Avg. Response',
    },
  ];

  const links: LinkRow[] = [
    {
      label: 'My Services',
      icon: 'pricetags-outline',
      onPress: () => nav.navigate('MyServices'),
    },
    {
      label: 'Past Jobs',
      icon: 'checkmark-done-outline',
      onPress: () => nav.navigate('PastJobs'),
    },
    {
      label: 'Saved Gigs',
      icon: 'bookmark-outline',
      count: savedIds.length,
      onPress: () => nav.navigate('SavedGigs'),
    },
    {
      label: 'Applications',
      icon: 'document-text-outline',
      count: applications.length,
      onPress: () => nav.navigate('Applications'),
    },
    {
      label: 'Switch to Hiring',
      icon: 'swap-horizontal',
      onPress: switchToHiring,
      dividerBefore: true,
    },
  ];

  return (
    <Screen header={<ScreenHeader title="Profile" onBack={() => nav.goBack()} />}>
      <View style={styles.identity}>
        <Avatar name={user.name} uri={user.avatarUrl} size={AVATAR} />
        <View style={styles.identityText}>
          <AppText variant="h1" numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText variant="small" color={C.textMuted} numberOfLines={1}>
            {`@${user.handle}`}
          </AppText>
          <View style={styles.placeRow}>
            <Ionicons name="location-outline" size={13} color={C.textMuted} />
            <AppText
              variant="small"
              color={C.textMuted}
              numberOfLines={1}
              style={styles.placeText}
            >
              {user.place}
            </AppText>
          </View>
        </View>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <AppText variant="small" color={C.textMuted}>
            Trust Score
          </AppText>
          <Pill label={user.trustLevel} tone="success" />
        </View>

        <View style={styles.scoreRow}>
          <AppText variant="display" style={TABULAR}>
            {String(score)}
          </AppText>
          <AppText variant="small" color={C.textMuted} style={styles.scoreMax}>
            {`/ ${TRUST_MAX}`}
          </AppText>
        </View>

        <ProgressBar value={score / TRUST_MAX} style={styles.meter} />

        <AppText variant="tiny" color={C.textMuted} style={styles.hint}>
          Finish your verifications, reply quickly and keep five-star jobs coming to
          raise it.
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="small" color={C.textMuted}>
          Verifications
        </AppText>

        {user.verifications.map((verification, index) => (
          <View
            key={verification.label}
            style={[styles.verifyRow, index > 0 && styles.verifyGap]}
          >
            <Ionicons name={verification.icon} size={18} color={C.text} />
            <AppText variant="body" numberOfLines={1} style={styles.verifyLabel}>
              {verification.label}
            </AppText>
            {verification.done ? (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={C.success}
                accessibilityRole="image"
                accessibilityLabel={`${verification.label} verified`}
              />
            ) : (
              <>
                <Ionicons
                  name="ellipse-outline"
                  size={20}
                  color={C.textSubtle}
                  accessibilityRole="image"
                  accessibilityLabel={`${verification.label} not verified`}
                />
                <SecondaryButton
                  label="Verify"
                  size="sm"
                  onPress={() =>
                    showToast(`${verification.label} verification coming soon`)
                  }
                  style={styles.verifyAction}
                />
              </>
            )}
          </View>
        ))}
      </Card>

      <View style={styles.stats}>
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

      <Card padding={0} style={styles.card}>
        {links.map((link) => (
          <React.Fragment key={link.label}>
            {link.dividerBefore ? <Divider inset={S.base} /> : null}
            <Pressable
              onPress={link.onPress}
              accessibilityRole="button"
              accessibilityLabel={
                link.count === undefined
                  ? link.label
                  : `${link.label}, ${link.count}`
              }
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Ionicons name={link.icon} size={18} color={C.text} />
              <AppText variant="body" numberOfLines={1} style={styles.linkLabel}>
                {link.label}
              </AppText>
              {link.count === undefined ? null : (
                <AppText
                  variant="small"
                  color={C.textMuted}
                  style={[TABULAR, styles.linkCount]}
                >
                  {String(link.count)}
                </AppText>
              )}
              <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
            </Pressable>
          </React.Fragment>
        ))}
      </Card>

      <AppText variant="small" color={C.textMuted} style={styles.member}>
        {`Member since ${formatDate(user.memberSince)}`}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.base,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs,
  },
  placeText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.xs,
  },
  card: {
    marginTop: S.xl,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: S.sm,
  },
  scoreMax: {
    marginLeft: S.sm - 2,
  },
  meter: {
    marginTop: S.md,
  },
  hint: {
    marginTop: S.md,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  verifyGap: {
    marginTop: S.base,
  },
  verifyLabel: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  verifyAction: {
    marginLeft: S.sm,
  },
  stats: {
    flexDirection: 'row',
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
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  statLabel: {
    marginTop: S.sm - 2,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.base - 2,
    paddingHorizontal: S.base,
  },
  linkLabel: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  linkCount: {
    marginRight: S.sm,
  },
  member: {
    marginTop: S.xl,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
