import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';

export interface FallbackCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface FallbackOpportunity {
  id: string;
  title: string;
  subtitle: string; // category name or skill
}

interface Props {
  query: string;
  popularCategories: FallbackCategory[];
  similarOpportunities: FallbackOpportunity[];
  trendingSearches: string[];
  onCategoryPress: (cat: FallbackCategory) => void;
  onOpportunityPress: (opp: FallbackOpportunity) => void;
  onTrendingPress: (term: string) => void;
}

export function NoResultsFallback({
  query,
  popularCategories,
  similarOpportunities,
  trendingSearches,
  onCategoryPress,
  onOpportunityPress,
  onTrendingPress,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Header message */}
      <View style={styles.messageBox}>
        <Ionicons name="search-outline" size={32} color={Colors.primary} />
        <Text style={styles.messageTitle}>No exact matches for "{query}"</Text>
        <Text style={styles.messageDesc}>
          We couldn't find exact matches for your search, but here are similar opportunities.
        </Text>
      </View>

      {/* Similar Jobs / Nearby Opportunities */}
      {similarOpportunities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Similar Opportunities</Text>
          {similarOpportunities.map((opp) => (
            <TouchableOpacity
              key={opp.id}
              style={styles.oppRow}
              onPress={() => onOpportunityPress(opp)}
              activeOpacity={0.75}
            >
              <View style={styles.oppIcon}>
                <Ionicons name="briefcase-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.oppText}>
                <Text style={styles.oppTitle}>{opp.title}</Text>
                <Text style={styles.oppSub}>{opp.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Popular Categories */}
      {popularCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {popularCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, { backgroundColor: cat.color + '18', borderColor: cat.color + '40' }]}
                onPress={() => onCategoryPress(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, { color: cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending Searches */}
      {trendingSearches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Searches</Text>
          <View style={styles.trendingWrap}>
            {trendingSearches.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.trendingChip}
                onPress={() => onTrendingPress(term)}
                activeOpacity={0.75}
              >
                <Ionicons name="trending-up-outline" size={13} color={Colors.primary} />
                <Text style={styles.trendingText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  messageBox: {
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 8,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  messageDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  oppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    ...Shadow.sm,
  },
  oppIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oppText: { flex: 1 },
  oppTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  oppSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  catRow: { gap: 8, paddingBottom: 4 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontWeight: '600' },
  trendingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  trendingText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
});
