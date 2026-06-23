import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, Booking } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getMyBookingsAsProvider } from '../../api/bookings';
import { Avatar } from '../../components/Avatar';
import { formatCurrency, getBookingStatusLabel, getStatusColor, timeAgo } from '../../utils/helpers';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;
type FilterType = 'all' | 'pending' | 'active' | 'completed';

export function MyOffersScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'active') return ['accepted', 'in_progress'].includes(b.status);
    if (filter === 'completed') return ['completed', 'cancelled', 'rejected'].includes(b.status);
    return true;
  });

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Offers</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{bookings.length} total</Text>
        </View>
      </View>

      {/* Earnings Summary */}
      <View style={styles.earningsCard}>
        <View style={styles.earningItem}>
          <Text style={styles.earningValue}>
            {formatCurrency(bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + (b.price ?? 0), 0))}
          </Text>
          <Text style={styles.earningLabel}>Total Earned</Text>
        </View>
        <View style={styles.earningDivider} />
        <View style={styles.earningItem}>
          <Text style={styles.earningValue}>
            {bookings.filter((b) => b.status === 'completed').length}
          </Text>
          <Text style={styles.earningLabel}>Completed</Text>
        </View>
        <View style={styles.earningDivider} />
        <View style={styles.earningItem}>
          <Text style={styles.earningValue}>
            {bookings.filter((b) => b.status === 'pending').length}
          </Text>
          <Text style={styles.earningLabel}>Awaiting</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filterTabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.filterTab, filter === t.key && styles.filterTabActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.filterTabText, filter === t.key && styles.filterTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.offerCard}
              onPress={() => navigation.navigate('Booking', { bookingId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.offerTop}>
                <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>
                    {getBookingStatusLabel(item.status)}
                  </Text>
                </View>
                <Text style={styles.offerTime}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.offerTitle} numberOfLines={1}>{item.request?.title ?? 'Booking'}</Text>
              {item.request?.category && (
                <Text style={styles.offerCategory}>{item.request.category.name}</Text>
              )}
              <View style={styles.offerBottom}>
                {item.client && (
                  <View style={styles.clientRow}>
                    <Avatar uri={item.client.avatar_url} name={item.client.full_name} size={24} />
                    <Text style={styles.clientName}>{item.client.full_name}</Text>
                  </View>
                )}
                {item.price && (
                  <Text style={styles.offerPrice}>{formatCurrency(item.price)}</Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={48} color={Colors.muted} />
              <Text style={styles.emptyTitle}>No offers yet</Text>
              <Text style={styles.emptySubText}>Browse nearby requests and send your first offer</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  totalBadge: { backgroundColor: Colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  totalText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  earningsCard: { flexDirection: 'row', backgroundColor: Colors.primary, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  earningItem: { flex: 1, alignItems: 'center', gap: 4 },
  earningValue: { fontSize: 20, fontWeight: '900', color: '#fff' },
  earningLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  earningDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  offerCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  offerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  offerTime: { fontSize: 12, color: Colors.muted },
  offerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  offerCategory: { fontSize: 13, color: Colors.muted },
  offerBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  offerPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubText: { fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
