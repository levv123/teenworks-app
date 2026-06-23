import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useLocation } from '../../hooks/useLocation';
import { browseServices } from '../../api/services';
import { getCategories } from '../../api/requests';
import { ServiceCard } from '../../components/ServiceCard';
import { SearchSuggestions } from '../../components/SearchSuggestions';
import { RelevanceBadge } from '../../components/RelevanceBadge';
import { NoResultsFallback } from '../../components/NoResultsFallback';
import {
  expandSearchTerms,
  filterServicesByQuery,
  getSuggestions,
  rankByRelevance,
  scoreService,
  POPULAR_CATEGORIES,
  TRENDING_SEARCHES,
} from '../../utils/searchUtils';
import {
  Category,
  DEFAULT_SERVICE_FILTERS,
  ProviderService,
  ServiceFilters,
  ServiceSortOrder,
  ServicesStackParamList,
} from '../../types';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServicesBrowse'>;

// ── Constants ─────────────────────────────────────────────────

const SORT_OPTIONS: { value: ServiceSortOrder; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'recommended',  label: 'Recommended',   icon: 'star-outline' },
  { value: 'highest_rated',label: 'Highest Rated',  icon: 'thumbs-up-outline' },
  { value: 'most_popular', label: 'Most Popular',   icon: 'flame-outline' },
  { value: 'newest',       label: 'Newest',         icon: 'time-outline' },
];

const PRICE_PRESETS = [
  { label: 'Any', min: '', max: '' },
  { label: 'Under $25', min: '', max: '25' },
  { label: '$25–$50', min: '25', max: '50' },
  { label: '$50–$100', min: '50', max: '100' },
  { label: '$100+', min: '100', max: '' },
];

const DELIVERY_PRESETS = [
  { label: 'Any', value: 0 },
  { label: '1 day', value: 1 },
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
];

const TRUST_OPTIONS = [
  { value: 'any'    as const, label: 'Any',          sub: 'All providers' },
  { value: 'medium' as const, label: 'Trusted',       sub: 'Verified phone + reviews' },
  { value: 'high'   as const, label: 'Highly Trusted',sub: 'Identity verified' },
];

// ── Main Component ────────────────────────────────────────────

export function ServicesBrowseScreen({ route, navigation }: Props) {
  const initialCategoryId = route.params?.initialCategoryId ?? null;
  const initialQuery = route.params?.initialQuery ?? '';

  // Data
  const [services, setServices] = useState<ProviderService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<TextInput>(null);

  // Sort
  const [sort, setSort] = useState<ServiceSortOrder>('recommended');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const sortSlide = useRef(new Animated.Value(300)).current;

  // Filters
  const [filters, setFilters] = useState<ServiceFilters>({
    ...DEFAULT_SERVICE_FILTERS,
    categoryId: initialCategoryId,
  });
  const [pendingFilters, setPendingFilters] = useState<ServiceFilters>({ ...DEFAULT_SERVICE_FILTERS, categoryId: initialCategoryId });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const filterSlide = useRef(new Animated.Value(600)).current;

  // Location
  const { location, address } = useLocation();

  const expandedTerms = expandSearchTerms(query);
  const suggestions = getSuggestions(query);

  // ── Data loading ───────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await browseServices(filters, sort);
      setServices(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, sort]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived results ────────────────────────────────────────

  const searched = query.trim()
    ? filterServicesByQuery(services, expandedTerms)
    : services;

  // Trust filter — use actual trust_level/trust_score when available, fall back to proxy
  const trustFiltered = searched.filter((s) => {
    if (filters.trustLevel === 'any') return true;
    const level = s.provider_profile?.trust_level;
    const score = s.provider_profile?.trust_score;
    if (filters.trustLevel === 'medium') {
      // Trust level ≥ 2 (Trusted Worker, score 30+) or proxy: 1+ review
      return level != null ? level >= 2 : (score != null ? score >= 30 : s.review_count >= 1);
    }
    if (filters.trustLevel === 'high') {
      // Trust level ≥ 3 (Verified Pro, score 55+) or proxy: 3+ reviews + 4★
      return level != null ? level >= 3 : (score != null ? score >= 55 : (s.review_count >= 3 && s.rating >= 4.0));
    }
    return true;
  });

  // Near Me: we'd sort by distance if we had lat/lng on services — placeholder for now
  const located = trustFiltered;

  // Final sort
  const results: (ProviderService & { relevance?: any })[] =
    sort === 'recommended'
      ? rankByRelevance(located, query, expandedTerms, (s) => ({
          texts: [s.title, s.description ?? '', s.category?.name ?? ''],
          rating: s.rating,
          reviewCount: s.review_count,
          createdAt: s.created_at,
          popularity: Math.min(100, s.review_count * 5 + s.rating * 10),
          trustScore: s.provider_profile?.trust_score ?? null,
          trustLevel: s.provider_profile?.trust_level ?? null,
        }))
      : located.map((s) => ({ ...s, relevance: null }));

  // ── Active filter chip helpers ─────────────────────────────

  const activeFilterChips: { key: string; label: string }[] = [];
  if (filters.categoryId) {
    const cat = categories.find((c) => c.id === filters.categoryId);
    if (cat) activeFilterChips.push({ key: 'categoryId', label: cat.name });
  }
  if (filters.minPrice || filters.maxPrice) {
    const label = filters.minPrice && filters.maxPrice
      ? `$${filters.minPrice}–$${filters.maxPrice}`
      : filters.minPrice ? `From $${filters.minPrice}` : `Up to $${filters.maxPrice}`;
    activeFilterChips.push({ key: 'price', label });
  }
  if (filters.minRating > 0) activeFilterChips.push({ key: 'minRating', label: `${filters.minRating}★+` });
  if (filters.trustLevel !== 'any') {
    activeFilterChips.push({ key: 'trustLevel', label: filters.trustLevel === 'high' ? 'Highly Trusted' : 'Trusted' });
  }
  if (filters.maxDeliveryDays > 0) {
    activeFilterChips.push({ key: 'maxDeliveryDays', label: `≤ ${filters.maxDeliveryDays} days` });
  }
  if (filters.nearMe) activeFilterChips.push({ key: 'nearMe', label: 'Near Me' });

  const removeFilterChip = (key: string) => {
    const next = { ...filters };
    if (key === 'categoryId')      next.categoryId = null;
    if (key === 'price')           { next.minPrice = ''; next.maxPrice = ''; }
    if (key === 'minRating')       next.minRating = 0;
    if (key === 'trustLevel')      next.trustLevel = 'any';
    if (key === 'maxDeliveryDays') next.maxDeliveryDays = 0;
    if (key === 'nearMe')          next.nearMe = false;
    setFilters(next);
  };

  const clearAllFilters = () => {
    setFilters({ ...DEFAULT_SERVICE_FILTERS });
    setQuery('');
  };

  const hasActiveFilters = activeFilterChips.length > 0 || query.trim().length > 0;

  // ── Sort sheet ─────────────────────────────────────────────

  const openSortSheet = () => {
    setShowSortSheet(true);
    Animated.spring(sortSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };
  const closeSortSheet = () => {
    Animated.timing(sortSlide, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => setShowSortSheet(false));
  };

  // ── Filter sheet ───────────────────────────────────────────

  const openFilterSheet = () => {
    setPendingFilters({ ...filters });
    setShowFilterSheet(true);
    Animated.spring(filterSlide, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
  };
  const closeFilterSheet = () => {
    Animated.timing(filterSlide, { toValue: 600, duration: 220, useNativeDriver: true }).start(() => setShowFilterSheet(false));
  };
  const applyFilters = () => {
    setFilters({ ...pendingFilters });
    closeFilterSheet();
  };
  const resetPending = () => setPendingFilters({ ...DEFAULT_SERVICE_FILTERS });

  // ── Render ─────────────────────────────────────────────────

  const currentSort = SORT_OPTIONS.find((o) => o.value === sort)!;

  const renderItem = ({ item }: { item: ProviderService & { relevance?: any } }) => (
    <View style={styles.cardWrap}>
      <ServiceCard
        service={item}
        onPress={() => navigation.navigate('ServiceDetail', { service: item })}
      />
      {query.trim() && sort === 'recommended' && item.relevance && (
        <View style={styles.relevanceWrap}>
          <RelevanceBadge
            label={item.relevance.label}
            percent={item.relevance.percent}
            matchType={item.relevance.matchType}
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Services</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('SavedServices')}
          >
            <Ionicons name="heart-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterIconBtn, hasActiveFilters && styles.filterIconBtnActive]}
            onPress={openFilterSheet}
          >
          <Ionicons name="options-outline" size={20} color={hasActiveFilters ? Colors.card : Colors.text} />
          {activeFilterChips.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterChips.length}</Text>
            </View>
          )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchAnchor}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.muted} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              value={query}
              onChangeText={(t) => { setQuery(t); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search services, skills, categories…"
              placeholderTextColor={Colors.muted}
              returnKeyType="search"
              onSubmitEditing={() => setShowSuggestions(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setShowSuggestions(false); }}>
                <Ionicons name="close-circle" size={18} color={Colors.muted} />
              </TouchableOpacity>
            )}
          </View>
          {showSuggestions && suggestions.length > 0 && (
            <SearchSuggestions
              suggestions={suggestions}
              onSelect={(label) => { setQuery(label); setShowSuggestions(false); }}
            />
          )}
        </View>
      </View>

      {/* ── Controls row: active chips + sort ──────────────── */}
      <View style={styles.controlsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {/* Sort pill */}
          <TouchableOpacity style={styles.sortPill} onPress={openSortSheet}>
            <Ionicons name={currentSort.icon} size={13} color={Colors.primary} />
            <Text style={styles.sortPillText}>{currentSort.label}</Text>
            <Ionicons name="chevron-down" size={13} color={Colors.primary} />
          </TouchableOpacity>

          {/* Active filter chips */}
          {activeFilterChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={styles.activeChip}
              onPress={() => removeFilterChip(chip.key)}
            >
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <Ionicons name="close" size={12} color={Colors.primary} />
            </TouchableOpacity>
          ))}

          {/* Clear all */}
          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearAllChip} onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ── Results count ─────────────────────────────────── */}
      {!loading && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {results.length === 0 ? 'No services found' : `${results.length} service${results.length !== 1 ? 's' : ''}`}
          </Text>
          {query.trim() && results.length > 0 && (
            <Text style={styles.countSub}>
              {expandedTerms.length > 1 ? `Smart search: "${query}"` : `Results for "${query}"`}
            </Text>
          )}
        </View>
      )}

      {/* ── Results list ──────────────────────────────────── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loaderText}>Finding services…</Text>
        </View>
      ) : results.length === 0 ? (
        <ScrollView contentContainerStyle={styles.fallbackScroll}>
          <NoResultsFallback
            query={query || 'services'}
            popularCategories={categories.length > 0 ? categories : POPULAR_CATEGORIES}
            similarOpportunities={[]}
            trendingSearches={TRENDING_SEARCHES.slice(0, 6)}
            onCategoryPress={(cat) => setFilters((f) => ({ ...f, categoryId: cat.id }))}
            onOpportunityPress={() => {}}
            onTrendingPress={(term) => { setQuery(term); setShowSuggestions(false); }}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={Colors.primary}
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ── Sort sheet ────────────────────────────────────── */}
      <Modal visible={showSortSheet} transparent animationType="none" onRequestClose={closeSortSheet}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeSortSheet} />
          <Animated.View style={[styles.smallSheet, { transform: [{ translateY: sortSlide }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sort By</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortRow, sort === opt.value && styles.sortRowActive]}
                onPress={() => { setSort(opt.value); closeSortSheet(); }}
              >
                <View style={[styles.sortIconWrap, sort === opt.value && styles.sortIconWrapActive]}>
                  <Ionicons name={opt.icon} size={18} color={sort === opt.value ? Colors.card : Colors.muted} />
                </View>
                <Text style={[styles.sortLabel, sort === opt.value && styles.sortLabelActive]}>
                  {opt.label}
                </Text>
                {sort === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </Modal>

      {/* ── Filter sheet ──────────────────────────────────── */}
      <Modal visible={showFilterSheet} transparent animationType="none" onRequestClose={closeFilterSheet}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeFilterSheet} />
          <Animated.View style={[styles.filterSheet, { transform: [{ translateY: filterSlide }] }]}>
            {/* Sheet header */}
            <View style={styles.sheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={resetPending} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterBody}>

              {/* Category */}
              <FilterSection title="Category">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, !pendingFilters.categoryId && styles.filterChipActive]}
                    onPress={() => setPendingFilters((f) => ({ ...f, categoryId: null }))}
                  >
                    <Text style={[styles.filterChipText, !pendingFilters.categoryId && styles.filterChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.filterChip, pendingFilters.categoryId === cat.id && styles.filterChipActive]}
                      onPress={() => setPendingFilters((f) => ({ ...f, categoryId: cat.id }))}
                    >
                      <Text style={styles.filterChipEmoji}>{cat.icon}</Text>
                      <Text style={[styles.filterChipText, pendingFilters.categoryId === cat.id && styles.filterChipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </FilterSection>

              {/* Price Range */}
              <FilterSection title="Price Range">
                <View style={styles.chipRow}>
                  {PRICE_PRESETS.map((preset) => {
                    const active = pendingFilters.minPrice === preset.min && pendingFilters.maxPrice === preset.max;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setPendingFilters((f) => ({ ...f, minPrice: preset.min, maxPrice: preset.max }))}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.priceCustomRow}>
                  <View style={styles.priceInput}>
                    <Text style={styles.priceCurrency}>$</Text>
                    <TextInput
                      style={styles.priceTextInput}
                      value={pendingFilters.minPrice}
                      onChangeText={(v) => setPendingFilters((f) => ({ ...f, minPrice: v }))}
                      placeholder="Min"
                      placeholderTextColor={Colors.muted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.priceSep}><Text style={styles.priceSepText}>–</Text></View>
                  <View style={styles.priceInput}>
                    <Text style={styles.priceCurrency}>$</Text>
                    <TextInput
                      style={styles.priceTextInput}
                      value={pendingFilters.maxPrice}
                      onChangeText={(v) => setPendingFilters((f) => ({ ...f, maxPrice: v }))}
                      placeholder="Max"
                      placeholderTextColor={Colors.muted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </FilterSection>

              {/* Rating */}
              <FilterSection title="Minimum Rating">
                <View style={styles.chipRow}>
                  {[0, 3, 3.5, 4, 4.5].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.filterChip, pendingFilters.minRating === r && styles.filterChipActive]}
                      onPress={() => setPendingFilters((f) => ({ ...f, minRating: r }))}
                    >
                      {r === 0 ? (
                        <Text style={[styles.filterChipText, pendingFilters.minRating === r && styles.filterChipTextActive]}>Any</Text>
                      ) : (
                        <View style={styles.ratingChipInner}>
                          <Ionicons name="star" size={12} color={pendingFilters.minRating === r ? Colors.card : Colors.warning} />
                          <Text style={[styles.filterChipText, pendingFilters.minRating === r && styles.filterChipTextActive]}>
                            {r}+
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </FilterSection>

              {/* Trust Score */}
              <FilterSection title="Trust Level">
                {TRUST_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.trustRow, pendingFilters.trustLevel === opt.value && styles.trustRowActive]}
                    onPress={() => setPendingFilters((f) => ({ ...f, trustLevel: opt.value }))}
                  >
                    <View style={styles.trustRowLeft}>
                      <Ionicons
                        name="shield-checkmark"
                        size={18}
                        color={pendingFilters.trustLevel === opt.value ? Colors.primary : Colors.muted}
                      />
                      <View>
                        <Text style={[styles.trustRowLabel, pendingFilters.trustLevel === opt.value && { color: Colors.primary }]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.trustRowSub}>{opt.sub}</Text>
                      </View>
                    </View>
                    {pendingFilters.trustLevel === opt.value && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </FilterSection>

              {/* Delivery Time */}
              <FilterSection title="Delivery Time">
                <View style={styles.chipRow}>
                  {DELIVERY_PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.filterChip, pendingFilters.maxDeliveryDays === p.value && styles.filterChipActive]}
                      onPress={() => setPendingFilters((f) => ({ ...f, maxDeliveryDays: p.value }))}
                    >
                      <Text style={[styles.filterChipText, pendingFilters.maxDeliveryDays === p.value && styles.filterChipTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FilterSection>

              {/* Location */}
              <FilterSection title="Location">
                <TouchableOpacity
                  style={[styles.locationToggle, pendingFilters.nearMe && styles.locationToggleActive]}
                  onPress={() => setPendingFilters((f) => ({ ...f, nearMe: !f.nearMe }))}
                >
                  <View style={styles.locationToggleLeft}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={pendingFilters.nearMe ? Colors.primary : Colors.muted}
                    />
                    <View>
                      <Text style={[styles.locationToggleLabel, pendingFilters.nearMe && { color: Colors.primary }]}>
                        Near Me
                      </Text>
                      <Text style={styles.locationToggleSub}>
                        {address ?? (location ? 'Using your location' : 'Enable location access')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.toggle, pendingFilters.nearMe && styles.toggleActive]}>
                    <View style={[styles.toggleKnob, pendingFilters.nearMe && styles.toggleKnobActive]} />
                  </View>
                </TouchableOpacity>
              </FilterSection>

            </ScrollView>

            {/* Apply button */}
            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Show Results</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterIconBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.card },

  // Search
  searchWrap: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, zIndex: 100 },
  searchAnchor: { position: 'relative' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 10,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  // Controls row
  controlsRow: { paddingBottom: Spacing.xs },
  chipsScroll: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center' },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary + '44',
  },
  sortPillText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    backgroundColor: Colors.primaryLight + '88',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  activeChipText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  clearAllChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  clearAllText: { fontSize: 12, fontWeight: '600', color: Colors.error },

  // Count
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  countText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  countSub: { fontSize: 11, color: Colors.primary, fontWeight: '500' },

  // List
  list: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  cardWrap: { gap: Spacing.xs },
  relevanceWrap: { paddingHorizontal: 2 },

  // Loader
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loaderText: { fontSize: 14, color: Colors.muted },
  fallbackScroll: { paddingBottom: Spacing.xl },

  // Sheet shared
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },

  // Sort sheet
  smallSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.lg,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
  },
  sortRowActive: { backgroundColor: Colors.primaryLight + '44' },
  sortIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortIconWrapActive: { backgroundColor: Colors.primary },
  sortLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
  sortLabelActive: { fontWeight: '700', color: Colors.primary },

  // Filter sheet
  filterSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    maxHeight: '90%',
    ...Shadow.lg,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  resetBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  resetBtnText: { fontSize: 14, color: Colors.error, fontWeight: '600' },
  filterBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.lg },
  filterSection: { gap: Spacing.sm },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: Colors.muted },
  filterChipTextActive: { color: Colors.card, fontWeight: '700' },
  filterChipEmoji: { fontSize: 13 },
  ratingChipInner: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  // Price custom inputs
  priceCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  priceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingLeft: Spacing.sm,
  },
  priceCurrency: { fontSize: 14, color: Colors.muted, fontWeight: '600' },
  priceTextInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingLeft: 4,
    fontSize: 14,
    color: Colors.text,
  },
  priceSep: { paddingHorizontal: 4 },
  priceSepText: { fontSize: 16, color: Colors.muted },

  // Trust rows
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  trustRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '22' },
  trustRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  trustRowLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  trustRowSub: { fontSize: 11, color: Colors.muted, marginTop: 1 },

  // Location toggle
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  locationToggleActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '22' },
  locationToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  locationToggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  locationToggleSub: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: Colors.primary },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    ...Shadow.sm,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },

  // Filter footer
  filterFooter: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.md,
  },
  applyBtnText: { color: Colors.card, fontWeight: '700', fontSize: 16 },
});
