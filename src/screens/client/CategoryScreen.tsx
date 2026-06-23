import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, ProviderWithProfile, ServiceRequest } from '../../types';
import { Colors, Spacing, Radius } from '../../utils/colors';
import { getProvidersByCategory } from '../../api/providers';
import { getRequestsByCategory } from '../../api/requests';
import { ProviderCard } from '../../components/ProviderCard';
import { RequestCard } from '../../components/RequestCard';
import { EmptyState } from '../../components/EmptyState';

type Props = NativeStackScreenProps<HomeStackParamList, 'Category'>;

type Tab = 'providers' | 'requests';

export function CategoryScreen({ route, navigation }: Props) {
  const { categoryId, categoryName } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('providers');
  const [providers, setProviders] = useState<ProviderWithProfile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'rating' | 'rate' | 'distance'>('rating');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [provs, reqs] = await Promise.all([
          getProvidersByCategory(categoryId),
          getRequestsByCategory(categoryId),
        ]);
        setProviders(provs);
        setRequests(reqs);
      } catch (err) {
        console.error('Category load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId]);

  const sortedProviders = [...providers].sort((a, b) => {
    if (sortBy === 'rating') return (b.provider_profile?.rating ?? 0) - (a.provider_profile?.rating ?? 0);
    if (sortBy === 'rate') return (a.provider_profile?.hourly_rate ?? 999) - (b.provider_profile?.hourly_rate ?? 999);
    return (a.distance_km ?? 999) - (b.distance_km ?? 999);
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryName}</Text>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Ionicons name="options-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['providers', 'requests'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'providers' ? `Providers (${providers.length})` : `Requests (${requests.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort bar (providers only) */}
      {activeTab === 'providers' && (
        <View style={styles.sortBar}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {(['rating', 'rate', 'distance'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>
                {s === 'rating' ? '⭐ Rating' : s === 'rate' ? '💰 Price' : '📍 Distance'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : activeTab === 'providers' ? (
        <FlatList
          data={sortedProviders}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => navigation.navigate('ProviderProfile', { providerId: item.user_id })}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="person-outline"
              title="No providers yet"
              message="Be the first to offer services in this category"
            />
          }
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No open requests"
              message="Post a request to get help with this service"
              ctaLabel="Post Request"
              onCta={() => navigation.navigate('PostRequest', { categoryId })}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('PostRequest', { categoryId })}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text },
  filterIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.border + '60',
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: Radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.muted },
  tabTextActive: { color: Colors.text, fontWeight: '700' },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: 12,
    gap: 8,
  },
  sortLabel: { fontSize: 13, color: Colors.muted },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  sortChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  sortChipText: { fontSize: 12, color: Colors.muted, fontWeight: '500' },
  sortChipTextActive: { color: Colors.primary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
