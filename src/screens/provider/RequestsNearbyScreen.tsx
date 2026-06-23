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
  Alert,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, ServiceRequest } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { getOpenRequests } from '../../api/requests';
import { createBooking } from '../../api/bookings';
import { formatCurrency, timeAgo, getStatusColor } from '../../utils/helpers';
import { expandSearchTerms, matchesSearch, getSearchLabel, getSuggestions, rankByRelevance, TRENDING_SEARCHES, POPULAR_CATEGORIES } from '../../utils/searchUtils';
import { SearchSuggestions } from '../../components/SearchSuggestions';
import { RelevanceBadge } from '../../components/RelevanceBadge';
import { NoResultsFallback } from '../../components/NoResultsFallback';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function RequestsNearbyScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getOpenRequests(50);
      setRequests(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const expandedTerms = expandSearchTerms(search);
  const searchLabel = getSearchLabel(search, expandedTerms);
  const suggestions = getSuggestions(search);

  const baseFiltered = requests.filter((r) => {
    if (!search) return true;
    return (
      matchesSearch(r.title, expandedTerms) ||
      matchesSearch(r.description ?? '', expandedTerms) ||
      matchesSearch(r.category?.name ?? '', expandedTerms)
    );
  });

  const filtered = search
    ? rankByRelevance(baseFiltered, search, expandedTerms, (r) => ({
        texts: [r.title, r.description ?? '', r.category?.name ?? ''],
        distanceKm: undefined,
        createdAt: r.created_at,
      }))
    : baseFiltered.map((r) => ({ ...r, relevance: null }));

  const handleSendOffer = (request: ServiceRequest) => {
    if (!user?.id) return;
    Alert.prompt(
      'Send Offer',
      `Enter your price for:\n"${request.title}"`,
      async (priceStr) => {
        const price = parseFloat(priceStr ?? '');
        if (isNaN(price) || price <= 0) {
          Alert.alert('Invalid price', 'Please enter a valid amount');
          return;
        }
        setSending(request.id);
        try {
          await createBooking(request.id, user.id, request.client_id, price);
          Alert.alert('Offer Sent!', 'The client will be notified of your offer.');
          fetchRequests();
        } catch (err: unknown) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send offer');
        } finally {
          setSending(null);
        }
      },
      'plain-text',
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Requests</Text>
        {location && (
          <View style={styles.locationChip}>
            <Ionicons name="location" size={11} color={Colors.primary} />
            <Text style={styles.locationText}>
              {user?.providerProfile?.radius_km ?? 10}km radius
            </Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchAnchor}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests…"
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={(t) => { setSearch(t); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setShowSuggestions(false); }}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        {showSuggestions && (
          <SearchSuggestions
            suggestions={suggestions}
            onSelect={(label) => { setSearch(label); setShowSuggestions(false); }}
          />
        )}
      </View>

      {/* Search results header */}
      {search.length > 0 && !loading && (
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsText}>{searchLabel}</Text>
          <Text style={styles.searchResultsCount}>{filtered.length} found</Text>
        </View>
      )}

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
            <View style={styles.reqCard}>
              <View style={styles.reqTop}>
                <View style={[styles.catBadge, { backgroundColor: item.category?.color + '20' ?? Colors.primaryLight }]}>
                  <Text style={[styles.catBadgeText, { color: item.category?.color ?? Colors.primary }]}>
                    {item.category?.name ?? 'General'}
                  </Text>
                </View>
                <Text style={styles.reqTime}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.reqTitle}>{item.title}</Text>
              {search && item.relevance && (
                <RelevanceBadge
                  label={item.relevance.label}
                  percent={item.relevance.percent}
                  matchType={item.relevance.matchType}
                />
              )}
              {item.description && (
                <Text style={styles.reqDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <View style={styles.reqMeta}>
                {item.address && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color={Colors.muted} />
                    <Text style={styles.metaText} numberOfLines={1}>{item.address}</Text>
                  </View>
                )}
                {item.budget && (
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={13} color={Colors.muted} />
                    <Text style={styles.metaText}>Budget: {formatCurrency(item.budget)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.reqActions}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
                >
                  <Text style={styles.detailBtnText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.offerBtn}
                  onPress={() => handleSendOffer(item)}
                  disabled={sending === item.id}
                >
                  {sending === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={14} color="#fff" />
                      <Text style={styles.offerBtnText}>Send Offer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            search ? (
              <NoResultsFallback
                query={search}
                popularCategories={POPULAR_CATEGORIES}
                similarOpportunities={requests.slice(0, 3).map((r) => ({
                  id: r.id,
                  title: r.title,
                  subtitle: r.category?.name ?? 'Open Request',
                }))}
                trendingSearches={TRENDING_SEARCHES.slice(0, 6)}
                onCategoryPress={(cat) => setSearch(cat.name)}
                onOpportunityPress={(opp) => navigation.navigate('RequestDetail', { requestId: opp.id })}
                onTrendingPress={(term) => { setSearch(term); setShowSuggestions(false); }}
              />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="map-outline" size={48} color={Colors.muted} />
                <Text style={styles.emptyTitle}>No nearby requests</Text>
                <Text style={styles.emptySubText}>Check back soon or expand your radius in settings</Text>
              </View>
            )
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
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  locationText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  searchAnchor: { position: 'relative', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, zIndex: 100 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border, gap: 10, ...Shadow.sm },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  reqCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  reqTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  catBadgeText: { fontSize: 12, fontWeight: '700' },
  reqTime: { fontSize: 12, color: Colors.muted },
  reqTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  reqDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  reqMeta: { gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: Colors.muted, flex: 1 },
  reqActions: { flexDirection: 'row', gap: 10 },
  detailBtn: { flex: 1, paddingVertical: 11, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center' },
  detailBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  offerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: Radius.md, backgroundColor: Colors.primary },
  offerBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubText: { fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
  searchResultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  searchResultsText: { fontSize: 13, color: Colors.muted, fontStyle: 'italic', flex: 1 },
  searchResultsCount: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
});
