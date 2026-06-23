import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { ReviewCard } from '../../components/ReviewCard';
import { RatingSummary } from '../../components/RatingSummary';
import { formatCurrency } from '../../utils/helpers';
import { toggleProviderAvailability } from '../../api/providers';
import { getProviderReviewsForUser } from '../../api/reviews';
import { Review } from '../../types';
import { computeTrustBreakdown } from '../../utils/trust';
import { TrustScoreCard } from '../../components/TrustScoreCard';
import { TrustLevelBadge } from '../../components/TrustLevelBadge';
import { TrustLevelCard } from '../../components/TrustLevelCard';
import { VerificationBadges } from '../../components/VerificationBadges';
import { TrustHistoryFeed } from '../../components/TrustHistoryFeed';
import { getTrustHistory } from '../../api/trust';
import { TrustHistoryEvent } from '../../types';

type SettingRowProps = {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
};

function SettingRow({ icon, label, value, onPress, rightElement, danger }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons name={icon as any} size={18} color={danger ? Colors.error : Colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {rightElement ?? (onPress && <Ionicons name="chevron-forward" size={16} color={Colors.muted} />)}
    </TouchableOpacity>
  );
}

const REVIEWS_PREVIEW = 3;

export function ProfileScreen() {
  const { user, logout, refreshUser, isProvider } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const profile = user?.profile;
  const pp = user?.providerProfile;
  const [toggling, setToggling] = useState(false);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [trustHistory, setTrustHistory] = useState<TrustHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (isProvider && user?.id) {
      getProviderReviewsForUser(user.id).then(setMyReviews).catch(console.error);
      setHistoryLoading(true);
      getTrustHistory(user.id)
        .then(setTrustHistory)
        .catch(console.error)
        .finally(() => setHistoryLoading(false));
    }
  }, [isProvider, user?.id]);

  const handleToggleAvailability = async () => {
    if (!user?.id || !pp) return;
    setToggling(true);
    try {
      await toggleProviderAvailability(user.id, !pp.is_available);
      await refreshUser();
    } finally {
      setToggling(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name ?? ''} size={72} showOnlineIndicator isOnline={pp?.is_available} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name ?? 'User'}</Text>
            {user?.email && <Text style={styles.profileEmail}>{user.email}</Text>}
            <View style={styles.roleBadge}>
              <Ionicons name={isProvider ? 'briefcase' : 'person'} size={12} color={Colors.primary} />
              <Text style={styles.roleText}>{isProvider ? 'Service Provider' : 'Client'}</Text>
            </View>
            {isProvider && pp && (
              <TrustLevelBadge score={pp.trust_score ?? 0} size="xs" />
            )}
          </View>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Ionicons name="pencil" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Provider Stats */}
        {isProvider && pp && (
          <View style={styles.providerStats}>
            <View style={styles.providerStatItem}>
              <Text style={styles.providerStatValue}>{(pp.rating ?? 0).toFixed(1)}</Text>
              <StarRating rating={pp.rating ?? 0} size={12} />
              <Text style={styles.providerStatLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.providerStatItem}>
              <Text style={styles.providerStatValue}>{pp.review_count}</Text>
              <Text style={styles.providerStatLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.providerStatItem}>
              <Text style={styles.providerStatValue}>{pp.hourly_rate ? formatCurrency(pp.hourly_rate) : 'N/A'}</Text>
              <Text style={styles.providerStatLabel}>Rate/hr</Text>
            </View>
          </View>
        )}

        {/* Provider Trust Level + Verification + Score + History */}
        {isProvider && user?.profile && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Level</Text>
              <TrustLevelCard score={pp?.trust_score ?? 0} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Verification</Text>
              <VerificationBadges profile={user.profile} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Trust Score</Text>
              <TrustScoreCard breakdown={computeTrustBreakdown(user.profile as any, pp ?? null, myReviews)} />
              {/* Trust Center CTA */}
              <TouchableOpacity
                style={styles.trustCenterCta}
                onPress={() => navigation.navigate('TrustCenter')}
                activeOpacity={0.85}
              >
                <View style={styles.trustCenterLeft}>
                  <View style={styles.trustCenterIconWrap}>
                    <Ionicons name="analytics" size={20} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.trustCenterTitle}>Open Trust Center</Text>
                    <Text style={styles.trustCenterSub}>See how to improve your score</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Reputation History</Text>
                {trustHistory.length > 0 && (
                  <View style={styles.historyCntBadge}>
                    <Text style={styles.historyCntText}>{trustHistory.length}</Text>
                  </View>
                )}
              </View>
              <TrustHistoryFeed events={trustHistory} loading={historyLoading} />
            </View>
          </>
        )}

        {/* Provider Reviews */}
        {isProvider && pp && myReviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Reviews</Text>
            <RatingSummary
              rating={pp.rating ?? 0}
              reviewCount={pp.review_count ?? 0}
              reviews={myReviews}
            />
            <View style={styles.reviewsList}>
              {(showAllReviews ? myReviews : myReviews.slice(0, REVIEWS_PREVIEW)).map((rev) => (
                <ReviewCard key={rev.id} review={rev} />
              ))}
            </View>
            {myReviews.length > REVIEWS_PREVIEW && (
              <TouchableOpacity
                style={styles.toggleReviewsBtn}
                onPress={() => setShowAllReviews((v) => !v)}
              >
                <Text style={styles.toggleReviewsText}>
                  {showAllReviews
                    ? 'Show fewer'
                    : `See all ${myReviews.length} reviews`}
                </Text>
                <Ionicons
                  name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Provider Settings */}
        {isProvider && pp && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Provider Settings</Text>
            <View style={styles.settingGroup}>
              <SettingRow
                icon="toggle"
                label="Available for work"
                rightElement={
                  <Switch
                    value={pp.is_available}
                    onValueChange={handleToggleAvailability}
                    trackColor={{ false: Colors.border, true: Colors.success + '80' }}
                    thumbColor={pp.is_available ? Colors.success : Colors.muted}
                    disabled={toggling}
                  />
                }
              />
              <SettingRow icon="cash-outline" label="Hourly rate" value={pp.hourly_rate ? `${formatCurrency(pp.hourly_rate)}/hr` : 'Not set'} onPress={() => {}} />
              <SettingRow icon="location-outline" label="Service radius" value={`${pp.radius_km ?? 10} km`} onPress={() => {}} />
              <SettingRow icon="hammer-outline" label="Skills & services" value={pp.skills?.slice(0, 2).join(', ') || 'None set'} onPress={() => {}} />
            </View>
          </View>
        )}

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingGroup}>
            <SettingRow icon="person-outline" label="Edit profile" onPress={() => {}} />
            <SettingRow icon="call-outline" label="Phone number" value={profile?.phone ?? 'Not set'} onPress={() => {}} />
            <SettingRow icon="location-outline" label="My location" onPress={() => {}} />
            <SettingRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.settingGroup}>
            <SettingRow icon="shield-checkmark-outline" label="Privacy & Security" onPress={() => {}} />
            <SettingRow icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
            <SettingRow icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
            <SettingRow icon="star-outline" label="Rate the app" onPress={() => {}} />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <View style={styles.settingGroup}>
            <SettingRow icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
          </View>
        </View>

        <Text style={styles.version}>LastMinute v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md, letterSpacing: -0.3 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.card, marginHorizontal: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadow.sm },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  profileEmail: { fontSize: 13, color: Colors.muted },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  roleText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  editProfileBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  providerStats: { flexDirection: 'row', backgroundColor: Colors.card, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadow.sm },
  providerStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  providerStatValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  providerStatLabel: { fontSize: 11, color: Colors.muted },
  statDivider: { width: 1, backgroundColor: Colors.border },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  historyCntBadge: { backgroundColor: Colors.primary, borderRadius: Radius.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  historyCntText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  trustCenterCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight, borderRadius: Radius.lg,
    padding: Spacing.md, marginTop: 10,
    borderWidth: 1.5, borderColor: Colors.primary + '33',
  },
  trustCenterLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustCenterIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  trustCenterTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  trustCenterSub: { fontSize: 12, color: Colors.primary + 'AA', marginTop: 1 },
  settingGroup: { backgroundColor: Colors.card, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingIconDanger: { backgroundColor: Colors.errorLight },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  settingLabelDanger: { color: Colors.error },
  settingValue: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 12, color: Colors.muted, marginTop: Spacing.md },
  reviewsList: { gap: 10 },
  toggleReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  toggleReviewsText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
