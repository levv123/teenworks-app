import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../utils/colors';
import { ProviderWithProfile } from '../types';
import { Avatar } from './Avatar';
import { StarRating } from './StarRating';
import { TrustBadge } from './TrustBadge';
import { TrustLevelBadge } from './TrustLevelBadge';
import { TrustSignalBar } from './TrustSignalBar';
import { formatCurrency, formatDistance } from '../utils/helpers';

interface ProviderCardProps {
  provider: ProviderWithProfile;
  onPress?: () => void;
  compact?: boolean;
}

export function ProviderCard({ provider, onPress, compact }: ProviderCardProps) {
  const pp = provider.provider_profile;

  return (
    <TouchableOpacity style={[styles.card, compact && styles.compact]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <Avatar
            uri={provider.avatar_url}
            name={provider.full_name}
            size={compact ? 44 : 56}
            showOnlineIndicator
            isOnline={pp?.is_available}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{provider.full_name}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={pp?.rating ?? 0} size={13} />
            <Text style={styles.ratingText}>{(pp?.rating ?? 0) > 0 ? (pp?.rating ?? 0).toFixed(1) : 'New'}</Text>
            {(pp?.review_count ?? 0) > 0 && (
              <Text style={styles.reviewCount}>· {pp!.review_count}</Text>
            )}
          </View>
          {pp?.trust_score !== undefined && (
            <View style={styles.trustRow}>
              <TrustBadge score={pp.trust_score} size="xs" />
              <TrustLevelBadge score={pp.trust_score} size="xs" />
            </View>
          )}
          {/* Trust signals strip — compact, only shows when data exists */}
          {!compact && pp && (
            <TrustSignalBar
              size="sm"
              layout="wrap"
              signals={{
                reviewCount: pp.review_count,
                completionRate: (pp as any).completion_rate,
                repeatClientRate: (pp as any).repeat_client_rate,
                completedBookings: (pp as any).completed_bookings,
                totalBookings: (pp as any).total_bookings,
              }}
            />
          )}
          {!compact && pp?.skills && pp.skills.length > 0 && (
            <View style={styles.skills}>
              {pp.skills.slice(0, 3).map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.meta}>
          {pp?.hourly_rate && (
            <Text style={styles.rate}>{formatCurrency(pp.hourly_rate)}<Text style={styles.rateUnit}>/hr</Text></Text>
          )}
          {provider.distance_km !== undefined && (
            <View style={styles.distRow}>
              <Ionicons name="location-outline" size={11} color={Colors.muted} />
              <Text style={styles.dist}>{formatDistance(provider.distance_km)}</Text>
            </View>
          )}
          {pp?.is_available ? (
            <View style={styles.availBadge}>
              <Text style={styles.availText}>Available</Text>
            </View>
          ) : (
            <View style={[styles.availBadge, styles.unavailBadge]}>
              <Text style={[styles.availText, styles.unavailText]}>Busy</Text>
            </View>
          )}
        </View>
      </View>
      {!compact && pp?.bio && (
        <Text style={styles.bio} numberOfLines={2}>{pp.bio}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  compact: { padding: 12 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatarWrapper: {},
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  reviewCount: { fontSize: 12, color: Colors.muted },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  skillChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  skillText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  meta: { alignItems: 'flex-end', gap: 4 },
  rate: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  rateUnit: { fontSize: 12, fontWeight: '400', color: Colors.muted },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dist: { fontSize: 11, color: Colors.muted },
  availBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  unavailBadge: { backgroundColor: Colors.border },
  availText: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  unavailText: { color: Colors.muted },
  bio: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
