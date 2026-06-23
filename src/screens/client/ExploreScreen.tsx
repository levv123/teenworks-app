import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ExploreStackParamList, Category, ProviderWithProfile } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { getCategories } from '../../api/requests';
import { getProviders } from '../../api/providers';
import { ProviderCard } from '../../components/ProviderCard';
import { getCategoryIcon } from '../../components/CategoryBadge';
import { expandSearchTerms, matchesSearch, getSearchLabel, getSuggestions, rankByRelevance, TRENDING_SEARCHES, POPULAR_CATEGORIES } from '../../utils/searchUtils';
import { SearchSuggestions } from '../../components/SearchSuggestions';
import { RelevanceBadge } from '../../components/RelevanceBadge';
import { NoResultsFallback } from '../../components/NoResultsFallback';

type Nav = NativeStackNavigationProp<ExploreStackParamList>;

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Cleaning', icon: 'sparkles', description: null, color: '#6C47FF', created_at: '' },
  { id: 'c2', name: 'Plumbing', icon: 'water', description: null, color: '#3B82F6', created_at: '' },
  { id: 'c3', name: 'Electrical', icon: 'flash', description: null, color: '#F59E0B', created_at: '' },
  { id: 'c4', name: 'Moving', icon: 'cube', description: null, color: '#10B981', created_at: '' },
  { id: 'c5', name: 'Handyman', icon: 'hammer', description: null, color: '#FF6B35', created_at: '' },
  { id: 'c6', name: 'Delivery', icon: 'bicycle', description: null, color: '#EC4899', created_at: '' },
  { id: 'c7', name: 'Tutoring', icon: 'book', description: null, color: '#8B5CF6', created_at: '' },
  { id: 'c8', name: 'Pet Care', icon: 'paw', description: null, color: '#14B8A6', created_at: '' },
];

export function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [providers, setProviders] = useState<ProviderWithProfile[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, provs] = await Promise.all([getCategories(), getProviders(20)]);
        if (cats.length > 0) setCategories(cats);
        setProviders(provs);
      } catch (err) {
        console.error('Explore load error:', err);
      }
    };
    load();
  }, []);

  const expandedTerms = expandSearchTerms(search);
  const searchLabel = getSearchLabel(search, expandedTerms);
  const suggestions = getSuggestions(search);

  const baseFiltered = providers.filter((p) => {
    if (!search) return true;
    return (
      matchesSearch(p.full_name, expandedTerms) ||
      p.provider_profile?.skills?.some((s) => matchesSearch(s, expandedTerms))
    );
  });

  // When searching: trust-weighted relevance rank. When browsing: sort featured by trust score descending.
  const filteredProviders = search
    ? rankByRelevance(baseFiltered, search, expandedTerms, (p) => ({
        texts: [
          p.full_name,
          ...(p.provider_profile?.skills ?? []),
          p.provider_profile?.bio ?? '',
        ],
        rating: p.provider_profile?.rating,
        reviewCount: p.provider_profile?.review_count,
        distanceKm: p.distance_km,
        createdAt: p.created_at,
        trustScore: p.provider_profile?.trust_score ?? null,
        trustLevel: p.provider_profile?.trust_level ?? null,
      }))
    : [...baseFiltered]
        .sort((a, b) => {
          const ta = a.provider_profile?.trust_score ?? 0;
          const tb = b.provider_profile?.trust_score ?? 0;
          if (tb !== ta) return tb - ta;
          return (b.provider_profile?.rating ?? 0) - (a.provider_profile?.rating ?? 0);
        })
        .map((p) => ({ ...p, relevance: null }));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Find the right professional</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchAnchor}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.muted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={(t) => { setSearch(t); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search providers, skills..."
              placeholderTextColor={Colors.muted}
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
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catPill, !selectedCat && styles.catPillActive]}
            onPress={() => setSelectedCat(null)}
          >
            <Text style={[styles.catPillText, !selectedCat && styles.catPillTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catPill,
                { borderColor: selectedCat === cat.id ? cat.color : Colors.border },
                selectedCat === cat.id && { backgroundColor: cat.color + '20' },
              ]}
              onPress={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
            >
              <Ionicons name={getCategoryIcon(cat.icon)} size={14} color={selectedCat === cat.id ? cat.color : Colors.muted} />
              <Text style={[styles.catPillText, selectedCat === cat.id && { color: cat.color }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category grid (when no search) */}
        {!search && !selectedCat && (
          <>
            <Text style={styles.sectionTitle}>All Categories</Text>
            <View style={styles.catGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catGridItem, { backgroundColor: cat.color + '12' }]}
                  onPress={() => navigation.navigate('Category', { categoryId: cat.id, categoryName: cat.name })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catGridIcon, { backgroundColor: cat.color + '25' }]}>
                    <Ionicons name={getCategoryIcon(cat.icon)} size={26} color={cat.color} />
                  </View>
                  <Text style={[styles.catGridName, { color: cat.color }]}>{cat.name}</Text>
                  <Text style={styles.catGridDesc} numberOfLines={2}>{cat.description ?? `Find ${cat.name.toLowerCase()} professionals`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Providers list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCat
              ? `${categories.find((c) => c.id === selectedCat)?.name} Providers`
              : search
              ? searchLabel
              : 'Top Trusted Providers'}
          </Text>
          <Text style={styles.countText}>{filteredProviders.length} found</Text>
        </View>

        {filteredProviders.length === 0 && search ? (
          <NoResultsFallback
            query={search}
            popularCategories={categories.length > 0 ? categories.slice(0, 6) : POPULAR_CATEGORIES}
            similarOpportunities={providers.slice(0, 3).map((p) => ({
              id: p.user_id,
              title: p.full_name,
              subtitle: p.provider_profile?.skills?.[0] ?? 'Provider',
            }))}
            trendingSearches={TRENDING_SEARCHES.slice(0, 6)}
            onCategoryPress={(cat) => navigation.navigate('Category', { categoryId: cat.id, categoryName: cat.name })}
            onOpportunityPress={(opp) => navigation.navigate('ProviderProfile', { providerId: opp.id })}
            onTrendingPress={(term) => { setSearch(term); setShowSuggestions(false); }}
          />
        ) : filteredProviders.length === 0 ? (
          <View style={styles.emptyProviders}>
            <Ionicons name="person-outline" size={40} color={Colors.muted} />
            <Text style={styles.emptyTitle}>No providers yet</Text>
            <Text style={styles.emptyDesc}>Check back soon</Text>
          </View>
        ) : (
          <View style={styles.providersList}>
            {filteredProviders.map((p) => (
              <View key={p.user_id}>
                <ProviderCard
                  provider={p}
                  onPress={() => navigation.navigate('ProviderProfile', { providerId: p.user_id })}
                />
                {search && p.relevance && (
                  <View style={styles.badgeRow}>
                    <RelevanceBadge
                      label={p.relevance.label}
                      percent={p.relevance.percent}
                      matchType={p.relevance.matchType}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.muted },
  searchWrapper: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, zIndex: 100 },
  searchAnchor: { position: 'relative' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 50,
    gap: 10,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  catScroll: { paddingHorizontal: Spacing.lg, gap: 8, marginBottom: Spacing.md },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  catPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catPillText: { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  catPillTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, paddingHorizontal: Spacing.lg, marginBottom: 12 },
  countText: { fontSize: 13, color: Colors.muted },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 12, marginBottom: Spacing.lg },
  catGridItem: { width: '46%', borderRadius: Radius.lg, padding: 14, gap: 8 },
  catGridIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catGridName: { fontSize: 15, fontWeight: '700' },
  catGridDesc: { fontSize: 12, color: Colors.muted, lineHeight: 16 },
  providersList: { paddingHorizontal: Spacing.lg, gap: 12 },
  badgeRow: { paddingHorizontal: 4, marginTop: -8, marginBottom: 4 },
  emptyProviders: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
});
