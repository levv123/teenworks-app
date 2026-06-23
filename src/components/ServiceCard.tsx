import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../utils/colors';
import { ProviderService } from '../types';
import { StarRating } from './StarRating';
import { TrustBadge } from './TrustBadge';
import { TrustLevelBadge } from './TrustLevelBadge';
import { TrustSignalBar } from './TrustSignalBar';

interface ServiceCardProps {
  service: ProviderService;
  trustScore?: number;
  onPress?: () => void;
  compact?: boolean;
}

export function ServiceCard({ service, trustScore: trustScoreProp, onPress, compact = false }: ServiceCardProps) {
  // Prefer explicit prop, fall back to joined provider_profile.trust_score
  const trustScore = trustScoreProp ?? service.provider_profile?.trust_score;
  const heroImage = service.images?.[0] ?? null;
  const hasRating = service.review_count > 0;

  const pkgs = service.packages ?? [];
  const minPkgPrice = pkgs.length > 0 ? Math.min(...pkgs.map((p) => p.price)) : null;
  const maxPkgPrice = pkgs.length > 0 ? Math.max(...pkgs.map((p) => p.price)) : null;
  const priceLabel = minPkgPrice !== null && maxPkgPrice !== null && minPkgPrice !== maxPkgPrice
    ? `$${minPkgPrice}–$${maxPkgPrice}`
    : `$${service.starting_price}`;
  const priceSuffix = minPkgPrice !== null && maxPkgPrice !== null && minPkgPrice !== maxPkgPrice
    ? ''
    : '';
  const footerPriceLabel = minPkgPrice !== null ? 'Packages from' : 'Starting at';

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.85}>
        {/* Thumbnail */}
        <View style={styles.compactThumb}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.compactThumbImg} />
          ) : (
            <ServicePlaceholder size={72} />
          )}
        </View>

        {/* Info */}
        <View style={styles.compactInfo}>
          {service.category && (
            <Text style={styles.compactCategory}>{service.category.icon} {service.category.name}</Text>
          )}
          <Text style={styles.compactTitle} numberOfLines={2}>{service.title}</Text>
          <View style={styles.compactMeta}>
            <StarRating rating={service.rating} size={11} />
            <Text style={styles.compactRating}>
              {hasRating ? service.rating.toFixed(1) : 'New'}
            </Text>
          </View>
          <View style={styles.compactBottom}>
            <Text style={styles.compactPrice}>{priceLabel}</Text>
            {trustScore !== undefined
              ? <TrustBadge score={trustScore} size="xs" />
              : <Text style={styles.compactDays}>{service.delivery_days}d</Text>
            }
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Hero image */}
      <View style={styles.hero}>
        {heroImage ? (
          <ImageBackground source={{ uri: heroImage }} style={styles.heroImg} resizeMode="cover">
            <View style={styles.heroGradient} />
            {service.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {service.category.icon} {service.category.name}
                </Text>
              </View>
            )}
          </ImageBackground>
        ) : (
          <View style={styles.heroPlaceholder}>
            <ServicePlaceholder size={56} />
            {service.category && (
              <View style={[styles.categoryBadge, styles.categoryBadgeOnPlaceholder]}>
                <Text style={styles.categoryBadgeText}>
                  {service.category.icon} {service.category.name}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Active / inactive pill */}
        {!service.is_active && (
          <View style={styles.inactivePill}>
            <Text style={styles.inactivePillText}>Paused</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{service.title}</Text>

        {/* Rating row */}
        <View style={styles.ratingRow}>
          <StarRating rating={service.rating} size={14} />
          <Text style={styles.ratingNum}>
            {hasRating ? service.rating.toFixed(1) : 'No reviews yet'}
          </Text>
          {hasRating && (
            <Text style={styles.reviewCount}>({service.review_count})</Text>
          )}
        </View>

        {/* Trust signals — social proof at a glance */}
        {service.provider_profile && (
          <TrustSignalBar
            size="sm"
            layout="scroll"
            signals={{
              trustScore: trustScore,
              reviewCount: service.provider_profile.review_count,
              completionRate: (service.provider_profile as any).completion_rate,
              repeatClientRate: (service.provider_profile as any).repeat_client_rate,
              completedBookings: (service.provider_profile as any).completed_bookings,
              totalBookings: (service.provider_profile as any).total_bookings,
            }}
          />
        )}

        {/* Chips row: trust level + trust score + delivery */}
        <View style={styles.chipsRow}>
          {trustScore !== undefined && (
            <>
              <TrustLevelBadge score={trustScore} size="xs" />
              <TrustBadge score={trustScore} size="sm" />
            </>
          )}
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={11} color={Colors.muted} />
            <Text style={styles.chipText}>
              {service.delivery_days} Day Delivery
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>{footerPriceLabel}</Text>
          <Text style={styles.price}>{priceLabel}</Text>
        </View>
        <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
          <Text style={styles.viewBtnText}>View Service</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.card} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ServicePlaceholder({ size }: { size: number }) {
  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 4 }]}>
      <Ionicons name="briefcase-outline" size={size * 0.45} color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Full card ──────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },

  hero: {
    height: 168,
    backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
  },
  heroImg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.25)',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight + '55',
  },
  categoryBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(26,26,46,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  categoryBadgeOnPlaceholder: {
    backgroundColor: Colors.primary + 'CC',
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  inactivePill: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  inactivePillText: {
    color: Colors.card,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  body: {
    padding: Spacing.md,
    gap: Spacing.xs + 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 22,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.muted,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  priceBlock: {
    gap: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: Colors.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  viewBtnText: {
    color: Colors.card,
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Compact card ──────────────────────────────────────────────
  compactCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  compactThumb: {
    width: 88,
    height: 88,
    backgroundColor: Colors.primaryLight + '55',
    overflow: 'hidden',
    flexShrink: 0,
  },
  compactThumbImg: {
    width: '100%',
    height: '100%',
  },
  compactInfo: {
    flex: 1,
    padding: Spacing.sm,
    gap: 3,
    justifyContent: 'center',
  },
  compactCategory: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 17,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactRating: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '500',
  },
  compactBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  compactPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  compactDays: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '500',
  },

  // ── Shared ────────────────────────────────────────────────────
  placeholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
