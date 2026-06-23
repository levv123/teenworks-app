import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  HomeStackParamList,
  Review,
  CategoryRatings,
  CATEGORY_RATING_KEYS,
  CATEGORY_RATING_LABELS,
  CATEGORY_RATING_ICONS,
  CLIENT_CATEGORY_RATING_KEYS,
} from '../../types';
import { CategoryRatingsBreakdown } from '../../components/CategoryRatingsBar';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { createReview, getReviewEligibility, ReviewEligibility } from '../../api/reviews';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { timeAgo } from '../../utils/helpers';

type Props = NativeStackScreenProps<HomeStackParamList, 'Review'>;

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const RATING_COLORS = ['', Colors.error, Colors.error, Colors.warning, Colors.success, Colors.success];

const CLIENT_TAGS  = ['Professional', 'On time', 'Great quality', 'Good communication', 'Exceeded expectations', 'Clean work', 'Would recommend', 'Creative'];
const PROVIDER_TAGS = ['Clear instructions', 'Fair payment', 'Responsive', 'Respectful', 'Well organized', 'Easy to work with', 'Paid on time', 'Good feedback'];

const MIN_COMMENT_LEN = 20;

export function ReviewScreen({ route, navigation }: Props) {
  const { bookingId, revieweeId, revieweeName, reviewerRole } = route.params;
  const { user } = useAuth();

  // Eligibility state
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  // Form state
  const [rating, setRating]             = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<CategoryRatings>({});
  const [wouldHireAgain, setWouldHireAgain] = useState<boolean | null>(null);
  const [comment, setComment]           = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);

  // Star press animation
  const starAnims = useRef([0,1,2,3,4].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (!user?.id) return;
    getReviewEligibility(bookingId, user.id)
      .then(setEligibility)
      .catch(() => setEligibility(null))
      .finally(() => setLoadingEligibility(false));
  }, [bookingId, user?.id]);

  const tags = reviewerRole === 'client' ? CLIENT_TAGS : PROVIDER_TAGS;
  const hireLabel = reviewerRole === 'client' ? 'hire again' : 'work with again';
  // Which category keys to show depends on who is being reviewed
  const activeCatKeys = reviewerRole === 'provider'
    ? CLIENT_CATEGORY_RATING_KEYS   // provider reviewing client → client categories
    : CATEGORY_RATING_KEYS;         // client reviewing provider → worker categories
  // Role of the person being reviewed (opposite of reviewer)
  const revieweeRole: 'client' | 'provider' = reviewerRole === 'client' ? 'provider' : 'client';

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const animateStar = (idx: number) => {
    Animated.sequence([
      Animated.timing(starAnims[idx], { toValue: 1.35, duration: 100, useNativeDriver: true }),
      Animated.spring(starAnims[idx], { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  };

  const handleStarPress = (star: number) => {
    setRating(star);
    for (let i = 0; i < star; i++) {
      setTimeout(() => animateStar(i), i * 40);
    }
  };

  const commentReady = comment.trim().length >= MIN_COMMENT_LEN || comment.trim().length === 0;
  const canSubmit = rating > 0 && wouldHireAgain !== null && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !user?.id) return;

    const fullComment = [
      selectedTags.join(' · '),
      comment.trim(),
    ].filter(Boolean).join('\n\n') || undefined;

    setSubmitting(true);
    try {
      const hasCatRatings = activeCatKeys.some((k) => categoryRatings[k] !== undefined);
      await createReview(
        bookingId, user.id, revieweeId, revieweeRole,
        rating, fullComment, wouldHireAgain,
        hasCatRatings ? categoryRatings : null,
      );
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('unique') || msg.includes('23505')) {
        Alert.alert('Already Reviewed', 'You have already submitted a review for this booking.');
      } else if (msg.includes('policy') || msg.includes('violates')) {
        Alert.alert('Cannot Review', 'This booking is not eligible for a review. It may not be completed yet.');
      } else {
        Alert.alert('Error', 'Could not submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────

  if (loadingEligibility) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.centerWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Verifying eligibility…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success state ─────────────────────────────────────────

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={() => navigation.goBack()} />
        <SuccessState
          revieweeName={revieweeName}
          theirReview={eligibility?.theirReview ?? null}
          onDone={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  // ── Already reviewed ──────────────────────────────────────

  if (eligibility && !eligibility.canReview && eligibility.reason === 'already_reviewed') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={() => navigation.goBack()} />
        <AlreadyReviewedState
          review={eligibility.existingReview!}
          theirReview={eligibility.theirReview}
          revieweeName={revieweeName}
          onDone={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  // ── Blocked states ────────────────────────────────────────

  if (eligibility && !eligibility.canReview) {
    const messages: Record<string, { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }> = {
      booking_not_completed: {
        icon: 'time-outline',
        title: 'Booking not completed',
        body: 'Reviews can only be submitted after a booking is marked as completed by both parties.',
      },
      not_a_participant: {
        icon: 'lock-closed-outline',
        title: 'Not a participant',
        body: 'You can only review bookings where you were the client or the worker.',
      },
      booking_not_found: {
        icon: 'alert-circle-outline',
        title: 'Booking not found',
        body: 'We could not find this booking. It may have been removed.',
      },
    };
    const meta = messages[eligibility.reason!] ?? messages.booking_not_found;
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={() => navigation.goBack()} />
        <BlockedState icon={meta.icon} title={meta.title} body={meta.body} onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  // ── Review form ───────────────────────────────────────────

  const booking = eligibility?.booking;
  const otherUser = reviewerRole === 'client' ? booking?.provider : booking?.client;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header onBack={() => navigation.goBack()} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Booking context ─────────────────────────────── */}
          {booking && (
            <View style={styles.bookingCard}>
              <View style={styles.bookingCardTop}>
                <View style={[styles.bookingBadge, { backgroundColor: Colors.success + '18' }]}>
                  <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                  <Text style={[styles.bookingBadgeText, { color: Colors.success }]}>Completed</Text>
                </View>
                <Text style={styles.bookingTime}>{timeAgo(booking.created_at)}</Text>
              </View>
              <Text style={styles.bookingTitle} numberOfLines={1}>
                {booking.request?.title ?? 'Completed Job'}
              </Text>
              {booking.price != null && (
                <Text style={styles.bookingPrice}>${booking.price}</Text>
              )}
              <View style={styles.trustNote}>
                <Ionicons name="shield-checkmark-outline" size={13} color={Colors.primary} />
                <Text style={styles.trustNoteText}>
                  This review is permanently linked to booking #{booking.id.slice(-6).toUpperCase()} and cannot be edited.
                </Text>
              </View>
            </View>
          )}

          {/* ── Who you're reviewing ─────────────────────────── */}
          <View style={styles.revieweeRow}>
            <Avatar uri={otherUser?.avatar_url ?? null} name={revieweeName} size={56} />
            <View style={styles.revieweeInfo}>
              <Text style={styles.revieweeLabel}>
                {reviewerRole === 'client' ? 'Rate your worker' : 'Rate your client'}
              </Text>
              <Text style={styles.revieweeName}>{revieweeName}</Text>
            </View>
          </View>

          {/* ── Star rating ──────────────────────────────────── */}
          <View style={styles.starsSection}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star, idx) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  activeOpacity={0.8}
                >
                  <Animated.View style={{ transform: [{ scale: starAnims[idx] }] }}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={52}
                      color={star <= rating ? RATING_COLORS[rating] : Colors.border}
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={[styles.ratingLabel, { color: RATING_COLORS[rating] }]}>
                {RATING_LABELS[rating]}
              </Text>
            )}
          </View>

          {/* ── Category ratings ─────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {reviewerRole === 'provider' ? 'Rate the client' : 'Rate by category'}
              </Text>
              <Text style={styles.sectionOptional}>optional</Text>
            </View>
            <View style={styles.catGrid}>
              {activeCatKeys.map((key) => {
                const val = categoryRatings[key] ?? 0;
                return (
                  <View key={key} style={styles.catRow}>
                    <View style={styles.catLabelWrap}>
                      <Ionicons name={CATEGORY_RATING_ICONS[key] as any} size={14} color={Colors.muted} />
                      <Text style={styles.catLabel}>{CATEGORY_RATING_LABELS[key]}</Text>
                    </View>
                    <View style={styles.catStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() =>
                            setCategoryRatings((prev) => ({
                              ...prev,
                              [key]: prev[key] === star ? undefined : star,
                            }))
                          }
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        >
                          <Ionicons
                            name={star <= val ? 'star' : 'star-outline'}
                            size={24}
                            color={star <= val ? Colors.warning : Colors.border}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Would hire again ─────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Would you {hireLabel}? <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.hireRow}>
              <TouchableOpacity
                style={[
                  styles.hireBtn,
                  wouldHireAgain === true && styles.hireBtnYes,
                ]}
                onPress={() => setWouldHireAgain(true)}
              >
                <Ionicons
                  name="thumbs-up"
                  size={20}
                  color={wouldHireAgain === true ? Colors.card : Colors.muted}
                />
                <Text style={[styles.hireBtnText, wouldHireAgain === true && styles.hireBtnTextActive]}>
                  Yes, definitely
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.hireBtn,
                  wouldHireAgain === false && styles.hireBtnNo,
                ]}
                onPress={() => setWouldHireAgain(false)}
              >
                <Ionicons
                  name="thumbs-down"
                  size={20}
                  color={wouldHireAgain === false ? Colors.card : Colors.muted}
                />
                <Text style={[styles.hireBtnText, wouldHireAgain === false && styles.hireBtnTextActive]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Quick tags ───────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {reviewerRole === 'client' ? 'What went well?' : 'How was working with them?'}
            </Text>
            <View style={styles.tagsWrap}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.8}
                >
                  {selectedTags.includes(tag) && (
                    <Ionicons name="checkmark" size={12} color={Colors.primary} />
                  )}
                  <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Written review ───────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Written review</Text>
              <Text style={styles.sectionOptional}>optional</Text>
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder={
                reviewerRole === 'client'
                  ? "Describe the quality of work, communication, and overall experience…"
                  : "Describe how the project went, the client’s communication, and whether you’d work together again…"
              }
              placeholderTextColor={Colors.muted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.commentFooter}>
              {comment.trim().length > 0 && comment.trim().length < MIN_COMMENT_LEN && (
                <Text style={styles.commentHint}>
                  {MIN_COMMENT_LEN - comment.trim().length} more characters recommended
                </Text>
              )}
              <Text style={[styles.charCount, { marginLeft: 'auto' }]}>{comment.length}/500</Text>
            </View>
          </View>

          {/* ── Mutual review notice ─────────────────────────── */}
          {eligibility?.theirReview == null && (
            <View style={styles.mutualNote}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
              <Text style={styles.mutualNoteText}>
                {revieweeName} can also leave you a review for this job.
                Reviews are only visible after both parties submit or after 14 days.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Footer ───────────────────────────────────────── */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View style={styles.footerRequirements}>
              <RequirementDot met={rating > 0} label="Rating" />
              <RequirementDot met={wouldHireAgain !== null} label="Would hire again" />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.card} size="small" />
              ) : (
                <>
                  <Ionicons name="star" size={17} color={canSubmit ? Colors.card : Colors.muted} />
                  <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
                    Submit Review
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Leave a Review</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

function RequirementDot({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.reqItem}>
      <View style={[styles.reqDot, met && styles.reqDotMet]} />
      <Text style={[styles.reqLabel, met && styles.reqLabelMet]}>{label}</Text>
    </View>
  );
}

function SuccessState({ revieweeName, theirReview, onDone }: { revieweeName: string; theirReview: Review | null; onDone: () => void }) {
  return (
    <View style={styles.centerWrap}>
      <View style={styles.successCircle}>
        <Ionicons name="star" size={44} color={Colors.warning} />
      </View>
      <Text style={styles.successTitle}>Review Submitted!</Text>
      <Text style={styles.successSub}>
        Your review for {revieweeName} has been saved and will help future clients make better decisions.
      </Text>
      {theirReview && (
        <View style={styles.theirReviewCard}>
          <Text style={styles.theirReviewLabel}>{revieweeName} also reviewed you:</Text>
          <View style={styles.theirReviewStars}>
            <StarRating rating={theirReview.rating} size={16} />
            <Text style={styles.theirReviewRating}>{theirReview.rating.toFixed(1)}</Text>
          </View>
          {theirReview.comment && (
            <Text style={styles.theirReviewComment} numberOfLines={3}>{theirReview.comment}</Text>
          )}
          {theirReview.would_hire_again != null && (
            <View style={[styles.hireAgainBadge, { backgroundColor: theirReview.would_hire_again ? Colors.success + '18' : Colors.error + '18' }]}>
              <Ionicons
                name={theirReview.would_hire_again ? 'thumbs-up' : 'thumbs-down'}
                size={13}
                color={theirReview.would_hire_again ? Colors.success : Colors.error}
              />
              <Text style={[styles.hireAgainBadgeText, { color: theirReview.would_hire_again ? Colors.success : Colors.error }]}>
                {theirReview.would_hire_again ? 'Would work with you again' : 'Would not work with you again'}
              </Text>
            </View>
          )}
        </View>
      )}
      <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function AlreadyReviewedState({
  review,
  theirReview,
  revieweeName,
  onDone,
}: {
  review: Review;
  theirReview: Review | null;
  revieweeName: string;
  onDone: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.alreadyHeader}>
        <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
        <Text style={styles.successTitle}>You've already reviewed this booking</Text>
      </View>

      {/* Your review */}
      <View style={styles.reviewCard}>
        <Text style={styles.reviewCardLabel}>Your review of {revieweeName}</Text>
        <StarRating rating={review.rating} size={18} />
        {review.category_ratings && (
          <CategoryRatingsBreakdown ratings={review.category_ratings} />
        )}
        {review.would_hire_again != null && (
          <View style={[styles.hireAgainBadge, { backgroundColor: review.would_hire_again ? Colors.success + '18' : Colors.error + '18', alignSelf: 'flex-start', marginTop: 4 }]}>
            <Ionicons name={review.would_hire_again ? 'thumbs-up' : 'thumbs-down'} size={13} color={review.would_hire_again ? Colors.success : Colors.error} />
            <Text style={[styles.hireAgainBadgeText, { color: review.would_hire_again ? Colors.success : Colors.error }]}>
              {review.would_hire_again ? 'Would hire again' : 'Would not hire again'}
            </Text>
          </View>
        )}
        {review.comment && (
          <Text style={styles.reviewCardComment}>{review.comment}</Text>
        )}
        <Text style={styles.reviewCardTime}>{timeAgo(review.created_at)}</Text>
      </View>

      {/* Their review (if any) */}
      {theirReview && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewCardLabel}>{revieweeName}'s review of you</Text>
          <StarRating rating={theirReview.rating} size={18} />
          {theirReview.would_hire_again != null && (
            <View style={[styles.hireAgainBadge, { backgroundColor: theirReview.would_hire_again ? Colors.success + '18' : Colors.error + '18', alignSelf: 'flex-start', marginTop: 4 }]}>
              <Ionicons name={theirReview.would_hire_again ? 'thumbs-up' : 'thumbs-down'} size={13} color={theirReview.would_hire_again ? Colors.success : Colors.error} />
              <Text style={[styles.hireAgainBadgeText, { color: theirReview.would_hire_again ? Colors.success : Colors.error }]}>
                {theirReview.would_hire_again ? 'Would work with you again' : 'Would not work with you again'}
              </Text>
            </View>
          )}
          {theirReview.comment && (
            <Text style={styles.reviewCardComment}>{theirReview.comment}</Text>
          )}
        </View>
      )}

      {!theirReview && (
        <View style={styles.waitingCard}>
          <Ionicons name="time-outline" size={20} color={Colors.muted} />
          <Text style={styles.waitingText}>Waiting for {revieweeName}'s review…</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.doneBtn, { marginTop: Spacing.lg }]} onPress={onDone}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function BlockedState({ icon, title, body, onBack }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; onBack: () => void }) {
  return (
    <View style={styles.centerWrap}>
      <Ionicons name={icon} size={52} color={Colors.muted} />
      <Text style={styles.blockedTitle}>{title}</Text>
      <Text style={styles.blockedBody}>{body}</Text>
      <TouchableOpacity style={styles.doneBtn} onPress={onBack}>
        <Text style={styles.doneBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: { fontSize: 14, color: Colors.muted, marginTop: Spacing.sm },

  // Booking context card
  bookingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  bookingCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  bookingBadgeText: { fontSize: 11, fontWeight: '700' },
  bookingTime: { fontSize: 11, color: Colors.muted },
  bookingTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  bookingPrice: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  trustNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  trustNoteText: { flex: 1, fontSize: 11, color: Colors.muted, lineHeight: 16 },

  // Reviewee
  revieweeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  revieweeInfo: { flex: 1, gap: 3 },
  revieweeLabel: { fontSize: 12, color: Colors.muted, fontWeight: '500' },
  revieweeName: { fontSize: 22, fontWeight: '800', color: Colors.text },

  // Stars
  starsSection: { alignItems: 'center', gap: Spacing.sm },
  starsRow: { flexDirection: 'row', gap: 4 },
  ratingLabel: { fontSize: 20, fontWeight: '800' },

  // Section
  section: { gap: Spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionOptional: { fontSize: 12, color: Colors.muted },
  required: { color: Colors.error },

  // Category ratings grid
  catGrid: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  catLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  catLabel: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  catStars: { flexDirection: 'row', gap: 3 },

  // Would hire again
  hireRow: { flexDirection: 'row', gap: Spacing.sm },
  hireBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  hireBtnYes: { backgroundColor: Colors.success, borderColor: Colors.success },
  hireBtnNo:  { backgroundColor: Colors.error,   borderColor: Colors.error   },
  hireBtnText: { fontSize: 14, fontWeight: '700', color: Colors.muted },
  hireBtnTextActive: { color: Colors.card },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tagActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '33' },
  tagText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  tagTextActive: { color: Colors.primary, fontWeight: '700' },

  // Comment
  commentInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 110,
    lineHeight: 21,
  },
  commentFooter: { flexDirection: 'row', alignItems: 'center' },
  commentHint: { fontSize: 11, color: Colors.warning, fontWeight: '500' },
  charCount: { fontSize: 11, color: Colors.muted },

  // Mutual note
  mutualNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryLight + '22',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  mutualNoteText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  // Footer
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footerRequirements: { flex: 1, gap: 4 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.border },
  reqDotMet: { backgroundColor: Colors.success },
  reqLabel: { fontSize: 11, color: Colors.muted },
  reqLabelMet: { color: Colors.success, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  submitBtnDisabled: { backgroundColor: Colors.border },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: Colors.card },
  submitBtnTextDisabled: { color: Colors.muted },

  // Success
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.warning + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  successSub: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  theirReviewCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  theirReviewLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  theirReviewStars: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  theirReviewRating: { fontSize: 16, fontWeight: '700', color: Colors.text },
  theirReviewComment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: Colors.card },

  // Already reviewed state
  alreadyHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  reviewCardLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  reviewCardComment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  reviewCardTime: { fontSize: 11, color: Colors.muted },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  waitingText: { fontSize: 13, color: Colors.muted },

  // Hire again badge (shared)
  hireAgainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  hireAgainBadgeText: { fontSize: 11, fontWeight: '600' },

  // Blocked
  blockedTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  blockedBody: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
});
