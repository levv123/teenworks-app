import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { getProfileByUsername, getProfileById } from '../../api/profiles';
import { getProviderReviewsForUser, getClientReviewsForUser } from '../../api/reviews';
import { getServicesForProvider } from '../../api/services';
import { getPortfolioForUser } from '../../api/portfolio';
import { getProofItemsForUser } from '../../api/proof';
import { PortfolioGrid } from '../../components/PortfolioGrid';
import { ProofWall } from '../../components/ProofWall';
import { ReviewCard } from '../../components/ReviewCard';
import { RatingSummary } from '../../components/RatingSummary';
import { CategoryAveragesPanel, computeCategoryAverages } from '../../components/CategoryRatingsBar';
import { PublicProfile, PortfolioItem, ProofItem, ProviderService, Review } from '../../types';
import { formatCurrency, timeAgo } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { computeTrustBreakdown, computeTrustScore, trustLabel } from '../../utils/trust';
import { TrustScoreCard } from '../../components/TrustScoreCard';
import { TrustLevelBadge } from '../../components/TrustLevelBadge';
import { TrustLevelCard } from '../../components/TrustLevelCard';
import { VerificationBadges } from '../../components/VerificationBadges';
import { TrustSignalBar } from '../../components/TrustSignalBar';

type Props = NativeStackScreenProps<any, 'PublicProfile'>;

const SECTIONS = ['About', 'Services', 'Portfolio', 'Reviews', 'Trust', 'Activity'] as const;
type Section = typeof SECTIONS[number];

export function PublicProfileScreen({ route, navigation }: Props) {
  const { username, userId } = route.params ?? {};
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);        // provider reviews (legacy var, kept for avgRating etc.)
  const [clientReviews, setClientReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [proofItems, setProofItems] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>('About');
  const [reviewTab, setReviewTab] = useState<'provider' | 'client'>('provider');
  const [saved, setSaved] = useState(false);
  const saveAnim = useRef(new Animated.Value(1)).current;
  const stickyAnim = useRef(new Animated.Value(0)).current;
  const heroBottomY = useRef(0);

  const scrollRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Partial<Record<Section, number>>>({});
  const fullPortfolioY = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        let p: PublicProfile | null = null;
        if (username) {
          p = await getProfileByUsername(username);
        } else if (userId) {
          p = await getProfileById(userId);
        }
        if (p) {
          setProfile(p);
          const [provRevs, clientRevs, svcs, port, proof] = await Promise.all([
            getProviderReviewsForUser(p.user_id),
            getClientReviewsForUser(p.user_id),
            getServicesForProvider(p.user_id),
            getPortfolioForUser(p.user_id),
            getProofItemsForUser(p.user_id),
          ]);
          setReviews(provRevs);
          setClientReviews(clientRevs);
          setServices(svcs);
          setPortfolio(port);
          setProofItems(proof);
        }
      } catch (err) {
        console.error('PublicProfile load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, userId]);

  const profileUrl = `https://teenworks.app/${profile?.username ?? profile?.user_id ?? ''}`;
  const isOwnProfile = authUser?.id === profile?.user_id;
  const pp = profile?.provider_profile;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.full_name}'s profile on TeenWorks: ${profileUrl}`,
        url: profileUrl,
        title: `${profile?.full_name} on TeenWorks`,
      });
    } catch {}
  };

  const handleSave = () => {
    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(saveAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
    setSaved((v) => !v);
  };

  const handleContact = () => {
    if (!authUser) {
      Alert.alert('Sign in required', 'Please sign in to contact this worker.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }
    navigation.navigate('App', {
      screen: 'HomeTab',
      params: { screen: 'PostRequest', params: {} },
    });
  };

  const scrollToSection = (section: Section) => {
    setActiveSection(section);
    const y = sectionYRef.current[section];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: y - 56, animated: true });
    }
  };

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;

    // Show sticky CTA once hero buttons scroll off screen
    const shouldShow = heroBottomY.current > 0 && y > heroBottomY.current;
    Animated.timing(stickyAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();

    // Update active section
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const sectionY = sectionYRef.current[SECTIONS[i]];
      if (sectionY != null && y >= sectionY - 80) {
        setActiveSection(SECTIONS[i]);
        break;
      }
    }
  };

  const trustScore = profile
    ? computeTrustScore(profile, pp, reviews)
    : 0;
  const trust = trustLabel(trustScore);
  const trustBreakdown = profile
    ? computeTrustBreakdown(profile, pp ?? null, reviews)
    : null;

  // Rating breakdown
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Build activity feed from available data (only when profile is loaded)
  type ActivityItem = { id: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; text: string; sub: string };
  const activityFeed: ActivityItem[] = (() => {
    if (!profile) return [];
    const items: ActivityItem[] = [];
    const jobCount = pp?.review_count ?? 0;

    // Recent 5-star reviews
    reviews
      .filter((r) => r.rating === 5)
      .slice(0, 3)
      .forEach((r) => {
        items.push({
          id: `rev-${r.id}`,
          icon: 'star',
          color: Colors.warning,
          bg: Colors.warningLight,
          text: 'Received a 5-Star Review',
          sub: r.comment ? `"${r.comment.slice(0, 60)}${r.comment.length > 60 ? '…' : ''}"` : `From ${r.reviewer?.full_name ?? 'a client'} · ${timeAgo(r.created_at)}`,
        });
      });

    // Job milestones
    const milestones = [100, 50, 25, 10, 5, 1];
    for (const m of milestones) {
      if (jobCount >= m) {
        items.push({
          id: `jobs-${m}`,
          icon: 'briefcase',
          color: Colors.primary,
          bg: Colors.primaryLight,
          text: m === 1 ? 'Completed First Job' : `Completed ${m}${jobCount > m ? '+' : ''} Jobs`,
          sub: `${jobCount} total jobs on TeenWorks`,
        });
        break;
      }
    }

    // Trust score milestones
    const trustMilestones = [{ score: 90, label: '90' }, { score: 75, label: '75' }, { score: 50, label: '50' }];
    for (const { score, label } of trustMilestones) {
      if (trustScore >= score) {
        items.push({
          id: `trust-${score}`,
          icon: 'shield-checkmark',
          color: Colors.success,
          bg: Colors.successLight,
          text: `Reached Trust Score ${label}`,
          sub: `Current trust score: ${trustScore}/100`,
        });
        break;
      }
    }

    // Verification achievements
    if (profile.identity_verified) {
      items.push({
        id: 'identity',
        icon: 'id-card',
        color: Colors.info,
        bg: Colors.infoLight,
        text: 'Identity Verified',
        sub: 'ID verified by TeenWorks',
      });
    }
    if (profile.parent_approved) {
      items.push({
        id: 'parent',
        icon: 'people',
        color: Colors.info,
        bg: Colors.infoLight,
        text: 'Parent Approved',
        sub: 'Parental consent on file',
      });
    }
    if (profile.verified_professional) {
      items.push({
        id: 'pro',
        icon: 'ribbon',
        color: Colors.primary,
        bg: Colors.primaryLight,
        text: 'Verified Professional',
        sub: 'Skills verified by TeenWorks',
      });
    }

    // High average rating
    if (reviews.length >= 3 && avgRating >= 4.8) {
      items.push({
        id: 'toprated',
        icon: 'trophy',
        color: Colors.warning,
        bg: Colors.warningLight,
        text: 'Top Rated Worker',
        sub: `${avgRating.toFixed(1)} average across ${reviews.length} reviews`,
      });
    }

    // Profile completeness
    if (pp?.bio && pp?.skills?.length && pp?.hourly_rate) {
      items.push({
        id: 'complete',
        icon: 'checkmark-circle',
        color: Colors.success,
        bg: Colors.successLight,
        text: 'Profile 100% Complete',
        sub: 'Bio, skills, and rate all set',
      });
    }

    // Joined milestone
    items.push({
      id: 'joined',
      icon: 'calendar',
      color: Colors.muted,
      bg: Colors.border,
      text: 'Joined TeenWorks',
      sub: new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    return items.slice(0, 8);
  })();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="person-outline" size={52} color={Colors.muted} />
          <Text style={styles.notFoundTitle}>Profile not found</Text>
          <Text style={styles.notFoundSub}>
            {username ? `@${username}` : 'This user'} doesn't exist yet.
          </Text>
          <TouchableOpacity style={styles.backBtnCenter} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnCenterText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Floating top bar ────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.topBarUrl} numberOfLines={1}>teenworks.app/{profile.username ?? profile.user_id}</Text>

        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Sticky section nav ───────────────────────────── */}
      <View style={styles.sectionNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionNavInner}>
          {SECTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sectionNavItem, activeSection === s && styles.sectionNavItemActive]}
              onPress={() => scrollToSection(s)}
            >
              <Text style={[styles.sectionNavText, activeSection === s && styles.sectionNavTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Main scroll ────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Header ────────────────────────────── */}
        <View
          style={styles.hero}
          onLayout={(e) => {
            heroBottomY.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
          }}
        >
          <Avatar
            uri={profile.avatar_url}
            name={profile.full_name}
            size={96}
            showOnlineIndicator
            isOnline={pp?.is_available ?? false}
          />

          <Text style={styles.heroName}>{profile.full_name}</Text>

          {profile.username && (
            <Text style={styles.heroUsername}>@{profile.username}</Text>
          )}

          {/* City + Member Since */}
          <View style={styles.heroInfoRow}>
            {(profile as any).city && (
              <>
                <Ionicons name="location-outline" size={13} color={Colors.muted} />
                <Text style={styles.heroInfoText}>{(profile as any).city}</Text>
                <Text style={styles.heroInfoDot}>·</Text>
              </>
            )}
            <Ionicons name="calendar-outline" size={13} color={Colors.muted} />
            <Text style={styles.heroInfoText}>
              Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Text>
          </View>

          {/* Trust score + level + availability badges */}
          <View style={styles.heroMeta}>
            <TrustLevelBadge score={trustScore} size="sm" />
            <View style={[styles.trustBadge, { backgroundColor: trust.bg }]}>
              <Ionicons name="shield-checkmark" size={13} color={trust.color} />
              <Text style={[styles.trustBadgeText, { color: trust.color }]}>
                {trustScore}/100
              </Text>
            </View>
            <View style={[
              styles.heroBadge,
              { backgroundColor: pp?.is_available ? Colors.successLight : Colors.border },
            ]}>
              <View style={[styles.availDot, { backgroundColor: pp?.is_available ? Colors.success : Colors.muted }]} />
              <Text style={[styles.heroBadgeText, { color: pp?.is_available ? Colors.success : Colors.muted }]}>
                {pp?.is_available ? 'Available Now' : 'Unavailable'}
              </Text>
            </View>
          </View>

          {/* Trust signals strip */}
          {pp && (
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
          )}

          {/* Quick stats */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <View style={styles.statValRow}>
                <Text style={styles.statVal}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
                {avgRating > 0 && <Ionicons name="star" size={12} color={Colors.warning} />}
              </View>
              <Text style={styles.statLbl}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{reviews.length}</Text>
              <Text style={styles.statLbl}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{pp?.review_count ?? 0}</Text>
              <Text style={styles.statLbl}>Jobs Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{pp?.hourly_rate ? formatCurrency(pp.hourly_rate) : '—'}</Text>
              <Text style={styles.statLbl}>Per Hour</Text>
            </View>
          </View>

          {/* CTA buttons: Contact / Hire / Save */}
          {!isOwnProfile ? (
            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.ctaSecondary} onPress={handleContact} activeOpacity={0.85}>
                <Ionicons name="chatbubble-outline" size={15} color={Colors.primary} />
                <Text style={styles.ctaSecondaryText}>Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ctaPrimary}
                onPress={() => navigation.navigate('App', { screen: 'HomeTab', params: { screen: 'PostRequest', params: {} } })}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={15} color="#fff" />
                <Text style={styles.ctaPrimaryText}>Hire {profile.full_name.split(' ')[0]}</Text>
              </TouchableOpacity>

              <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
                <TouchableOpacity style={styles.ctaIcon} onPress={handleSave} activeOpacity={0.8}>
                  <Ionicons
                    name={saved ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={saved ? Colors.primary : Colors.text}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.ctaPrimary, { alignSelf: 'stretch' }]}
              onPress={() => navigation.navigate('App', { screen: 'ProfileTab' })}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil-outline" size={15} color="#fff" />
              <Text style={styles.ctaPrimaryText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          {/* Profile URL chip */}
          <TouchableOpacity
            style={styles.urlChip}
            onPress={() => Linking.openURL(profileUrl)}
          >
            <Ionicons name="link-outline" size={13} color={Colors.muted} />
            <Text style={styles.urlChipText}>{profileUrl}</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ─────────────────────────────────────── */}
        <View
          style={styles.section}
          onLayout={(e) => { sectionYRef.current['About'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>About</Text>

          {/* Bio */}
          {pp?.bio ? (
            <Text style={styles.bio}>{pp.bio}</Text>
          ) : (
            <Text style={styles.placeholder}>
              {isOwnProfile ? 'Add a bio to tell clients about yourself.' : 'No bio yet.'}
            </Text>
          )}

          {/* Skills */}
          {pp?.skills && pp.skills.length > 0 && (
            <View style={styles.aboutBlock}>
              <View style={styles.aboutBlockHeader}>
                <Ionicons name="sparkles-outline" size={15} color={Colors.primary} />
                <Text style={styles.aboutBlockTitle}>Skills</Text>
              </View>
              <View style={styles.chipWrap}>
                {pp.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Experience + Availability side-by-side cards */}
          {(pp?.experience_years != null || pp?.availability_days != null || pp?.is_available != null) && (
            <View style={styles.aboutCards}>
              {pp?.experience_years != null && (
                <View style={styles.aboutCard}>
                  <View style={styles.aboutCardIcon}>
                    <Ionicons name="briefcase-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.aboutCardValue}>
                    {pp.experience_years === 0
                      ? 'Just starting'
                      : pp.experience_years === 1
                      ? '1 Year'
                      : `${pp.experience_years} Years`}
                  </Text>
                  <Text style={styles.aboutCardLabel}>Experience</Text>
                </View>
              )}

              {pp?.availability_days && pp.availability_days.length > 0 ? (
                <View style={styles.aboutCard}>
                  <View style={styles.aboutCardIcon}>
                    <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.aboutCardValue} numberOfLines={2}>
                    {pp.availability_days.join('\n')}
                  </Text>
                  <Text style={styles.aboutCardLabel}>Availability</Text>
                </View>
              ) : (
                <View style={styles.aboutCard}>
                  <View style={styles.aboutCardIcon}>
                    <Ionicons name="time-outline" size={18} color={pp?.is_available ? Colors.success : Colors.muted} />
                  </View>
                  <Text style={[styles.aboutCardValue, { color: pp?.is_available ? Colors.success : Colors.muted }]}>
                    {pp?.is_available ? 'Now' : 'Unavailable'}
                  </Text>
                  <Text style={styles.aboutCardLabel}>Availability</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Services ──────────────────────────────────── */}
        <View
          style={styles.section}
          onLayout={(e) => { sectionYRef.current['Services'] = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Services</Text>
            {services.length > 0 && (
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{services.length}</Text>
              </View>
            )}
          </View>

          {services.length > 0 ? (
            <View style={styles.serviceCardGrid}>
              {services.map((svc) => (
                <View key={svc.id} style={styles.serviceCard}>
                  {/* Title + price header */}
                  <View style={styles.serviceCardTop}>
                    <View style={styles.serviceCardTitleRow}>
                      <Text style={styles.serviceCardTitle} numberOfLines={2}>{svc.title}</Text>
                    </View>
                    <View style={styles.servicePricePill}>
                      <Text style={styles.servicePriceText}>from {formatCurrency(svc.starting_price)}</Text>
                    </View>
                  </View>

                  {/* Description */}
                  {svc.description && (
                    <Text style={styles.serviceCardDesc} numberOfLines={2}>{svc.description}</Text>
                  )}

                  {/* Stats row */}
                  <View style={styles.serviceStatsRow}>
                    <View style={styles.serviceStat}>
                      <Ionicons name="star" size={13} color={Colors.warning} />
                      <Text style={styles.serviceStatText}>
                        {svc.rating > 0 ? svc.rating.toFixed(1) : '—'}
                        {svc.review_count > 0 && (
                          <Text style={styles.serviceStatMuted}> ({svc.review_count})</Text>
                        )}
                      </Text>
                    </View>
                    <View style={styles.serviceStatDivider} />
                    <View style={styles.serviceStat}>
                      <Ionicons name="time-outline" size={13} color={Colors.muted} />
                      <Text style={styles.serviceStatText}>
                        {svc.delivery_days === 1 ? '1 Day' : `${svc.delivery_days} Day`} Delivery
                      </Text>
                    </View>
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    style={styles.viewServiceBtn}
                    onPress={() => navigation.navigate('App', {
                      screen: 'HomeTab',
                      params: { screen: 'PostRequest', params: {} },
                    })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.viewServiceBtnText}>View Service</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="briefcase-outline" size={36} color={Colors.muted} />
              <Text style={styles.emptySectionText}>
                {isOwnProfile ? 'Add services to show what you offer.' : 'No services listed yet.'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Portfolio Preview ─────────────────────────── */}
        <View
          style={styles.section}
          onLayout={(e) => { sectionYRef.current['Portfolio'] = e.nativeEvent.layout.y; }}
        >
          {/* Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <View style={styles.portfolioCountBadge}>
              <Ionicons name="images-outline" size={13} color={Colors.primary} />
              <Text style={styles.portfolioCountText}>
                {portfolio.length} item{portfolio.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {portfolio.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="images-outline" size={36} color={Colors.muted} />
              <Text style={styles.emptySectionText}>
                {isOwnProfile ? 'Add items to your portfolio.' : 'No portfolio items yet.'}
              </Text>
            </View>
          ) : (
            <>
              {/* Featured work row */}
              {portfolio.filter((i) => i.is_featured).length > 0 && (
                <View style={styles.previewFeaturedBlock}>
                  <View style={styles.previewFeaturedHeader}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.previewFeaturedLabel}>Featured Work</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.previewFeaturedRow}
                  >
                    {portfolio.filter((i) => i.is_featured).map((item, idx) => {
                      const featuredList = portfolio.filter((i) => i.is_featured);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.previewFeaturedCard}
                          onPress={() => navigation.navigate('PortfolioDetail', {
                            items: featuredList,
                            initialIndex: idx,
                            ownerName: profile.full_name,
                            ownerUserId: profile.user_id,
                          })}
                          activeOpacity={0.9}
                        >
                          {item.file_type === 'image' && item.thumbnail_url ? (
                            <Image source={{ uri: item.thumbnail_url }} style={styles.previewFeaturedThumb} resizeMode="cover" />
                          ) : (
                            <View style={[styles.previewFeaturedThumb, { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                              <Ionicons
                                name={item.file_type === 'video' ? 'videocam-outline' : 'document-text-outline'}
                                size={28}
                                color={Colors.primary}
                              />
                            </View>
                          )}
                          <View style={styles.previewFeaturedInfo}>
                            <Text style={styles.previewFeaturedTitle} numberOfLines={2}>{item.title}</Text>
                            <View style={styles.previewFeaturedMeta}>
                              <View style={styles.previewFeaturedStarBadge}>
                                <Ionicons name="star" size={10} color="#F59E0B" />
                                <Text style={styles.previewFeaturedStarText}>Featured</Text>
                              </View>
                              <Text style={styles.previewFeaturedCategory}>{item.category}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* All items thumbnail strip */}
              {portfolio.filter((i) => !i.is_featured).length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.previewThumbRow}
                >
                  {portfolio.filter((i) => !i.is_featured).slice(0, 8).map((item, idx) => {
                    const nonFeatured = portfolio.filter((i) => !i.is_featured);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => navigation.navigate('PortfolioDetail', {
                          items: nonFeatured,
                          initialIndex: idx,
                          ownerName: profile.full_name,
                          ownerUserId: profile.user_id,
                        })}
                        activeOpacity={0.9}
                      >
                        <View style={styles.previewThumb}>
                          {item.file_type === 'image' && item.thumbnail_url ? (
                            <Image source={{ uri: item.thumbnail_url }} style={styles.previewThumbImg} resizeMode="cover" />
                          ) : (
                            <View style={[styles.previewThumbImg, { backgroundColor: item.file_type === 'pdf' ? '#FEE2E2' : '#EDE9FE', alignItems: 'center', justifyContent: 'center' }]}>
                              <Ionicons
                                name={item.file_type === 'video' ? 'videocam-outline' : 'document-text-outline'}
                                size={18}
                                color={item.file_type === 'video' ? '#8B5CF6' : '#EF4444'}
                              />
                            </View>
                          )}
                          {/* +N overflow badge */}
                          {idx === 7 && portfolio.length > 8 && (
                            <View style={styles.previewOverflowBadge}>
                              <Text style={styles.previewOverflowText}>+{portfolio.length - 8}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* View All button */}
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => scrollRef.current?.scrollTo({ y: fullPortfolioY.current - 56, animated: true })}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={15} color={Colors.primary} />
                <Text style={styles.viewAllBtnText}>
                  View All {portfolio.length} Portfolio Item{portfolio.length !== 1 ? 's' : ''}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Reviews ───────────────────────────────────── */}
        <View
          style={styles.section}
          onLayout={(e) => { sectionYRef.current['Reviews'] = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {(reviews.length + clientReviews.length) > 0 && (
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{reviews.length + clientReviews.length}</Text>
              </View>
            )}
          </View>

          {/* Tab switcher — only show if both sides have reviews */}
          {reviews.length > 0 && clientReviews.length > 0 && (
            <View style={styles.reviewTabRow}>
              <TouchableOpacity
                style={[styles.reviewTab, reviewTab === 'provider' && styles.reviewTabActive]}
                onPress={() => setReviewTab('provider')}
              >
                <Ionicons name="briefcase-outline" size={13} color={reviewTab === 'provider' ? Colors.card : Colors.muted} />
                <Text style={[styles.reviewTabText, reviewTab === 'provider' && styles.reviewTabTextActive]}>
                  As Worker ({reviews.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewTab, reviewTab === 'client' && styles.reviewTabActive]}
                onPress={() => setReviewTab('client')}
              >
                <Ionicons name="person-outline" size={13} color={reviewTab === 'client' ? Colors.card : Colors.muted} />
                <Text style={[styles.reviewTabText, reviewTab === 'client' && styles.reviewTabTextActive]}>
                  As Client ({clientReviews.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Provider reviews panel */}
          {(reviewTab === 'provider' || clientReviews.length === 0) && (
            <ReviewPanel
              reviews={reviews}
              avgRating={avgRating}
              emptyText={isOwnProfile ? 'Complete jobs to start earning reviews.' : 'No reviews as a worker yet.'}
              isProvider
            />
          )}

          {/* Client reviews panel */}
          {(reviewTab === 'client' || (clientReviews.length > 0 && reviews.length === 0)) && (
            <ReviewPanel
              reviews={clientReviews}
              avgRating={clientReviews.length ? clientReviews.reduce((s, r) => s + r.rating, 0) / clientReviews.length : 0}
              emptyText={isOwnProfile ? 'Workers will review you after completed jobs.' : 'No client reviews yet.'}
              isProvider={false}
            />
          )}
        </View>

        {/* ── Trust & Verification ──────────────────────── */}
        <View
          style={styles.section}
          onLayout={(e) => { sectionYRef.current['Trust'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>Trust & Verification</Text>

          {/* Trust level card */}
          <TrustLevelCard score={trustScore} />

          {/* Trust score breakdown */}
          {trustBreakdown !== null && (
            <TrustScoreCard breakdown={trustBreakdown} />
          )}

          {/* Verification badges */}
          <VerificationBadges profile={profile} showScore={false} />
        </View>

        {/* ── Portfolio (full grid) ─────────────────────── */}
        <View
          style={styles.section}
          onLayout={(e) => { fullPortfolioY.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>All Portfolio Items</Text>
            {portfolio.length > 0 && (
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{portfolio.length}</Text>
              </View>
            )}
          </View>
          <PortfolioGrid
            items={portfolio}
            userId={profile.user_id}
            isOwner={isOwnProfile}
            ownerName={profile.full_name}
            navigation={navigation}
            onItemsChange={setPortfolio}
          />

          {/* Divider */}
          {(proofItems.length > 0 || isOwnProfile) && (
            <View style={styles.proofDivider} />
          )}

          <ProofWall
            items={proofItems}
            userId={profile.user_id}
            isOwner={isOwnProfile}
            onItemsChange={setProofItems}
          />
        </View>

        {/* ── Activity ──────────────────────────────────── */}
        <View
          style={[styles.section, { marginBottom: Spacing.xxl }]}
          onLayout={(e) => { sectionYRef.current['Activity'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>Activity</Text>

          {/* Summary chips */}
          <View style={styles.activityStats}>
            <View style={styles.activityStatChip}>
              <Text style={styles.activityStatVal}>{pp?.review_count ?? 0}</Text>
              <Text style={styles.activityStatLbl}>Jobs Done</Text>
            </View>
            <View style={styles.activityStatChip}>
              <Text style={styles.activityStatVal}>{reviews.length}</Text>
              <Text style={styles.activityStatLbl}>Reviews</Text>
            </View>
            <View style={styles.activityStatChip}>
              <Text style={styles.activityStatVal}>{avgRating > 0 ? `${avgRating.toFixed(1)}★` : '—'}</Text>
              <Text style={styles.activityStatLbl}>Avg Rating</Text>
            </View>
            <View style={styles.activityStatChip}>
              <Text style={styles.activityStatVal}>{trustScore}</Text>
              <Text style={styles.activityStatLbl}>Trust Score</Text>
            </View>
          </View>

          {/* Timeline feed */}
          <View style={styles.timeline}>
            {activityFeed.map((item, idx) => (
              <View key={item.id} style={styles.timelineRow}>
                {/* Left: icon + connector line */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  {idx < activityFeed.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Right: text */}
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineText}>{item.text}</Text>
                  <Text style={styles.timelineSub} numberOfLines={2}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky hire CTA ─────────────────────────────── */}
      {!isOwnProfile && profile && (
        <Animated.View
          style={[
            styles.stickyBar,
            {
              opacity: stickyAnim,
              transform: [{ translateY: stickyAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
          pointerEvents={stickyAnim as any}
        >
          <Text style={styles.stickyTitle} numberOfLines={1}>
            Ready to work with {profile.full_name.split(' ')[0]}?
          </Text>
          <View style={styles.stickyBtns}>
            <TouchableOpacity
              style={styles.stickyBtnPrimary}
              onPress={() => navigation.navigate('App', { screen: 'HomeTab', params: { screen: 'PostRequest', params: {} } })}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={15} color="#fff" />
              <Text style={styles.stickyBtnPrimaryText}>Hire Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stickyBtnSecondary}
              onPress={handleContact}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={15} color={Colors.primary} />
              <Text style={styles.stickyBtnSecondaryText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stickyBtnSecondary}
              onPress={() => scrollToSection('Services')}
              activeOpacity={0.85}
            >
              <Ionicons name="briefcase-outline" size={15} color={Colors.primary} />
              <Text style={styles.stickyBtnSecondaryText}>Services</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── ReviewPanel sub-component ─────────────────────────────────

function ReviewPanel({
  reviews,
  avgRating,
  emptyText,
  isProvider,
}: {
  reviews: Review[];
  avgRating: number;
  emptyText: string;
  isProvider: boolean;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const INITIAL = 3;
  const catAverages = React.useMemo(() => computeCategoryAverages(reviews), [reviews]);
  const visible = showAll ? reviews : reviews.slice(0, INITIAL);

  if (reviews.length === 0) {
    return (
      <View style={rpStyles.empty}>
        <Ionicons name={isProvider ? 'briefcase-outline' : 'person-outline'} size={36} color={Colors.muted} />
        <Text style={rpStyles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  // Featured quote (first review with a comment)
  const featured = reviews.find((r) => r.comment && r.comment.trim().length > 20);

  return (
    <View style={rpStyles.wrap}>
      {/* Rating summary hero */}
      <RatingSummary rating={avgRating} reviewCount={reviews.length} reviews={reviews} />

      {/* Featured quote */}
      {featured && (
        <View style={rpStyles.featuredQuote}>
          <Ionicons name="chatbubble-ellipses" size={16} color={Colors.primary} />
          <Text style={rpStyles.featuredText}>"{featured.comment}"</Text>
          <View style={rpStyles.featuredFooter}>
            <Avatar uri={featured.reviewer?.avatar_url ?? null} name={featured.reviewer?.full_name ?? ''} size={18} />
            <Text style={rpStyles.featuredAuthor}>{featured.reviewer?.full_name ?? 'Anonymous'}</Text>
            <StarRating rating={featured.rating} size={11} />
          </View>
        </View>
      )}

      {/* Review cards */}
      {visible.map((rev) => <ReviewCard key={rev.id} review={rev} />)}

      {/* Show more */}
      {reviews.length > INITIAL && (
        <TouchableOpacity style={rpStyles.showMoreBtn} onPress={() => setShowAll((v) => !v)}>
          <Text style={rpStyles.showMoreText}>
            {showAll ? 'Show fewer' : `Show all ${reviews.length} reviews`}
          </Text>
          <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const rpStyles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
  featuredQuote: {
    backgroundColor: Colors.primaryLight + '22',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    gap: 8,
  },
  featuredText: { fontSize: 14, color: Colors.text, lineHeight: 21, fontStyle: 'italic' },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredAuthor: { fontSize: 12, fontWeight: '600', color: Colors.muted, flex: 1 },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scrollContent: { paddingBottom: 130 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  topBarUrl: { flex: 1, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  // Section nav
  sectionNav: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionNavInner: { paddingHorizontal: Spacing.md, gap: 0 },
  sectionNavItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sectionNavItemActive: { borderBottomColor: Colors.primary },
  sectionNavText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  sectionNavTextActive: { color: Colors.primary },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: 10, backgroundColor: Colors.card, marginBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  heroName: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  heroUsername: { fontSize: 14, color: Colors.muted, fontWeight: '500' },
  heroMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroInfoText: { fontSize: 12, color: Colors.muted },
  heroInfoDot: { fontSize: 12, color: Colors.muted },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  trustBadgeText: { fontSize: 12, fontWeight: '700' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  availDot: { width: 6, height: 6, borderRadius: 3 },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'stretch',
    ...Shadow.sm,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 17, fontWeight: '800', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.muted, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },

  // CTA
  ctaRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    ...Shadow.md,
  },
  ctaPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  ctaSecondaryText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // URL chip
  urlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  urlChipText: { fontSize: 12, color: Colors.muted },

  // Sections
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  bio: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  placeholder: { fontSize: 14, color: Colors.muted, fontStyle: 'italic' },

  // About section blocks
  aboutBlock: { gap: 10 },
  aboutBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aboutBlockTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  skillChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  aboutCards: { flexDirection: 'row', gap: 10 },
  aboutCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  aboutCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutCardValue: { fontSize: 14, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  aboutCardLabel: { fontSize: 11, color: Colors.muted, textAlign: 'center' },

  // Services
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionCount: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  serviceCardGrid: { gap: 12 },
  serviceCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    ...Shadow.sm,
  },
  serviceCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  serviceCardTitleRow: { flex: 1 },
  serviceCardTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, lineHeight: 22 },
  servicePricePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  servicePriceText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  serviceCardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  serviceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  serviceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceStatText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  serviceStatMuted: { fontWeight: '400', color: Colors.muted },
  serviceStatDivider: { width: 1, height: 14, backgroundColor: Colors.border },
  viewServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  viewServiceBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Reviews
  statValRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  reviewTabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  reviewTabText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  reviewTabTextActive: { color: Colors.card },
  emptySectionSub: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.md },

  // Portfolio preview section
  portfolioCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  portfolioCountText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  previewFeaturedBlock: { gap: 10 },
  previewFeaturedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewFeaturedLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  previewFeaturedRow: { gap: 10, paddingBottom: 2 },
  previewFeaturedCard: {
    width: 200,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...Shadow.sm,
  },
  previewFeaturedThumb: { width: '100%', height: 120 },
  previewFeaturedInfo: { padding: 10, gap: 6 },
  previewFeaturedTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  previewFeaturedMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewFeaturedStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  previewFeaturedStarText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  previewFeaturedCategory: { fontSize: 11, color: Colors.muted },
  previewThumbRow: { gap: 8, paddingBottom: 2 },
  previewThumb: { position: 'relative' },
  previewThumbImg: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
  previewOverflowBadge: {
    position: 'absolute',
    top: 0, left: 0,
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOverflowText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  viewAllBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary, flex: 1, textAlign: 'center' },

  proofDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },

  // Portfolio
  portfolioPlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  portfolioIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  portfolioSub: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.lg, lineHeight: 18 },
  portfolioComingSoonBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  portfolioComingSoonText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Activity
  activityStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  activityStatChip: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  activityStatVal: { fontSize: 16, fontWeight: '800', color: Colors.text },
  activityStatLbl: { fontSize: 10, color: Colors.muted, textAlign: 'center' },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 36 },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: Colors.border,
    borderRadius: 1,
    marginTop: 2,
    marginBottom: 2,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 18,
    paddingTop: 6,
    gap: 3,
  },
  timelineText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  timelineSub: { fontSize: 12, color: Colors.muted, lineHeight: 17 },

  // Trust & Verification
  trustScoreCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadow.sm,
  },
  trustScoreLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 68,
  },
  trustScoreNum: { fontSize: 44, fontWeight: '900', color: Colors.text, lineHeight: 50 },
  trustScoreOf: { fontSize: 16, fontWeight: '700', color: Colors.muted, marginBottom: 6 },
  trustScoreRight: { flex: 1, gap: 8 },
  trustScoreBarRow: { flexDirection: 'row' },
  trustLabelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  trustLabelBadgeText: { fontSize: 12, fontWeight: '700' },
  trustTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trustFill: { height: 6, borderRadius: 3 },
  trustExplain: { fontSize: 11, color: Colors.muted, lineHeight: 16 },
  badgesGrid: { gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  badgeEarned: {
    backgroundColor: Colors.card,
    borderColor: Colors.success + '44',
  },
  badgeLocked: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  badgeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  badgeCheck: { marginLeft: 'auto' },

  // Sticky CTA bar
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: 10,
    ...Shadow.md,
  },
  stickyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  stickyBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  stickyBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  stickyBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  stickyBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  stickyBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Empty states
  emptySection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  emptySectionText: { fontSize: 14, color: Colors.muted },

  // Not found
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  notFoundSub: { fontSize: 14, color: Colors.muted },
  backBtnCenter: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    marginTop: 8,
  },
  backBtnCenterText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
