import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, ProviderWithProfile, Review } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getProviderById } from '../../api/providers';
import { getProviderReviewsForUser } from '../../api/reviews';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { ReviewCard } from '../../components/ReviewCard';
import { RatingSummary } from '../../components/RatingSummary';
import { TrustBadge } from '../../components/TrustBadge';
import { TrustScoreCard } from '../../components/TrustScoreCard';
import { TrustLevelBadge } from '../../components/TrustLevelBadge';
import { TrustLevelCard } from '../../components/TrustLevelCard';
import { VerificationBadges } from '../../components/VerificationBadges';
import { formatCurrency } from '../../utils/helpers';
import { computeTrustBreakdown, computeTrustScore } from '../../utils/trust';
import { TrustSignalBar } from '../../components/TrustSignalBar';

type Props = NativeStackScreenProps<HomeStackParamList, 'ProviderProfile'>;

export function ProviderProfileScreen({ route, navigation }: Props) {
  const { providerId } = route.params;
  const { user } = useAuth();
  const [provider, setProvider] = useState<ProviderWithProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const PAGE_SIZE = 5;

  useEffect(() => {
    Promise.all([
      getProviderById(providerId),
      getProviderReviewsForUser(providerId),
    ]).then(([prov, revs]) => {
      setProvider(prov);
      setReviews(revs);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><Text style={styles.errorText}>Provider not found</Text></View>
      </SafeAreaView>
    );
  }

  const pp = provider.provider_profile;
  const isOwnProfile = user?.id === provider.user_id;
  const trustScore = pp?.trust_score ?? computeTrustScore(provider, pp, reviews);
  const trustBreakdown = computeTrustBreakdown(provider, pp, reviews);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => (navigation as any).navigate('PublicProfile', {
                userId: provider.user_id,
                username: provider.username ?? undefined,
              })}
            >
              <Ionicons name="person-outline" size={18} color={Colors.primary} />
              <Text style={styles.editText}>Public Page</Text>
            </TouchableOpacity>
            {isOwnProfile && (
              <TouchableOpacity style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Avatar uri={provider.avatar_url} name={provider.full_name} size={88} showOnlineIndicator isOnline={pp?.is_available} />
          <Text style={styles.name}>{provider.full_name}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={pp?.rating ?? 0} size={16} />
            <Text style={styles.ratingText}>{(pp?.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({pp?.review_count ?? 0} reviews)</Text>
          </View>
          <View style={styles.heroBadgeRow}>
            <View style={styles.availBadge}>
              <View style={[styles.availDot, { backgroundColor: pp?.is_available ? Colors.success : Colors.muted }]} />
              <Text style={[styles.availText, { color: pp?.is_available ? Colors.success : Colors.muted }]}>
                {pp?.is_available ? 'Available Now' : 'Currently Unavailable'}
              </Text>
            </View>
            <TrustBadge score={trustScore} size="sm" />
            <TrustLevelBadge score={trustScore} size="sm" />
          </View>
        </View>

        {/* Trust signals */}
        {pp && (
          <View style={styles.signalBarWrap}>
            <TrustSignalBar
              layout="scroll"
              size="md"
              signals={{
                trustScore,
                reviewCount: pp.review_count,
                completionRate: (pp as any).completion_rate,
                repeatClientRate: (pp as any).repeat_client_rate,
                completedBookings: (pp as any).completed_bookings,
                totalBookings: (pp as any).total_bookings,
              }}
            />
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {pp?.hourly_rate && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(pp.hourly_rate)}</Text>
              <Text style={styles.statLabel}>per hour</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pp?.radius_km ?? 10} km</Text>
            <Text style={styles.statLabel}>service radius</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pp?.review_count ?? 0}</Text>
            <Text style={styles.statLabel}>jobs done</Text>
          </View>
        </View>

        {/* Bio */}
        {pp?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{pp.bio}</Text>
          </View>
        )}

        {/* Skills */}
        {pp?.skills && pp.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsWrap}>
              {pp.skills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
          </Text>

          {/* Rating summary hero */}
          <RatingSummary
            rating={pp?.rating ?? 0}
            reviewCount={pp?.review_count ?? 0}
            reviews={reviews}
          />

          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons name="star-outline" size={28} color={Colors.muted} />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSub}>Reviews appear after completed jobs</Text>
            </View>
          ) : (
            <>
              {reviews.slice(0, visibleCount).map((rev) => (
                <ReviewCard key={rev.id} review={rev} />
              ))}
              {visibleCount < reviews.length && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                >
                  <Text style={styles.loadMoreText}>
                    Show more reviews ({reviews.length - visibleCount} remaining)
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Verification Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <VerificationBadges profile={provider} />
        </View>

        {/* Trust Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trust Score</Text>
          <TrustScoreCard breakdown={trustBreakdown} />
        </View>

        {/* Trust Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trust Level</Text>
          <TrustLevelCard score={trustScore} />
        </View>

        {/* CTA */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={styles.hireCta}
            onPress={() => navigation.navigate('PostRequest', {})}
            activeOpacity={0.9}
          >
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={styles.hireCtaText}>Post a Request for {provider.full_name.split(' ')[0]}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.muted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.primaryLight },
  editText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  hero: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: 10 },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  reviewCount: { fontSize: 13, color: Colors.muted },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.card, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, backgroundColor: Colors.card, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.muted },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  bio: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  signalBarWrap: { paddingHorizontal: Spacing.lg, marginTop: -4, marginBottom: Spacing.sm },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full },
  skillText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  noReviews: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  noReviewsText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
  noReviewsSub: { fontSize: 12, color: Colors.muted },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  hireCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, paddingVertical: 16, ...Shadow.md },
  hireCtaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
