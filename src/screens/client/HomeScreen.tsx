import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, Category, ServiceRequest, ProviderWithProfile } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { getCategories, getOpenRequests } from '../../api/requests';
import { getNearbyProviders } from '../../api/providers';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { ProviderCard } from '../../components/ProviderCard';
import { RequestCard } from '../../components/RequestCard';
import { getCategoryIcon } from '../../components/CategoryBadge';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Cleaning', icon: 'sparkles', description: null, color: '#6C47FF', created_at: '' },
  { id: 'c2', name: 'Plumbing', icon: 'water', description: null, color: '#3B82F6', created_at: '' },
  { id: 'c3', name: 'Electrical', icon: 'flash', description: null, color: '#F59E0B', created_at: '' },
  { id: 'c4', name: 'Moving', icon: 'cube', description: null, color: '#10B981', created_at: '' },
  { id: 'c5', name: 'Handyman', icon: 'hammer', description: null, color: '#FF6B35', created_at: '' },
  { id: 'c6', name: 'Delivery', icon: 'bicycle', description: null, color: '#EC4899', created_at: '' },
];

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { location } = useLocation();
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [providers, setProviders] = useState<ProviderWithProfile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.profile?.full_name?.split(' ')[0] ?? 'there';

  const load = useCallback(async () => {
    try {
      const [cats, reqs] = await Promise.all([getCategories(), getOpenRequests(5)]);
      if (cats.length > 0) setCategories(cats);
      setRequests(reqs);
      if (location) {
        const nearby = await getNearbyProviders(location.latitude, location.longitude);
        setProviders(nearby);
      }
    } catch (err) {
      console.error('Home load error:', err);
    }
  }, [location]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

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
          <View>
            <Text style={styles.greeting}>Good morning, {firstName} 👋</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={Colors.secondary} />
              <Text style={styles.locationText}>New York, NY</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
          <Ionicons name="search-outline" size={18} color={Colors.muted} />
          <Text style={styles.searchPlaceholder}>Search services, providers...</Text>
          <View style={styles.filterBtn}>
            <Ionicons name="options-outline" size={16} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Hero banner */}
        <TouchableOpacity
          style={styles.heroBanner}
          onPress={() => navigation.navigate('PostRequest', {})}
          activeOpacity={0.9}
        >
          <View style={styles.heroBannerDecor} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroBannerPre}>Need something done?</Text>
            <Text style={styles.heroBannerTitle}>Post a request now</Text>
            <Text style={styles.heroBannerSub}>Get offers from nearby pros in minutes</Text>
          </View>
          <View style={styles.heroBannerBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse categories</Text>
        </View>
        <View style={styles.categoriesGrid}>
          {categories.slice(0, 6).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catItem, { backgroundColor: cat.color + '15' }]}
              onPress={() => navigation.navigate('Category', { categoryId: cat.id, categoryName: cat.name })}
              activeOpacity={0.8}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + '25' }]}>
                <Ionicons name={getCategoryIcon(cat.icon)} size={22} color={cat.color} />
              </View>
              <Text style={[styles.catName, { color: cat.color }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nearby providers */}
        {providers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby providers</Text>
              <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersRow}>
              {providers.map((p) => (
                <View key={p.user_id} style={styles.providerCardWrap}>
                  <ProviderCard
                    provider={p}
                    onPress={() => navigation.navigate('ProviderProfile', { providerId: p.user_id })}
                    compact
                  />
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Recent requests */}
        {requests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent requests</Text>
              <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
            </View>
            <View style={styles.requestsList}>
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onPress={() => navigation.navigate('RequestDetail', { requestId: req.id })}
                />
              ))}
            </View>
          </>
        )}

        {/* Quick actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActions}>
          {[
            { icon: 'add-circle-outline' as const, label: 'Post Request', color: Colors.primary, action: () => navigation.navigate('PostRequest', {}) },
            { icon: 'compass-outline' as const, label: 'Browse Pros', color: Colors.secondary, action: () => {} },
            { icon: 'document-text-outline' as const, label: 'My Requests', color: Colors.info, action: () => {} },
            { icon: 'chatbubbles-outline' as const, label: 'Messages', color: Colors.success, action: () => {} },
          ].map((qa) => (
            <TouchableOpacity key={qa.label} style={styles.quickAction} onPress={qa.action} activeOpacity={0.8}>
              <View style={[styles.qaIcon, { backgroundColor: qa.color + '15' }]}>
                <Ionicons name={qa.icon} size={22} color={qa.color} />
              </View>
              <Text style={styles.qaLabel}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: Colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 13, color: Colors.muted },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 50,
    gap: 10,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: Colors.muted },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Shadow.md,
  },
  heroBannerDecor: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -40,
    top: -40,
  },
  heroBannerPre: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 2 },
  heroBannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  heroBannerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.lg,
  },
  catItem: { width: '30.5%', borderRadius: Radius.lg, padding: 14, alignItems: 'center', gap: 8 },
  catIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  providersRow: { paddingHorizontal: Spacing.lg, gap: 12, paddingBottom: 4 },
  providerCardWrap: { width: 260 },
  requestsList: { paddingHorizontal: Spacing.lg, gap: 12, marginBottom: Spacing.lg },
  quickActions: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 10, marginBottom: Spacing.lg },
  quickAction: { flex: 1, alignItems: 'center', gap: 8 },
  qaIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
});
