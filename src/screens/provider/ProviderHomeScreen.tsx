import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, Booking } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getMyBookingsAsProvider } from '../../api/bookings';
import { toggleProviderAvailability } from '../../api/providers';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { formatCurrency, getBookingStatusLabel, getStatusColor, timeAgo } from '../../utils/helpers';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function ProviderHomeScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const pp = user?.providerProfile;
  const profile = user?.profile;
  const isAvailable = pp?.is_available ?? false;

  const fetchBookings = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getMyBookingsAsProvider(user.id);
      setBookings(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  const handleToggleAvailability = async () => {
    if (!user?.id) return;
    setToggling(true);
    try {
      await toggleProviderAvailability(user.id, !isAvailable);
      await refreshUser();
    } finally {
      setToggling(false);
    }
  };

  const activeBookings = bookings.filter((b) => ['accepted', 'in_progress'].includes(b.status));
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const todayEarnings = bookings
    .filter((b) => b.status === 'completed' && new Date(b.updated_at).toDateString() === new Date().toDateString())
    .reduce((sum, b) => sum + (b.price ?? 0), 0);
  const totalEarnings = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.price ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name ?? ''} size={48} showOnlineIndicator isOnline={isAvailable} />
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.name}>{profile?.full_name?.split(' ')[0] ?? 'Provider'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Availability Toggle */}
        <View style={[styles.availCard, isAvailable ? styles.availCardOn : styles.availCardOff]}>
          <View style={styles.availInfo}>
            <View style={[styles.availDot, { backgroundColor: isAvailable ? Colors.success : Colors.muted }]} />
            <View>
              <Text style={styles.availTitle}>{isAvailable ? 'You are Available' : 'You are Unavailable'}</Text>
              <Text style={styles.availSub}>
                {isAvailable ? 'Clients can see and book you' : 'You won\'t receive new requests'}
              </Text>
            </View>
          </View>
          {toggling ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: Colors.border, true: Colors.success + '80' }}
              thumbColor={isAvailable ? Colors.success : Colors.muted}
            />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="briefcase" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{activeBookings.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={20} color={Colors.warning} />
            <Text style={styles.statValue}>{pendingBookings.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={20} color={Colors.success} />
            <Text style={styles.statValue}>{formatCurrency(todayEarnings)}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="wallet" size={20} color={Colors.secondary} />
            <Text style={styles.statValue}>{formatCurrency(totalEarnings)}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Rating summary */}
        {pp && (
          <View style={styles.ratingCard}>
            <View>
              <Text style={styles.ratingBig}>{(pp.rating ?? 0).toFixed(1)}</Text>
              <StarRating rating={pp.rating ?? 0} size={16} />
              <Text style={styles.ratingCount}>{pp.review_count} reviews</Text>
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingDetails}>
              <Text style={styles.ratingDetailsTitle}>Your Profile</Text>
              <Text style={styles.ratingDetailRow}>
                <Text style={styles.ratingDetailLabel}>Rate: </Text>
                {pp.hourly_rate ? `${formatCurrency(pp.hourly_rate)}/hr` : 'Not set'}
              </Text>
              <Text style={styles.ratingDetailRow}>
                <Text style={styles.ratingDetailLabel}>Radius: </Text>
                {pp.radius_km ?? 10} km
              </Text>
              <Text style={styles.ratingDetailRow}>
                <Text style={styles.ratingDetailLabel}>Skills: </Text>
                {pp.skills?.join(', ') || 'None set'}
              </Text>
            </View>
          </View>
        )}

        {/* Active Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Bookings</Text>
            {activeBookings.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeBookings.length}</Text>
              </View>
            )}
          </View>
          {loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : activeBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={28} color={Colors.muted} />
              <Text style={styles.emptyText}>No active bookings</Text>
              <Text style={styles.emptySubText}>Browse nearby requests to get started</Text>
            </View>
          ) : (
            activeBookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingCard}
                onPress={() => navigation.navigate('Booking', { bookingId: b.id })}
                activeOpacity={0.85}
              >
                <View style={styles.bookingTop}>
                  <View style={[styles.statusPill, { backgroundColor: getStatusColor(b.status) + '20' }]}>
                    <Text style={[styles.statusPillText, { color: getStatusColor(b.status) }]}>
                      {getBookingStatusLabel(b.status)}
                    </Text>
                  </View>
                  <Text style={styles.bookingTime}>{timeAgo(b.created_at)}</Text>
                </View>
                <Text style={styles.bookingTitle} numberOfLines={1}>{b.request?.title ?? 'Booking'}</Text>
                <View style={styles.bookingMeta}>
                  {b.price && <Text style={styles.bookingPrice}>{formatCurrency(b.price)}</Text>}
                  <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.md, marginBottom: Spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 13, color: Colors.muted },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text },
  notifBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  availCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1 },
  availCardOn: { backgroundColor: Colors.successLight, borderColor: Colors.success + '40' },
  availCardOff: { backgroundColor: Colors.card, borderColor: Colors.border },
  availInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  availDot: { width: 10, height: 10, borderRadius: 5 },
  availTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  availSub: { fontSize: 12, color: Colors.muted },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  statValue: { fontSize: 14, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.muted },
  ratingCard: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, gap: Spacing.md, ...Shadow.sm },
  ratingBig: { fontSize: 36, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  ratingCount: { fontSize: 12, color: Colors.muted, marginTop: 4 },
  ratingDivider: { width: 1, backgroundColor: Colors.border },
  ratingDetails: { flex: 1, gap: 6, justifyContent: 'center' },
  ratingDetailsTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  ratingDetailRow: { fontSize: 13, color: Colors.textSecondary },
  ratingDetailLabel: { fontWeight: '600', color: Colors.text },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  countBadge: { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  countBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
  bookingCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, gap: 8 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  bookingTime: { fontSize: 12, color: Colors.muted },
  bookingTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary },
});
