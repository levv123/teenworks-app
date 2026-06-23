import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Shadow, Spacing } from '../../utils/colors';
import { StarRating } from '../../components/StarRating';
import { Avatar } from '../../components/Avatar';
import { ReviewCard as SharedReviewCard } from '../../components/ReviewCard';
import { RatingSummary } from '../../components/RatingSummary';
import { getProfileById } from '../../api/profiles';
import { getPortfolioForUser } from '../../api/portfolio';
import { getReviewsForUser } from '../../api/reviews';
import { createDirectBookingForService } from '../../api/bookings';
import { isServiceSaved, saveService, unsaveService } from '../../api/saved';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo } from '../../utils/helpers';
import { computeTrustBreakdown, computeTrustScore, trustLabel } from '../../utils/trust';
import { recordRecentlyViewed } from '../../utils/recentlyViewed';
import { TrustBadge } from '../../components/TrustBadge';
import { TrustScoreCard } from '../../components/TrustScoreCard';
import { VerificationBadges } from '../../components/VerificationBadges';
import { TrustSignalBar } from '../../components/TrustSignalBar';
import {
  PortfolioItem,
  PublicProfile,
  Review,
  ServicePackage,
  ServicesStackParamList,
} from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_VISIBLE_REVIEWS = 3;

const PKG_COLORS: Record<string, string> = {
  Basic: '#6B7280',
  Standard: Colors.primary,
  Premium: '#F59E0B',
};

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServiceDetail'>;

export function ServiceDetailScreen({ route, navigation }: Props) {
  const { service } = route.params;
  const { user } = useAuth();
  const isOwnService = user?.id === service.provider_id;

  // Data
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolioExamples, setPortfolioExamples] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [heroIndex, setHeroIndex] = useState(0);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  // Package selection
  const hasPackages = (service.packages ?? []).length > 0;
  const [selectedPkgIdx, setSelectedPkgIdx] = useState(0);
  const selectedPkg: ServicePackage | null = hasPackages
    ? (service.packages ?? [])[selectedPkgIdx] ?? null
    : null;
  const hirePrice = selectedPkg?.price ?? service.starting_price;

  // Hire Now sheet
  const [hireSheetVisible, setHireSheetVisible] = useState(false);
  const [hireNote, setHireNote] = useState('');
  const [hiring, setHiring] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  const isClient = user?.profile?.role === 'client';

  // Record this service as recently viewed
  useEffect(() => {
    recordRecentlyViewed(service);
  }, [service.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      try {
        const [prof, revs, portfolio] = await Promise.all([
          getProfileById(service.provider_id),
          getReviewsForUser(service.provider_id),
          service.portfolio_examples.length > 0
            ? getPortfolioForUser(service.provider_id)
            : Promise.resolve([] as PortfolioItem[]),
        ]);
        setProfile(prof);
        setReviews(revs);
        setPortfolioExamples(
          portfolio.filter((p) => service.portfolio_examples.includes(p.id)),
        );
        if (user?.id) {
          const alreadySaved = await isServiceSaved(user.id, service.id);
          setSaved(alreadySaved);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [service.provider_id, service.id, user?.id]);

  // Prefer DB trust_score from joined provider_profile, fall back to client compute
  const trustScore: number | null = profile
    ? (service.provider_profile?.trust_score
       ?? computeTrustScore(profile, profile.provider_profile ?? null, reviews))
    : null;
  const trust = trustScore !== null ? trustLabel(trustScore) : null;
  const trustBreakdown = profile
    ? computeTrustBreakdown(profile, profile.provider_profile ?? null, reviews)
    : null;

  const heroImages = service.images ?? [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, MAX_VISIBLE_REVIEWS);

  // ── Save toggle ───────────────────────────────────────────────
  const handleSaveToggle = async () => {
    if (!user?.id) return;
    setSavingToggle(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) {
        await saveService(user.id, service.id);
      } else {
        await unsaveService(user.id, service.id);
      }
    } catch {
      setSaved(!next); // revert
      Alert.alert('Error', 'Could not update saved services.');
    } finally {
      setSavingToggle(false);
    }
  };

  // ── Hire Now sheet ────────────────────────────────────────────
  const openHireSheet = () => {
    setHireSheetVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeHireSheet = () => {
    Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }).start(() =>
      setHireSheetVisible(false),
    );
  };

  const handleConfirmHire = async () => {
    if (!user?.id) return;
    setHiring(true);
    try {
      const booking = await createDirectBookingForService(
      service,
      user.id,
      hireNote.trim(),
      selectedPkg?.name,
      selectedPkg?.price,
    );
      closeHireSheet();
      navigation.navigate('Booking', { bookingId: booking.id });
    } catch {
      Alert.alert('Error', 'Could not create booking. Please try again.');
    } finally {
      setHiring(false);
    }
  };

  // ── FAQ ───────────────────────────────────────────────────────
  const toggleFaq = (i: number) =>
    setFaqOpen((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{service.title}</Text>
        {!isOwnService && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleSaveToggle}
            disabled={savingToggle}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={22}
              color={saved ? Colors.error : Colors.muted}
            />
          </TouchableOpacity>
        )}
        {isOwnService && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('CreateEditService', { service })}
          >
            <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Hero gallery ───────────────────────────────────────── */}
        {heroImages.length > 0 ? (
          <View>
            <FlatList
              data={heroImages}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
              }
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
              )}
            />
            {heroImages.length > 1 && (
              <View style={styles.dots}>
                {heroImages.map((_, i) => (
                  <View key={i} style={[styles.dot, i === heroIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="briefcase-outline" size={52} color={Colors.primary} />
            {service.category && (
              <Text style={styles.heroPlaceholderText}>
                {service.category.icon}  {service.category.name}
              </Text>
            )}
          </View>
        )}

        {/* ── Title + rating ─────────────────────────────────────── */}
        <View style={styles.section}>
          {service.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>
                {service.category.icon}  {service.category.name}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{service.title}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={service.rating} size={16} />
            <Text style={styles.ratingNum}>
              {service.review_count > 0 ? service.rating.toFixed(1) : 'New service'}
            </Text>
            {service.review_count > 0 && (
              <Text style={styles.reviewCountText}>· {service.review_count} reviews</Text>
            )}
          </View>
        </View>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBox
            icon="pricetag-outline"
            label={hasPackages ? 'From' : 'Starting at'}
            value={
              hasPackages
                ? `$${Math.min(...(service.packages ?? []).map((p) => p.price))}`
                : `$${service.starting_price}`
            }
            valueColor={Colors.primary}
          />
          <View style={styles.statDivider} />
          <StatBox
            icon="time-outline"
            label="Delivery"
            value={`${service.delivery_days} Day${service.delivery_days !== 1 ? 's' : ''}`}
          />
          {trustScore !== null && (
            <>
              <View style={styles.statDivider} />
              <StatBox
                icon={(trust?.icon ?? 'shield-outline') as any}
                label="Trust Score"
                value={String(trustScore)}
                valueColor={trust?.color}
              />
            </>
          )}
        </View>

        {/* ── Trust badge ────────────────────────────────────────── */}
        {trustScore !== null && trust !== null && (
          <View style={[styles.trustBanner, { backgroundColor: trust.bg }]}>
            <Ionicons name={trust.icon as any} size={15} color={trust.color} />
            <Text style={[styles.trustBannerText, { color: trust.color }]}>
              {trust.label} · Trust Score {trustScore}/100
            </Text>
          </View>
        )}

        {/* ── Trust signals strip ─────────────────────────────────── */}
        {profile?.provider_profile && (
          <View style={styles.signalBarWrap}>
            <TrustSignalBar
              layout="scroll"
              size="md"
              signals={{
                trustScore,
                reviewCount: profile.provider_profile.review_count,
                completionRate: (profile.provider_profile as any).completion_rate,
                repeatClientRate: (profile.provider_profile as any).repeat_client_rate,
                completedBookings: (profile.provider_profile as any).completed_bookings,
                totalBookings: (profile.provider_profile as any).total_bookings,
              }}
            />
          </View>
        )}

        {/* ── Pricing / Packages ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          {hasPackages ? (
            <View style={styles.packagesWrap}>
              {/* Tier tab strip */}
              <View style={styles.pkgTabStrip}>
                {(service.packages ?? []).map((pkg, idx) => {
                  const active = idx === selectedPkgIdx;
                  const tierColor = PKG_COLORS[pkg.name] ?? Colors.primary;
                  return (
                    <TouchableOpacity
                      key={pkg.name}
                      style={[
                        styles.pkgTab,
                        active && { borderColor: tierColor, backgroundColor: tierColor + '15' },
                      ]}
                      onPress={() => setSelectedPkgIdx(idx)}
                    >
                      <Text style={[styles.pkgTabName, active && { color: tierColor }]}>
                        {pkg.name}
                      </Text>
                      <Text style={[styles.pkgTabPrice, active && { color: tierColor }]}>
                        ${pkg.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected package details */}
              {selectedPkg && (
                <View style={styles.pkgDetail}>
                  <View style={styles.pricingRow}>
                    <View style={styles.pricingLabelRow}>
                      <Ionicons name="pricetag-outline" size={14} color={Colors.muted} />
                      <Text style={styles.pricingLabel}>Price</Text>
                    </View>
                    <Text style={[styles.pricingValue, { color: PKG_COLORS[selectedPkg.name] ?? Colors.primary }]}>
                      ${selectedPkg.price}
                    </Text>
                  </View>
                  <View style={styles.pricingDivider} />
                  <View style={styles.pricingRow}>
                    <View style={styles.pricingLabelRow}>
                      <Ionicons name="time-outline" size={14} color={Colors.muted} />
                      <Text style={styles.pricingLabel}>Delivery</Text>
                    </View>
                    <Text style={styles.pricingValue}>
                      {selectedPkg.delivery_days} day{selectedPkg.delivery_days !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {selectedPkg.features.length > 0 && (
                    <>
                      <View style={styles.pricingDivider} />
                      <View style={styles.pkgFeaturesWrap}>
                        {selectedPkg.features.map((feat, fi) => (
                          <View key={fi} style={styles.pkgFeatureItem}>
                            <Ionicons
                              name="checkmark-circle"
                              size={15}
                              color={PKG_COLORS[selectedPkg.name] ?? Colors.primary}
                            />
                            <Text style={styles.pkgFeatureText}>{feat}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.pricingCta,
                      { backgroundColor: PKG_COLORS[selectedPkg.name] ?? Colors.primary },
                    ]}
                    onPress={isOwnService ? undefined : openHireSheet}
                    disabled={isOwnService}
                  >
                    <Text style={styles.pricingCtaText}>
                      {isOwnService
                        ? 'Your Service'
                        : `Get ${selectedPkg.name} · $${selectedPkg.price}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.pricingCard}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Base price</Text>
                <Text style={styles.pricingValue}>${service.starting_price}</Text>
              </View>
              <View style={styles.pricingDivider} />
              <View style={styles.pricingRow}>
                <View style={styles.pricingLabelRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.muted} />
                  <Text style={styles.pricingLabel}>Delivery time</Text>
                </View>
                <Text style={styles.pricingValue}>
                  {service.delivery_days} day{service.delivery_days !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.pricingDivider} />
              <View style={styles.pricingRow}>
                <View style={styles.pricingLabelRow}>
                  <Ionicons name="refresh-outline" size={14} color={Colors.muted} />
                  <Text style={styles.pricingLabel}>Revisions</Text>
                </View>
                <Text style={styles.pricingValue}>Negotiable</Text>
              </View>
              <TouchableOpacity
                style={styles.pricingCta}
                onPress={isOwnService ? undefined : openHireSheet}
                disabled={isOwnService}
              >
                <Text style={styles.pricingCtaText}>
                  {isOwnService ? 'Your Service' : `Hire for $${service.starting_price}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Description ────────────────────────────────────────── */}
        {service.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Service</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>
        ) : null}

        {/* ── Portfolio examples ─────────────────────────────────── */}
        {portfolioExamples.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Examples</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioRow}>
              {portfolioExamples.map((item) => (
                <View key={item.id} style={styles.portfolioTile}>
                  {item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={styles.portfolioImg} />
                  ) : (
                    <View style={[styles.portfolioImg, styles.portfolioPlaceholder]}>
                      <Ionicons
                        name={item.file_type === 'pdf' ? 'document-outline' : 'image-outline'}
                        size={22}
                        color={Colors.muted}
                      />
                    </View>
                  )}
                  <Text style={styles.portfolioTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.portfolioCategory} numberOfLines={1}>{item.category}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── FAQ ────────────────────────────────────────────────── */}
        {service.faq.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            {service.faq.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.faqItem}
                onPress={() => toggleFaq(i)}
                activeOpacity={0.85}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={faqOpen[i] ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.muted}
                  />
                </View>
                {faqOpen[i] && <Text style={styles.faqAnswer}>{item.answer}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Reviews ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
            </Text>
          </View>

          {/* Rating summary with distribution bars */}
          <RatingSummary
            rating={service.rating}
            reviewCount={service.review_count}
            reviews={reviews}
          />

          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons name="star-outline" size={32} color={Colors.border} />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSub}>Be the first to hire and review</Text>
            </View>
          ) : (
            <>
              {visibleReviews.map((review) => (
                <SharedReviewCard key={review.id} review={review} />
              ))}
              {reviews.length > MAX_VISIBLE_REVIEWS && (
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => setShowAllReviews((v) => !v)}
                >
                  <Text style={styles.seeAllText}>
                    {showAllReviews
                      ? 'Show fewer reviews'
                      : `See all ${reviews.length} reviews`}
                  </Text>
                  <Ionicons
                    name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* ── Trust Score breakdown ──────────────────────────────── */}
        {trustBreakdown !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trust Score</Text>
            <TrustScoreCard breakdown={trustBreakdown} />
          </View>
        )}

        {/* ── Worker profile ─────────────────────────────────────── */}
        {loading ? (
          <ActivityIndicator style={{ marginVertical: Spacing.lg }} color={Colors.primary} />
        ) : profile ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Worker</Text>
            <View style={styles.workerCard}>
              {/* Top row */}
              <View style={styles.workerTop}>
                <Avatar uri={profile.avatar_url} name={profile.full_name} size={60} />
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{profile.full_name}</Text>
                  {profile.provider_profile && (
                    <View style={styles.workerRatingRow}>
                      <StarRating rating={profile.provider_profile.rating} size={13} />
                      <Text style={styles.workerRating}>
                        {profile.provider_profile.rating.toFixed(1)}
                      </Text>
                      <Text style={styles.workerReviewCount}>
                        ({profile.provider_profile.review_count} reviews)
                      </Text>
                    </View>
                  )}
                  <Text style={styles.workerMember}>
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>

              {/* Bio */}
              {profile.provider_profile?.bio && (
                <Text style={styles.workerBio}>{profile.provider_profile.bio}</Text>
              )}

              {/* Skills */}
              {profile.provider_profile?.skills && profile.provider_profile.skills.length > 0 && (
                <View style={styles.skillsRow}>
                  {profile.provider_profile.skills.map((s) => (
                    <View key={s} style={styles.skillChip}>
                      <Text style={styles.skillText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Trust signals in worker card */}
              {profile.provider_profile && (
                <TrustSignalBar
                  layout="wrap"
                  size="sm"
                  signals={{
                    trustScore,
                    reviewCount: profile.provider_profile.review_count,
                    completionRate: (profile.provider_profile as any).completion_rate,
                    repeatClientRate: (profile.provider_profile as any).repeat_client_rate,
                    completedBookings: (profile.provider_profile as any).completed_bookings,
                    totalBookings: (profile.provider_profile as any).total_bookings,
                  }}
                />
              )}

              {/* Verification badges */}
              <VerificationBadges profile={profile} compact showScore={false} />

              {/* View profile button */}
              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => navigation.navigate('ProviderProfile', { providerId: service.provider_id })}
              >
                <Text style={styles.viewProfileText}>View Full Profile</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Sticky CTA bar ─────────────────────────────────────── */}
      {!isOwnService && (
        <View style={styles.ctaBar}>
          {/* Save */}
          <TouchableOpacity
            style={styles.ctaIconBtn}
            onPress={handleSaveToggle}
            disabled={savingToggle}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={22}
              color={saved ? Colors.error : Colors.muted}
            />
            <Text style={[styles.ctaIconLabel, saved && { color: Colors.error }]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          {/* Request Service */}
          <TouchableOpacity
            style={styles.ctaSecondaryBtn}
            onPress={() => navigation.navigate('RequestService', { service })}
          >
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            <Text style={styles.ctaSecondaryText}>Request</Text>
          </TouchableOpacity>

          {/* Hire Now */}
          <TouchableOpacity style={styles.ctaPrimaryBtn} onPress={openHireSheet}>
            <Ionicons name="flash" size={16} color={Colors.card} />
            <Text style={styles.ctaPrimaryText}>Hire Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Hire Now bottom sheet ──────────────────────────────── */}
      <Modal visible={hireSheetVisible} transparent animationType="none" onRequestClose={closeHireSheet}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeHireSheet} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Confirm Hire</Text>

            {/* Service summary */}
            <View style={styles.sheetServiceRow}>
              {service.images?.[0] ? (
                <Image source={{ uri: service.images[0] }} style={styles.sheetThumb} />
              ) : (
                <View style={[styles.sheetThumb, styles.sheetThumbPlaceholder]}>
                  <Ionicons name="briefcase-outline" size={18} color={Colors.primary} />
                </View>
              )}
              <View style={styles.sheetServiceInfo}>
                <Text style={styles.sheetServiceTitle} numberOfLines={2}>{service.title}</Text>
                <Text style={styles.sheetServiceMeta}>
                  {selectedPkg ? `${selectedPkg.name}  ·  ` : ''}${hirePrice}  ·  {selectedPkg?.delivery_days ?? service.delivery_days} day{(selectedPkg?.delivery_days ?? service.delivery_days) !== 1 ? 's' : ''}  delivery
                </Text>
              </View>
            </View>

            {/* Pricing breakdown */}
            <View style={styles.sheetPricing}>
              <View style={styles.sheetPricingRow}>
                <Text style={styles.sheetPricingLabel}>
                  {selectedPkg ? `${selectedPkg.name} Package` : 'Service price'}
                </Text>
                <Text style={styles.sheetPricingValue}>${hirePrice}</Text>
              </View>
              <View style={styles.sheetPricingRow}>
                <Text style={styles.sheetPricingLabel}>Platform fee</Text>
                <Text style={styles.sheetPricingValue}>$0</Text>
              </View>
              <View style={[styles.sheetPricingRow, styles.sheetPricingTotal]}>
                <Text style={styles.sheetPricingTotalLabel}>Total due</Text>
                <Text style={styles.sheetPricingTotalValue}>${hirePrice}</Text>
              </View>
            </View>

            {/* Note to worker */}
            <View style={styles.sheetNoteWrap}>
              <Text style={styles.sheetNoteLabel}>Message to worker (optional)</Text>
              <TextInput
                style={styles.sheetNoteInput}
                value={hireNote}
                onChangeText={setHireNote}
                placeholder="Describe your project, timeline, or any special requests…"
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={3}
                maxLength={400}
                textAlignVertical="top"
              />
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.sheetConfirmBtn, hiring && styles.sheetConfirmBtnDisabled]}
              onPress={handleConfirmHire}
              disabled={hiring}
            >
              {hiring ? (
                <ActivityIndicator color={Colors.card} />
              ) : (
                <>
                  <Ionicons name="flash" size={18} color={Colors.card} />
                  <Text style={styles.sheetConfirmText}>Confirm Hire · ${hirePrice}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.sheetDisclaimer}>
              No payment is charged now. The worker confirms availability first.
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatBox({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={14} color={Colors.muted} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}


function VerificationBadge({
  icon,
  label,
  verified,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  verified: boolean;
}) {
  return (
    <View style={[styles.badge, !verified && styles.badgeUnverified]}>
      <Ionicons
        name={`${icon}${verified ? '' : '-outline'}` as keyof typeof Ionicons.glyphMap}
        size={13}
        color={verified ? Colors.success : Colors.muted}
      />
      <Text style={[styles.badgeText, !verified && styles.badgeTextUnverified]}>{label}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },

  content: { paddingBottom: Spacing.xxl },

  // Gallery
  heroImage: { width: SCREEN_W, height: 240 },
  dots: {
    position: 'absolute',
    bottom: Spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.card, width: 16 },
  heroPlaceholder: {
    height: 180,
    backgroundColor: Colors.primaryLight + '44',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  heroPlaceholderText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

  // Section
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  // Title block
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  categoryPillText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, lineHeight: 30 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingNum: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reviewCountText: { fontSize: 13, color: Colors.muted },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 3 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  statLabel: {
    fontSize: 9,
    color: Colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text },

  // Trust banner
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  trustBannerText: { fontSize: 13, fontWeight: '600' },
  signalBarWrap: { marginHorizontal: Spacing.md, marginTop: Spacing.sm },

  // Packages
  packagesWrap: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    ...Shadow.sm,
  },
  pkgTabStrip: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pkgTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pkgTabName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pkgTabPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.muted,
    marginTop: 1,
  },
  pkgDetail: {
    padding: Spacing.md,
    gap: 0,
  },
  pkgFeaturesWrap: {
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  pkgFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pkgFeatureText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Pricing card
  pricingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  pricingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pricingLabel: { fontSize: 14, color: Colors.textSecondary },
  pricingValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  pricingDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  pricingCta: {
    margin: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    ...Shadow.sm,
  },
  pricingCtaText: { color: Colors.card, fontWeight: '700', fontSize: 15 },

  // Description
  description: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },

  // Portfolio
  portfolioRow: { gap: Spacing.sm },
  portfolioTile: { width: 110, gap: 3 },
  portfolioImg: {
    width: 110,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
  portfolioPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  portfolioTitle: { fontSize: 11, fontWeight: '600', color: Colors.text },
  portfolioCategory: { fontSize: 10, color: Colors.muted },

  // FAQ
  faqItem: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  faqAnswer: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  // Reviews
  noReviews: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noReviewsText: { fontSize: 15, fontWeight: '600', color: Colors.muted },
  noReviewsSub: { fontSize: 12, color: Colors.muted },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  seeAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Worker card
  workerCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  workerTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  workerInfo: { flex: 1, gap: 3 },
  workerName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  workerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workerRating: { fontSize: 13, fontWeight: '600', color: Colors.text },
  workerReviewCount: { fontSize: 12, color: Colors.muted },
  workerMember: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  workerBio: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  skillChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  skillText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.success + '44',
  },
  badgeUnverified: {
    backgroundColor: Colors.border,
    borderColor: 'transparent',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.success },
  badgeTextUnverified: { color: Colors.muted },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  viewProfileText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // CTA bar
  ctaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.lg,
  },
  ctaIconBtn: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
  },
  ctaIconLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted },
  ctaSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ctaSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  ctaPrimaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  ctaPrimaryText: { fontSize: 14, fontWeight: '700', color: Colors.card },

  // Hire Now sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.lg,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  sheetServiceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  sheetThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
  sheetThumbPlaceholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetServiceInfo: { flex: 1, gap: 3 },
  sheetServiceTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, lineHeight: 19 },
  sheetServiceMeta: { fontSize: 12, color: Colors.muted },
  sheetPricing: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sheetPricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetPricingLabel: { fontSize: 13, color: Colors.muted },
  sheetPricingValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  sheetPricingTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sheetPricingTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sheetPricingTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  sheetNoteWrap: { gap: 6 },
  sheetNoteLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  sheetNoteInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
  },
  sheetConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  sheetConfirmBtnDisabled: { opacity: 0.6 },
  sheetConfirmText: { fontSize: 16, fontWeight: '700', color: Colors.card },
  sheetDisclaimer: {
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
