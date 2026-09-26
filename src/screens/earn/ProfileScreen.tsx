/**
 * Profile — one screen for both sides, laid out like the reference: identity
 * row, account links, the card that switches sides, Help & Support and
 * Log Out. Below the switch card the Earn side also keeps the links to the
 * worker screens only reachable from here (My Services, Saved Gigs, Applications).
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import type { IoniconName } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { AppText, Avatar, Screen, ScreenHeader } from '../../ui';
import { otherSide } from '../../features/sides';
import { formatDate } from '../../utils/format';

const AVATAR = 56;

interface LinkRow {
  label: string;
  icon: IoniconName;
  count?: number;
  onPress: () => void;
}

function Row({ link }: { link: LinkRow }) {
  return (
    <Pressable
      onPress={link.onPress}
      accessibilityRole="button"
      accessibilityLabel={
        link.count === undefined ? link.label : `${link.label}, ${link.count}`
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={link.icon} size={20} color={C.text} />
      <AppText variant="body" numberOfLines={1} style={styles.rowLabel}>
        {link.label}
      </AppText>
      {link.count === undefined ? null : (
        <AppText variant="small" color={C.textMuted} style={[TABULAR, styles.rowCount]}>
          {String(link.count)}
        </AppText>
      )}
      <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
    </Pressable>
  );
}

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { user, mode, savedIds, applications, showToast } = useApp();
  const target = otherSide(mode);

  const soon = (what: string) => () => showToast(`${what} coming soon`);

  const account: LinkRow[] = [
    { label: 'Account Settings', icon: 'settings-outline', onPress: soon('Account settings') },
    { label: 'Payment Methods', icon: 'card-outline', onPress: soon('Payment methods') },
    {
      label: 'Past Bookings',
      icon: 'calendar-outline',
      onPress:
        mode === 'hire'
          ? () => nav.navigate('HireTabs', { screen: 'Bookings' })
          : soon('Past bookings'),
    },
    {
      label: 'Reviews',
      icon: 'star-outline',
      // The Earn side already has the reviews a worker received; hire-side
      // reviews wait on the reviews system.
      onPress: mode === 'earn' ? () => nav.navigate('Reviews') : soon('Reviews'),
    },
    { label: 'Saved Services', icon: 'heart-outline', onPress: soon('Saved services') },
  ];

  const earnTools: LinkRow[] = [
    { label: 'My Services', icon: 'pricetags-outline', onPress: () => nav.navigate('MyServices') },
    { label: 'Past Jobs', icon: 'checkmark-done-outline', onPress: () => nav.navigate('PastJobs') },
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
  ];

  const switchCard =
    target === 'hire'
      ? {
          icon: 'people-outline' as IoniconName,
          title: 'Hire Someone',
          body: 'Switch to the hire side and get help from local teens.',
        }
      : {
          icon: 'flash-outline' as IoniconName,
          title: 'Earn Money',
          body: 'Switch to the earn side and start making money.',
        };

  return (
    <Screen header={<ScreenHeader title="Profile" onBack={() => nav.goBack()} />}>
      <Pressable
        onPress={soon('Account settings')}
        accessibilityRole="button"
        accessibilityLabel={`${user.name}, account`}
        style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
      >
        <Avatar name={user.name} uri={user.avatarUrl} size={AVATAR} />
        <View style={styles.identityText}>
          <AppText variant="h3" numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText variant="small" color={C.textMuted} numberOfLines={1}>
            {`@${user.handle}`}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
      </Pressable>

      <View style={styles.group}>
        {account.map((link) => (
          <Row key={link.label} link={link} />
        ))}
      </View>

      <Pressable
        onPress={() => nav.navigate('SwitchSide', { to: target })}
        accessibilityRole="button"
        accessibilityLabel={`${switchCard.title}. ${switchCard.body}`}
        style={({ pressed }) => [styles.switchCard, pressed && styles.pressed]}
      >
        <Ionicons name={switchCard.icon} size={20} color={C.text} />
        <View style={styles.switchText}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {switchCard.title}
          </AppText>
          <AppText variant="small" color={C.textMuted}>
            {switchCard.body}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.text} />
      </Pressable>

      {mode === 'earn' ? (
        <>
          <AppText variant="small" color={C.textMuted} style={styles.groupLabel}>
            Your Work
          </AppText>
          {earnTools.map((link) => (
            <Row key={link.label} link={link} />
          ))}
        </>
      ) : null}

      <View style={styles.group}>
        <Row
          link={{
            label: 'Help & Support',
            icon: 'help-circle-outline',
            onPress: soon('Help & Support'),
          }}
        />
      </View>

      <Pressable
        onPress={() => showToast('Accounts arrive with sign-in')}
        accessibilityRole="button"
        accessibilityLabel="Log Out"
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
      >
        <AppText variant="small" color={C.danger}>
          Log Out
        </AppText>
      </Pressable>

      <AppText variant="tiny" color={C.textSubtle} style={styles.member}>
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
  group: {
    marginTop: S.xl,
  },
  groupLabel: {
    marginTop: S.xl,
    marginBottom: S.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.base - 2,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.base,
  },
  rowCount: {
    marginRight: S.sm,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xl,
    paddingVertical: S.base,
    paddingHorizontal: S.base,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
  },
  switchText: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: S.base,
  },
  logout: {
    alignSelf: 'center',
    marginTop: S.xl,
    paddingVertical: S.sm,
    paddingHorizontal: S.base,
  },
  member: {
    marginTop: S.sm,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
