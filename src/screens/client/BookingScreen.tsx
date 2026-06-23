import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, Booking, Review } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { getBookingById, updateBookingStatus } from '../../api/bookings';
import { getReviewsForBooking, getClientReviewsForUser } from '../../api/reviews';
import { RatingSummary } from '../../components/RatingSummary';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { StatusTracker } from '../../components/StatusTracker';
import { CategoryBadge } from '../../components/CategoryBadge';
import { formatCurrency, formatDate, getBookingStatusLabel, getStatusColor, timeAgo } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { TrustSignalBar } from '../../components/TrustSignalBar';

type Props = NativeStackScreenProps<HomeStackParamList, 'Booking'>;

const BOOKING_STEPS = [
  { label: 'Accepted', icon: 'checkmark-circle-outline' as const },
  { label: 'En Route', icon: 'car-outline' as const },
  { label: 'In Progress', icon: 'construct-outline' as const },
  { label: 'Completed', icon: 'trophy-outline' as const },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    accepted: 0,
    in_progress: 2,
    completed: 3,
  };
  return map[status] ?? 0;
}

export function BookingScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [clientRatingReviews, setClientRatingReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const b = await getBookingById(bookingId);
        setBooking(b);
        if (b?.status === 'completed') {
          const revs = await getReviewsForBooking(bookingId);
          setReviews(revs);
          // Provider gets to see the client's overall rating history
          if (b.provider_id === user?.id && b.client_id) {
            const clientRevs = await getClientReviewsForUser(b.client_id);
            setClientRatingReviews(clientRevs);
          }
        }
      } catch (err) {
        console.error('Booking load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const handleMarkComplete = async () => {
    Alert.alert('Mark Complete', 'Mark this job as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            const updated = await updateBookingStatus(bookingId, 'completed');
            setBooking(updated);
          } catch (err) {
            Alert.alert('Error', 'Failed to update status');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }
  if (!booking) return null;

  const isClient = user?.id === booking.client_id;
  const isProvider = user?.id === booking.provider_id;
  const otherUser = isClient ? booking.provider : booking.client;
  const otherUserName = otherUser?.full_name ?? 'User';
  const statusColor = getStatusColor(booking.status);
  const stepIndex = getStepIndex(booking.status);

  // Review state for completed bookings
  const myReview = reviews.find((r) => r.reviewer_id === user?.id) ?? null;
  const theirReview = reviews.find((r) => r.reviewer_id !== user?.id) ?? null;
  const reviewerRole: 'client' | 'provider' = isClient ? 'client' : 'provider';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{getBookingStatusLabel(booking.status)}</Text>
          </View>
        </View>

        {/* Status tracker */}
        <View style={styles.trackerCard}>
          <StatusTracker steps={BOOKING_STEPS} currentStep={stepIndex} />
        </View>

        {/* Request info */}
        {booking.request && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Service Request</Text>
            {booking.request.category && (
              <CategoryBadge category={booking.request.category} size="sm" />
            )}
            <Text style={styles.requestTitle}>{booking.request.title}</Text>
            {booking.request.address && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={15} color={Colors.muted} />
                <Text style={styles.metaText}>{booking.request.address}</Text>
              </View>
            )}
            {booking.request.scheduled_at && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={15} color={Colors.muted} />
                <Text style={styles.metaText}>{formatDate(booking.request.scheduled_at)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Price card */}
        {booking.price && (
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Agreed Price</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.price)}</Text>
            </View>
            <View style={styles.priceIcon}>
              <Ionicons name="cash-outline" size={24} color={Colors.success} />
            </View>
          </View>
        )}

        {/* Provider / Client card */}
        {otherUser && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{isClient ? 'Your Provider' : 'Client'}</Text>
            <View style={styles.personRow}>
              <Avatar
                uri={otherUser.avatar_url}
                name={otherUser.full_name}
                size={52}
                showOnlineIndicator
                isOnline={isClient && (booking.provider_profile?.is_available ?? false)}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.personName}>{otherUser.full_name}</Text>
                {isClient && booking.provider_profile && (
                  <View style={styles.ratingRow}>
                    <StarRating rating={booking.provider_profile.rating} size={13} />
                    <Text style={styles.ratingText}>
                      {booking.provider_profile.rating.toFixed(1)} · {booking.provider_profile.review_count} reviews
                    </Text>
                  </View>
                )}
                <Text style={styles.personMeta}>
                  Booked {timeAgo(booking.created_at)}
                </Text>
              </View>
            </View>
            {/* Trust signals below the person row — visible to client only */}
            {isClient && booking.provider_profile && (
              <TrustSignalBar
                layout="scroll"
                size="sm"
                signals={{
                  trustScore: (booking.provider_profile as any).trust_score,
                  trustLevel: (booking.provider_profile as any).trust_level,
                  reviewCount: booking.provider_profile.review_count,
                  completionRate: (booking.provider_profile as any).completion_rate,
                  repeatClientRate: (booking.provider_profile as any).repeat_client_rate,
                  completedBookings: (booking.provider_profile as any).completed_bookings,
                  totalBookings: (booking.provider_profile as any).total_bookings,
                }}
              />
            )}

            {/* Contact buttons */}
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => navigation.navigate('Chat', {
                  bookingId,
                  otherUserName,
                  contextType: booking.status === 'in_progress' ? 'project_started' : 'offer_accepted',
                  contextLabel: booking.request?.title ?? 'Active Booking',
                })}
              >
                <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
                <Text style={styles.contactBtnText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactBtn}>
                <Ionicons name="call-outline" size={18} color={Colors.success} />
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
              {isClient && (
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => navigation.navigate('ProviderProfile', { providerId: booking.provider_id })}
                >
                  <Ionicons name="person-outline" size={18} color={Colors.secondary} />
                  <Text style={styles.contactBtnText}>Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Client rating — visible to provider on completed bookings */}
        {isProvider && booking.status === 'completed' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Client Rating</Text>
            {clientRatingReviews.length > 0 ? (
              <RatingSummary
                rating={clientRatingReviews.reduce((s, r) => s + r.rating, 0) / clientRatingReviews.length}
                reviewCount={clientRatingReviews.length}
                reviews={clientRatingReviews}
              />
            ) : (
              <View style={styles.noClientRating}>
                <Ionicons name="person-outline" size={22} color={Colors.muted} />
                <Text style={styles.noClientRatingText}>This client hasn't been reviewed yet</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {booking.notes && (
          <View style={styles.notesCard}>
            <Ionicons name="document-text-outline" size={16} color={Colors.muted} />
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        )}

        {/* Review status for completed bookings */}
        {booking.status === 'completed' && (
          <View style={styles.reviewStatusCard}>
            <Text style={styles.reviewStatusTitle}>Reviews</Text>
            <View style={styles.reviewStatusRow}>
              {/* My review */}
              <View style={[styles.reviewStatusItem, myReview && styles.reviewStatusItemDone]}>
                <Ionicons
                  name={myReview ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={myReview ? Colors.success : Colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewStatusLabel, myReview && { color: Colors.success }]}>
                    Your review
                  </Text>
                  {myReview ? (
                    <View style={styles.reviewMiniStars}>
                      <StarRating rating={myReview.rating} size={11} />
                      {myReview.would_hire_again !== null && (
                        <View style={[styles.hireBadge, { backgroundColor: myReview.would_hire_again ? Colors.success + '20' : Colors.error + '20' }]}>
                          <Text style={[styles.hireBadgeText, { color: myReview.would_hire_again ? Colors.success : Colors.error }]}>
                            {myReview.would_hire_again ? '👍 Would hire' : '👎 Would not hire'}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.reviewStatusSub}>Not submitted yet</Text>
                  )}
                </View>
              </View>

              <View style={styles.reviewStatusDivider} />

              {/* Their review */}
              <View style={[styles.reviewStatusItem, theirReview && styles.reviewStatusItemDone]}>
                <Ionicons
                  name={theirReview ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={theirReview ? Colors.success : Colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewStatusLabel, theirReview && { color: Colors.success }]}>
                    {otherUserName.split(' ')[0]}'s review
                  </Text>
                  {theirReview ? (
                    <View style={styles.reviewMiniStars}>
                      <StarRating rating={theirReview.rating} size={11} />
                    </View>
                  ) : (
                    <Text style={styles.reviewStatusSub}>Waiting on them</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Leave review CTA — only if not yet submitted */}
            {!myReview && (
              <TouchableOpacity
                style={styles.leaveReviewBtn}
                onPress={() =>
                  navigation.navigate('Review', {
                    bookingId,
                    revieweeId: isClient ? booking.provider_id : booking.client_id,
                    revieweeName: otherUserName,
                    reviewerRole,
                  })
                }
              >
                <Ionicons name="star-outline" size={16} color={Colors.card} />
                <Text style={styles.leaveReviewBtnText}>Leave a Review</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {booking.status === 'in_progress' && (isProvider || isClient) && (
            <Button
              title="Mark as Completed"
              onPress={handleMarkComplete}
              fullWidth
            />
          )}
          {(booking.status === 'accepted' || booking.status === 'in_progress') && (
            <Button
              title="Cancel Booking"
              variant="ghost"
              fullWidth
              textStyle={{ color: Colors.error }}
              onPress={() => Alert.alert('Cancel', 'Cancel this booking?')}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: 12, fontWeight: '700' },
  trackerCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 12,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 12,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  requestTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: Colors.muted },
  priceCard: {
    backgroundColor: Colors.successLight,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: { fontSize: 12, color: Colors.success, fontWeight: '500' },
  priceValue: { fontSize: 28, fontWeight: '800', color: Colors.success },
  priceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.success + '20', alignItems: 'center', justifyContent: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: Colors.muted },
  personMeta: { fontSize: 12, color: Colors.muted },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  notesCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
  },
  notesText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  actions: { paddingHorizontal: Spacing.lg, gap: 10 },
  reviewStatusCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 12,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  reviewStatusTitle: { fontSize: 13, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewStatusRow: { flexDirection: 'row', gap: 12 },
  reviewStatusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewStatusItemDone: { borderColor: Colors.success + '50', backgroundColor: Colors.success + '08' },
  reviewStatusLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  reviewStatusSub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  reviewStatusDivider: { width: 1, backgroundColor: Colors.border },
  reviewMiniStars: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  hireBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  hireBadgeText: { fontSize: 10, fontWeight: '600' },
  leaveReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 11,
  },
  leaveReviewBtnText: { fontSize: 14, fontWeight: '700', color: Colors.card },
  noClientRating: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  noClientRatingText: { fontSize: 13, color: Colors.muted },
});
