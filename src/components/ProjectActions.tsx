/**
 * ProjectActions
 *
 * Context-aware action bar shown at the bottom of every conversation.
 * Tells the user whose turn it is, what to do next, and surfaces exactly
 * the right actions for the current project_status + role combination.
 *
 * Every action writes to the DB, which fires triggers that:
 *   • Auto-advance project_status
 *   • Inject a system message into the chat
 *   • Record a timeline event
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, ProjectStatus } from '../types';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import {
  updateBookingStatus,
  sendMessage,
  sendSystemMessage,
  extendDeadline,
  approveAndComplete,
  requestRevisionOnDeliverables,
  formalizeOffer,
  acceptOffer,
  submitWork,
  setProjectStatus,
} from '../api/bookings';

// ── Types ─────────────────────────────────────────────────────

export interface ProjectActionsProps {
  booking: Booking;
  userId: string;
  onStatusChange: (updated: Booking) => void;
  onNavigateReview: () => void;
}

type ActionId =
  | 'send_offer'
  | 'hire'
  | 'decline_offer'
  | 'accept_offer_provider'  // provider accepts client's offer → booking = accepted
  | 'start_work'             // provider starts work → booking = in_progress
  | 'submit_work'            // provider submits completed work → project_status = review_requested
  | 'ready_for_review'       // alias for submit when no deliverable file is uploaded
  | 'request_revision'
  | 'approve_work'
  | 'extend_deadline'
  | 'mark_complete'
  | 'cancel'
  | 'leave_review'
  | 'request_clarification';

interface Action {
  id: ActionId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  primary?: boolean;
  destructive?: boolean;
}

// ── Context banner config ─────────────────────────────────────
// What to tell the user based on role + project_status

interface ContextBanner {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
}

function getContextBanner(
  projectStatus: ProjectStatus,
  isClient: boolean,
): ContextBanner | null {
  if (isClient) {
    switch (projectStatus) {
      case 'inquiry':
        return { emoji: '✉️', title: 'Send an Offer', subtitle: 'Formalize this inquiry with a price and deadline.', color: Colors.primary };
      case 'offer_sent':
        return { emoji: '⏳', title: 'Waiting for response', subtitle: 'The worker will accept or counter your offer.', color: Colors.warning };
      case 'accepted':
        return { emoji: '🎯', title: 'Project confirmed', subtitle: 'Work will begin soon.', color: Colors.success };
      case 'in_progress':
        return { emoji: '🔨', title: 'Work in progress', subtitle: 'You can mark complete or request a revision once work is submitted.', color: Colors.primary };
      case 'review_requested':
        return { emoji: '👀', title: 'Your turn — Review submitted work', subtitle: 'Approve to complete the project, or request a revision.', color: Colors.warning };
      case 'completed':
        return { emoji: '🏆', title: 'Project complete!', subtitle: 'Share your experience by leaving a review.', color: Colors.success };
      case 'cancelled':
        return null;
    }
  } else {
    switch (projectStatus) {
      case 'inquiry':
        return { emoji: '💬', title: 'New inquiry', subtitle: 'A client wants to discuss a project with you.', color: Colors.info };
      case 'offer_sent':
        return { emoji: '📋', title: 'Offer received', subtitle: 'Accept the offer to confirm, or ask a question first.', color: Colors.warning };
      case 'accepted':
        return { emoji: '🚀', title: 'Offer accepted — ready to start', subtitle: 'Tap Start Work when you\'re ready to begin.', color: Colors.success };
      case 'in_progress':
        return { emoji: '⚡', title: 'Work in progress', subtitle: 'Submit your work when it\'s ready for client review.', color: Colors.primary };
      case 'review_requested':
        return { emoji: '⏳', title: 'Awaiting client review', subtitle: 'The client is reviewing your submitted work. Stand by.', color: Colors.info };
      case 'completed':
        return { emoji: '🏆', title: 'Project complete!', subtitle: 'Great work — leave a review for the client.', color: Colors.success };
      case 'cancelled':
        return null;
    }
  }
  return null;
}

// ── Available actions by role + project_status ────────────────

function getActions(booking: Booking, isClient: boolean): Action[] {
  const ps = booking.project_status;

  if (isClient) {
    switch (ps) {
      case 'inquiry':
        return [
          { id: 'send_offer',    label: 'Send Offer',    icon: 'send-outline',           color: Colors.primary, bg: Colors.primaryLight, primary: true },
          { id: 'cancel',        label: 'Cancel',        icon: 'close-circle-outline',   color: Colors.error,   bg: Colors.errorLight,   destructive: true },
        ];
      case 'offer_sent':
        return [
          { id: 'hire',          label: 'Hire Worker',   icon: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successLight, primary: true },
          { id: 'decline_offer', label: 'Decline',       icon: 'close-circle-outline',   color: Colors.error,   bg: Colors.errorLight   },
          { id: 'extend_deadline', label: 'Extend Deadline', icon: 'calendar-outline',   color: Colors.info,    bg: Colors.infoLight    },
        ];
      case 'accepted':
        return [
          { id: 'extend_deadline', label: 'Extend Deadline', icon: 'calendar-outline',   color: Colors.warning, bg: Colors.warningLight },
          { id: 'cancel',          label: 'Cancel Project', icon: 'ban-outline',          color: Colors.error,   bg: Colors.errorLight,  destructive: true },
        ];
      case 'in_progress':
        return [
          { id: 'mark_complete',   label: 'Mark Complete',   icon: 'trophy-outline',     color: Colors.success, bg: Colors.successLight, primary: true },
          { id: 'extend_deadline', label: 'Extend Deadline', icon: 'calendar-outline',   color: Colors.info,    bg: Colors.infoLight    },
          { id: 'cancel',          label: 'Cancel Project',  icon: 'ban-outline',         color: Colors.error,   bg: Colors.errorLight,  destructive: true },
        ];
      case 'review_requested':
        return [
          { id: 'approve_work',    label: 'Approve Work',    icon: 'checkmark-done-outline', color: Colors.success, bg: Colors.successLight, primary: true },
          { id: 'request_revision', label: 'Request Revision', icon: 'refresh-outline',   color: Colors.warning, bg: Colors.warningLight },
          { id: 'extend_deadline', label: 'Extend Deadline', icon: 'calendar-outline',   color: Colors.info,    bg: Colors.infoLight    },
        ];
      case 'completed':
        return [
          { id: 'leave_review', label: 'Leave Review', icon: 'star-outline', color: Colors.primary, bg: Colors.primaryLight, primary: true },
        ];
      default:
        return [];
    }
  } else {
    // Provider
    switch (ps) {
      case 'offer_sent':
        return [
          { id: 'accept_offer_provider', label: 'Accept Offer',     icon: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successLight, primary: true },
          { id: 'request_clarification', label: 'Ask Question',     icon: 'help-circle-outline',      color: Colors.info,    bg: Colors.infoLight    },
          { id: 'decline_offer',         label: 'Decline Offer',    icon: 'close-circle-outline',     color: Colors.error,   bg: Colors.errorLight   },
        ];
      case 'accepted':
        return [
          { id: 'start_work',            label: 'Start Work',       icon: 'construct-outline',        color: Colors.primary, bg: Colors.primaryLight, primary: true },
          { id: 'request_clarification', label: 'Ask Question',     icon: 'help-circle-outline',      color: Colors.info,    bg: Colors.infoLight    },
        ];
      case 'in_progress':
        return [
          { id: 'submit_work',           label: 'Submit Work',      icon: 'cloud-upload-outline',     color: Colors.success, bg: Colors.successLight, primary: true },
          { id: 'ready_for_review',      label: 'Ready for Review', icon: 'eye-outline',              color: Colors.warning, bg: Colors.warningLight },
          { id: 'request_clarification', label: 'Ask Question',     icon: 'help-circle-outline',      color: Colors.info,    bg: Colors.infoLight    },
        ];
      case 'review_requested':
        return [
          { id: 'request_clarification', label: 'Ask Question',     icon: 'help-circle-outline',      color: Colors.info,    bg: Colors.infoLight    },
        ];
      case 'completed':
        return [
          { id: 'leave_review', label: 'Leave Review', icon: 'star-outline', color: Colors.primary, bg: Colors.primaryLight, primary: true },
        ];
      default:
        return [];
    }
  }
}

// ── Action Sheet Modal ────────────────────────────────────────

interface ActionSheetProps {
  visible: boolean;
  title: string;
  desc?: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ActionSheet({ visible, title, desc, onClose, children }: ActionSheetProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>{title}</Text>
          {desc ? <Text style={styles.sheetDesc}>{desc}</Text> : null}
          {children}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────

export function ProjectActions({
  booking,
  userId,
  onStatusChange,
  onNavigateReview,
}: ProjectActionsProps) {
  const [loading, setLoading]   = useState<ActionId | null>(null);
  const [modal,   setModal]     = useState<ActionId | null>(null);

  // Modal input states
  const [offerPrice,    setOfferPrice]    = useState(String(booking.price ?? ''));
  const [offerNote,     setOfferNote]     = useState('');
  const [deadlineText,  setDeadlineText]  = useState('');
  const [revisionNote,  setRevisionNote]  = useState('');
  const [clarifyText,   setClarifyText]   = useState('');
  const [workSummary,   setWorkSummary]   = useState('');

  const isClient     = userId === booking.client_id;
  const actions      = getActions(booking, isClient);
  const banner       = getContextBanner(booking.project_status, isClient);

  if (actions.length === 0 && !banner) return null;

  // ── Action router ───────────────────────────────────────────

  const openModal = (id: ActionId) => {
    // Reset inputs
    setOfferPrice(String(booking.price ?? ''));
    setOfferNote('');
    setDeadlineText('');
    setRevisionNote('');
    setClarifyText('');
    setModal(id);
  };

  const closeModal = () => setModal(null);

  const press = async (id: ActionId) => {
    // Actions that need a modal
    if (id === 'send_offer')             { openModal('send_offer');             return; }
    if (id === 'extend_deadline')        { openModal('extend_deadline');        return; }
    if (id === 'request_revision')       { openModal('request_revision');       return; }
    if (id === 'request_clarification')  { openModal('request_clarification');  return; }
    if (id === 'submit_work')            { setWorkSummary(''); openModal('submit_work'); return; }

    // Instant navigations
    if (id === 'leave_review') { onNavigateReview(); return; }

    // Confirmable actions
    const confirms: Partial<Record<ActionId, [string, string]>> = {
      hire:                 ['Hire Worker',     'Accept this offer and hire the worker?'],
      decline_offer:        ['Decline Offer',   'Decline and close this project?'],
      cancel:               ['Cancel Project',  'This cannot be undone. Cancel this project?'],
      mark_complete:        ['Mark Complete',   'Mark this project as completed?'],
      approve_work:         ['Approve Work',    'Approve the submitted deliverables and complete the project?'],
      accept_offer_provider:['Accept Offer',    'Accept this offer and confirm the project?'],
      start_work:           ['Start Work',      'Mark this project as in progress? The client will be notified.'],
      ready_for_review:     ['Mark Ready',      'Notify the client that your work is ready for review?'],
    };

    const pair = confirms[id];
    if (pair) {
      Alert.alert(pair[0], pair[1], [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: id === 'cancel' ? 'destructive' : 'default', onPress: () => execute(id) },
      ]);
    } else {
      await execute(id);
    }
  };

  const execute = async (id: ActionId, extras?: Record<string, string>) => {
    setLoading(id);
    closeModal();
    try {
      let updated = booking;

      switch (id) {
        // ── Client actions ─────────────────────────────────────

        case 'send_offer': {
          const price = parseFloat(extras?.price ?? offerPrice);
          if (isNaN(price) || price <= 0) throw new Error('Enter a valid price.');
          updated = await formalizeOffer(booking.id, price, extras?.note ?? offerNote);
          break;
        }

        case 'hire': {
          updated = await updateBookingStatus(booking.id, 'accepted');
          await sendSystemMessage(
            booking.id, userId,
            'Offer accepted — work can now begin.',
            'offer_accepted', '',
            'checkmark-circle-outline',
          );
          break;
        }

        case 'decline_offer': {
          await setProjectStatus(booking.id, 'cancelled');
          await sendSystemMessage(
            booking.id, userId,
            isClient
              ? '❌ Offer declined.'
              : '❌ Offer declined by worker. You may post the request again to find someone else.',
            'project_started', '',
            'close-circle-outline',
          );
          updated = { ...booking, project_status: 'cancelled' };
          break;
        }

        case 'approve_work': {
          updated = await approveAndComplete(booking.id, booking.request_id);
          break;
        }

        case 'request_revision': {
          await requestRevisionOnDeliverables(booking.id, userId, extras?.note ?? revisionNote);
          // booking status stays in_progress — project_status trigger handles it
          break;
        }

        case 'extend_deadline': {
          const note = extras?.deadline ?? deadlineText;
          if (!note.trim()) throw new Error('Enter a new deadline.');
          if (booking.request_id) {
            // Try to parse as a real date; fallback to storing as note
            const parsed = new Date(note);
            if (!isNaN(parsed.getTime())) {
              await extendDeadline(booking.request_id, parsed.toISOString());
            }
          }
          await sendSystemMessage(
            booking.id, userId,
            `Deadline extended to: ${note.trim()}`,
            'project_started', '',
            'calendar-outline',
          );
          break;
        }

        case 'mark_complete': {
          updated = await updateBookingStatus(booking.id, 'completed');
          break;
        }

        case 'cancel': {
          updated = await updateBookingStatus(booking.id, 'cancelled');
          break;
        }

        // ── Provider actions ───────────────────────────────────

        case 'accept_offer_provider': {
          updated = await acceptOffer(booking.id);
          await sendSystemMessage(
            booking.id, userId,
            '✅ Offer accepted — project is now confirmed. Work will begin soon.',
            'offer_accepted', '',
            'checkmark-circle-outline',
          );
          break;
        }

        case 'start_work': {
          updated = await updateBookingStatus(booking.id, 'in_progress');
          await sendSystemMessage(
            booking.id, userId,
            '🔨 Work has started. You\'ll be notified when it\'s ready for review.',
            'project_started', '',
            'construct-outline',
          );
          break;
        }

        case 'ready_for_review': {
          await setProjectStatus(booking.id, 'review_requested');
          await sendSystemMessage(
            booking.id, userId,
            'Work is ready for your review — please check the Deliverables tab.',
            'project_started', '',
            'eye-outline',
          );
          break;
        }

        case 'submit_work': {
          // submitWork() already sets project_status → review_requested
          // and posts the summary as a regular chat message.
          // The DB trigger fires automatically and emits a system message.
          const summary = extras?.summary ?? workSummary;
          await submitWork(booking.id, userId, summary.trim());
          break;
        }

        case 'request_clarification': {
          const q = extras?.note ?? clarifyText;
          if (!q.trim()) throw new Error('Enter your question.');
          await sendMessage(booking.id, userId, `❓ ${q.trim()}`);
          break;
        }
      }

      onStatusChange(updated);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Action failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <>
      <View style={styles.container}>

        {/* ── Context banner ── */}
        {banner && (
          <View style={[styles.banner, { borderLeftColor: banner.color }]}>
            <Text style={styles.bannerEmoji}>{banner.emoji}</Text>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: banner.color }]}>{banner.title}</Text>
              <Text style={styles.bannerSub}>{banner.subtitle}</Text>
            </View>
          </View>
        )}

        {/* ── Action buttons ── */}
        {actions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsRow}
          >
            {actions.map(action => {
              const busy = loading === action.id;
              const isPrimary = !!action.primary;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionBtn,
                    isPrimary
                      ? [styles.actionBtnPrimary, { backgroundColor: action.color }]
                      : [styles.actionBtnSecondary, {
                          backgroundColor: action.bg,
                          borderColor: action.color + '40',
                        }],
                  ]}
                  onPress={() => press(action.id)}
                  disabled={loading !== null}
                  activeOpacity={0.78}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={isPrimary ? '#fff' : action.color} />
                  ) : (
                    <Ionicons name={action.icon} size={15} color={isPrimary ? '#fff' : action.color} />
                  )}
                  <Text style={[styles.actionBtnText, { color: isPrimary ? '#fff' : action.color }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Send Offer sheet ── */}
      <ActionSheet
        visible={modal === 'send_offer'}
        title="Send Offer"
        desc="Specify your price and any notes for the worker."
        onClose={closeModal}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Price ($)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. 150"
            placeholderTextColor={Colors.muted}
            value={offerPrice}
            onChangeText={setOfferPrice}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldTextarea]}
            placeholder="Add context for the worker…"
            placeholderTextColor={Colors.muted}
            value={offerNote}
            onChangeText={setOfferNote}
            multiline
          />
        </View>
        <View style={styles.sheetBtns}>
          <TouchableOpacity style={styles.sheetBtnCancel} onPress={closeModal}>
            <Text style={styles.sheetBtnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetBtnConfirm}
            onPress={() => execute('send_offer', { price: offerPrice, note: offerNote })}
          >
            <Ionicons name="send-outline" size={15} color="#fff" />
            <Text style={styles.sheetBtnConfirmText}>Send Offer</Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>

      {/* ── Extend Deadline sheet ── */}
      <ActionSheet
        visible={modal === 'extend_deadline'}
        title="Extend Deadline"
        desc="Enter the new deadline. We'll notify the worker and update the project."
        onClose={closeModal}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>New Deadline</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. Friday June 28, 2026 or 2026-06-28"
            placeholderTextColor={Colors.muted}
            value={deadlineText}
            onChangeText={setDeadlineText}
            autoFocus
          />
          <Text style={styles.fieldHint}>
            Accepted: "Friday June 28", "2026-06-28", or any date description.
          </Text>
        </View>
        <View style={styles.sheetBtns}>
          <TouchableOpacity style={styles.sheetBtnCancel} onPress={closeModal}>
            <Text style={styles.sheetBtnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetBtnConfirm}
            onPress={() => execute('extend_deadline', { deadline: deadlineText })}
          >
            <Ionicons name="calendar-outline" size={15} color="#fff" />
            <Text style={styles.sheetBtnConfirmText}>Extend</Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>

      {/* ── Request Revision sheet ── */}
      <ActionSheet
        visible={modal === 'request_revision'}
        title="Request Revision"
        desc="Describe what needs to be changed. The worker will be notified."
        onClose={closeModal}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>What needs to change?</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldTextarea]}
            placeholder="Be specific — describe the changes clearly…"
            placeholderTextColor={Colors.muted}
            value={revisionNote}
            onChangeText={setRevisionNote}
            multiline
            autoFocus
          />
        </View>
        <View style={styles.sheetBtns}>
          <TouchableOpacity style={styles.sheetBtnCancel} onPress={closeModal}>
            <Text style={styles.sheetBtnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetBtnConfirm, { backgroundColor: Colors.warning }]}
            onPress={() => execute('request_revision', { note: revisionNote })}
          >
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.sheetBtnConfirmText}>Request Revision</Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>

      {/* ── Submit Work sheet ── */}
      <ActionSheet
        visible={modal === 'submit_work'}
        title="Submit Work"
        desc="Describe what you've completed. The client will be notified for review."
        onClose={closeModal}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Work Summary</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldTextarea]}
            placeholder="Describe what was completed, any notes for the client…"
            placeholderTextColor={Colors.muted}
            value={workSummary}
            onChangeText={setWorkSummary}
            multiline
            autoFocus
          />
          <Text style={styles.fieldHint}>
            You can also attach files in the Deliverables tab before submitting.
          </Text>
        </View>
        <View style={styles.sheetBtns}>
          <TouchableOpacity style={styles.sheetBtnCancel} onPress={closeModal}>
            <Text style={styles.sheetBtnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetBtnConfirm, { backgroundColor: Colors.success }]}
            onPress={() => execute('submit_work', { summary: workSummary })}
          >
            <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
            <Text style={styles.sheetBtnConfirmText}>Submit Work</Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>

      {/* ── Request Clarification sheet ── */}
      <ActionSheet
        visible={modal === 'request_clarification'}
        title="Ask a Question"
        desc="This will be sent as a message in the conversation."
        onClose={closeModal}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Your question</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldTextarea]}
            placeholder="What do you need clarified?"
            placeholderTextColor={Colors.muted}
            value={clarifyText}
            onChangeText={setClarifyText}
            multiline
            autoFocus
          />
        </View>
        <View style={styles.sheetBtns}>
          <TouchableOpacity style={styles.sheetBtnCancel} onPress={closeModal}>
            <Text style={styles.sheetBtnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetBtnConfirm}
            onPress={() => execute('request_clarification', { note: clarifyText })}
          >
            <Ionicons name="send-outline" size={15} color="#fff" />
            <Text style={styles.sheetBtnConfirmText}>Send</Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 4 : 6,
  },

  // ── Context banner ──────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.md,
    marginTop: 10,
    marginBottom: 4,
    paddingLeft: 10,
    paddingVertical: 8,
    paddingRight: 8,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bannerEmoji: { fontSize: 18 },
  bannerText:  { flex: 1, gap: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '700' },
  bannerSub:   { fontSize: 11, color: Colors.muted, lineHeight: 15 },

  // ── Action buttons ──────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  actionBtnPrimary:   { borderWidth: 0 },
  actionBtnSecondary: { borderWidth: 1 },
  actionBtnText:      { fontSize: 13, fontWeight: '700' },

  // ── Action sheet (modal bottom sheet) ──────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    gap: 14,
    ...Shadow.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  sheetDesc:  { fontSize: 13, color: Colors.muted, lineHeight: 18, marginTop: -6 },

  // Form fields
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.text,
  },
  fieldTextarea: { minHeight: 88, textAlignVertical: 'top', paddingTop: 11 },
  fieldHint:     { fontSize: 11, color: Colors.muted, lineHeight: 15, marginTop: 2 },

  // Sheet buttons
  sheetBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  sheetBtnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sheetBtnCancelText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sheetBtnConfirm: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  sheetBtnConfirmText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
