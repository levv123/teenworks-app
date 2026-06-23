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
import { RequestStackParamList, ServiceRequest } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getMyRequests } from '../../api/requests';
import { RequestCard } from '../../components/RequestCard';

type Props = NativeStackScreenProps<RequestStackParamList, 'Requests'>;
type FilterType = 'all' | 'open' | 'active' | 'completed';

export function MyRequestsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getMyRequests(user.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const filtered = requests.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'open') return r.status === 'open';
    if (filter === 'active') return r.status === 'accepted' || r.status === 'in_progress';
    if (filter === 'completed') return r.status === 'completed' || r.status === 'cancelled';
    return true;
  });

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Requests</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('RequestDetail', { requestId: '' })}
        >
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
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
            {t.key !== 'all' && (
              <View style={[styles.filterCount, filter === t.key && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === t.key && styles.filterCountTextActive]}>
                  {requests.filter((r) => {
                    if (t.key === 'open') return r.status === 'open';
                    if (t.key === 'active') return r.status === 'accepted' || r.status === 'in_progress';
                    if (t.key === 'completed') return r.status === 'completed' || r.status === 'cancelled';
                    return false;
                  }).length}
                </Text>
              </View>
            )}
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
            <RequestCard
              request={item}
              onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={Colors.muted} />
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptySubText}>Post your first service request to get started</Text>
              <TouchableOpacity
                style={styles.newBtn}
                onPress={() => navigation.navigate('RequestDetail', { requestId: '' })}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.newBtnText}>Post a Request</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff' },
  filterCount: { backgroundColor: Colors.border, borderRadius: Radius.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  filterCountTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubText: { fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: Radius.lg, marginTop: 4 },
  newBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
