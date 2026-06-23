/**
 * ProjectWorkspaceScreen
 *
 * Three-panel project management layout:
 *   Left  sidebar  — project list (Active / Pending / Completed)
 *   Center         — Conversation / Deliverables / Updates tabs
 *   Right sidebar  — Budget · Deadline · Client · Worker · Details
 *
 * Feels like Linear / Notion, not a chat app.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  HomeStackParamList,
  Message,
  Booking,
  ConversationSummary,
  ConversationContextType,
  CONVERSATION_CONTEXT_META,
} from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import {
  getMessages,
  sendMessage,
  sendSystemMessage,
  getBookingById,
  getConversations,
} from '../../api/bookings';
import { supabase } from '../../api/supabase';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { ProjectActions } from '../../components/ProjectActions';
import { DeliverablesTab } from '../../components/DeliverablesTab';
import { MessageTemplates } from '../../components/MessageTemplates';
import { ProjectContextCard } from '../../components/ProjectContextCard';
import { ProjectTimeline } from '../../components/ProjectTimeline';
import { ProjectStatusStepper } from '../../components/ProjectStatusStepper';
import {
  formatCurrency,
  formatDate,
  getBookingStatusLabel,
  getStatusColor,
  timeAgo,
} from '../../utils/helpers';

type Props = NativeStackScreenProps<HomeStackParamList, 'Chat'>;
type WorkspaceTab = 'conversation' | 'deliverables' | 'updates';

const TABS: { key: WorkspaceTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'conversation', label: 'Chat',         icon: 'chatbubbles-outline' },
  { key: 'deliverables', label: 'Deliverables', icon: 'checkbox-outline'    },
  { key: 'updates',      label: 'Timeline',     icon: 'time-outline'        },
];

const LEFT_PANEL_WIDTH  = Math.min(Dimensions.get('window').width * 0.80, 300);
const RIGHT_PANEL_WIDTH = Math.min(Dimensions.get('window').width * 0.85, 320);

// ── Helpers ───────────────────────────────────────────────────

function formatDue(dateStr: string): string {
  const d    = new Date(dateStr);
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0)  return 'Due Today';
  if (diff === 1)  return 'Due Tomorrow';
  if (diff < 0)   return `${Math.abs(diff)}d Overdue`;
  if (diff <= 6)  return 'Due ' + d.toLocaleDateString('en-US', { weekday: 'long' });
  return 'Due ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueDateColor(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return Colors.error;
  if (diff <= 2) return Colors.warning;
  return Colors.success;
}

// ── Left Panel: single conversation row ───────────────────────
function ProjectRow({
  convo,
  isActive,
  isProvider,
  onPress,
}: {
  convo: ConversationSummary;
  isActive: boolean;
  isProvider: boolean;
  onPress: () => void;
}) {
  const ctxMeta    = CONVERSATION_CONTEXT_META[convo.context_type];
  const ctxColor   = ctxMeta?.color ?? Colors.muted;
  const otherName  = isProvider ? convo.client_name : convo.provider_name;
  const statusColor = convo.booking_status === 'in_progress' ? Colors.primary
                    : convo.booking_status === 'accepted'    ? Colors.success
                    : convo.booking_status === 'completed'   ? Colors.success
                    : Colors.muted;

  return (
    <TouchableOpacity
      style={[styles.projectRow, isActive && styles.projectRowActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Accent */}
      <View style={[styles.projectRowAccent, { backgroundColor: ctxColor }]} />

      <View style={styles.projectRowContent}>
        {/* Title + status dot */}
        <View style={styles.projectRowTop}>
          <Text
            style={[styles.projectRowTitle, isActive && styles.projectRowTitleActive]}
            numberOfLines={1}
          >
            {convo.project_title}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>

        {/* Other user */}
        <Text style={styles.projectRowUser} numberOfLines={1}>{otherName}</Text>

        {/* Last message */}
        {convo.last_message ? (
          <Text style={styles.projectRowPreview} numberOfLines={1}>
            {convo.last_is_system ? '📌 ' : ''}{convo.last_message}
          </Text>
        ) : null}

        {/* Timestamp */}
        {convo.last_message_at && (
          <Text style={styles.projectRowTime}>{timeAgo(convo.last_message_at)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Left Panel: section header ────────────────────────────────
function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{label}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

// ── Right panel: stat card ────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Right panel: person card ──────────────────────────────────
function PersonCard({
  label,
  name,
  avatar,
  sub,
  badge,
  badgeColor,
  stats,
}: {
  label: string;
  name: string;
  avatar?: string | null;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  stats?: { icon: string; value: string }[];
}) {
  return (
    <View style={styles.personSection}>
      <Text style={styles.panelSectionLabel}>{label}</Text>
      <View style={styles.personCard}>
        <Avatar uri={avatar} name={name} size={42} />
        <View style={styles.personInfo}>
          <View style={styles.personNameRow}>
            <Text style={styles.personName} numberOfLines={1}>{name}</Text>
            {badge && (
              <View style={[styles.personBadge, { backgroundColor: (badgeColor ?? Colors.primary) + '18' }]}>
                <Text style={[styles.personBadgeText, { color: badgeColor ?? Colors.primary }]}>{badge}</Text>
              </View>
            )}
          </View>
          {sub && <Text style={styles.personSub}>{sub}</Text>}
          {stats && stats.length > 0 && (
            <View style={styles.personStats}>
              {stats.map((s, i) => (
                <View key={i} style={styles.personStat}>
                  <Ionicons name={s.icon as any} size={11} color={Colors.muted} />
                  <Text style={styles.personStatText}>{s.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────
export function ProjectWorkspaceScreen({ route, navigation }: Props) {
  const {
    bookingId,
    otherUserName,
    contextType  = 'offer_accepted',
    contextLabel = '',
  } = route.params;

  const { user } = useAuth();

  // Core state
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [booking,       setBooking]        = useState<Booking | null>(null);
  const [text,          setText]           = useState('');
  const [loading,       setLoading]        = useState(true);
  const [sending,       setSending]        = useState(false);
  const [activeTab,     setActiveTab]      = useState<WorkspaceTab>('conversation');

  // Left panel
  const [leftOpen,      setLeftOpen]       = useState(false);
  const [conversations, setConversations]  = useState<ConversationSummary[]>([]);
  const leftAnim = useRef(new Animated.Value(-LEFT_PANEL_WIDTH)).current;

  // Right panel
  const [rightOpen,     setRightOpen]      = useState(false);
  const rightAnim = useRef(new Animated.Value(RIGHT_PANEL_WIDTH)).current;

  const flatRef = useRef<FlatList>(null);

  // ── Data loading ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [msgs, bk] = await Promise.all([
        getMessages(bookingId),
        getBookingById(bookingId),
      ]);
      setMessages(msgs);
      setBooking(bk);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load conversation list for left panel
  useEffect(() => {
    if (!user?.id) return;
    getConversations(user.id)
      .then(setConversations)
      .catch(console.error);
  }, [user?.id]);

  // Real-time messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'messages', filter: `booking_id=eq.${bookingId}`,
      }, async () => {
        const fresh = await getMessages(bookingId);
        setMessages(fresh);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // ── Panel animations ──────────────────────────────────────────
  const spring = (anim: Animated.Value, toValue: number, cb?: () => void) =>
    Animated.spring(anim, { toValue, useNativeDriver: true, tension: 80, friction: 12 }).start(cb);

  const openLeft  = () => { setLeftOpen(true);  spring(leftAnim, 0); };
  const closeLeft = () => { spring(leftAnim, -LEFT_PANEL_WIDTH, () => setLeftOpen(false)); };

  const openRight  = () => { setRightOpen(true);  spring(rightAnim, 0); };
  const closeRight = () => { spring(rightAnim, RIGHT_PANEL_WIDTH, () => setRightOpen(false)); };

  // ── Send message ──────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !user?.id || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    try {
      const isFirstMessage = messages.filter(m => !m.is_system).length === 0;
      if (isFirstMessage) {
        const meta = CONVERSATION_CONTEXT_META[contextType];
        await sendSystemMessage(
          bookingId, user.id,
          `${meta.label}: ${contextLabel || 'This conversation is linked to a project on TeenWorks.'}`,
          contextType, contextLabel, meta.icon,
        );
      }
      await sendMessage(bookingId, user.id, body, contextType, contextLabel);
    } finally {
      setSending(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────
  const isClient    = user?.id === booking?.client_id;
  const statusColor = booking ? getStatusColor(booking.status) : Colors.muted;
  const dueDate     = booking?.request?.deadline_date ?? booking?.request?.scheduled_at ?? null;
  const budget      = booking?.price ?? booking?.request?.budget ?? null;

  // Group conversations for left panel
  const activeConvos    = conversations.filter(c => ['accepted', 'in_progress'].includes(c.booking_status));
  const pendingConvos   = conversations.filter(c => c.booking_status === 'pending');
  const completedConvos = conversations.filter(c => ['completed', 'cancelled'].includes(c.booking_status));

  function switchConversation(convo: ConversationSummary) {
    closeLeft();
    const otherName = isClient ? convo.provider_name : convo.client_name;
    // Small delay for panel to close before navigating
    setTimeout(() => {
      navigation.replace('Chat', {
        bookingId:    convo.booking_id,
        otherUserName: otherName,
        contextType:  convo.context_type as ConversationContextType,
        contextLabel: convo.context_label,
      });
    }, 200);
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading project…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* ════════════════════════════════════════════════════════
          HEADER — slim, PM-software feel
      ════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        {/* Left controls */}
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={openLeft}>
            <Ionicons name="menu-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Center — project title + status */}
        <TouchableOpacity style={styles.headerCenter} onPress={openRight} activeOpacity={0.7}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {booking?.request?.title ?? otherUserName}
          </Text>
          <View style={[styles.headerStatusPill, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.headerStatusText, { color: statusColor }]}>
              {getBookingStatusLabel(booking?.status ?? 'pending')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right controls */}
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconBtn, styles.infoBtnActive]} onPress={openRight}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════
          TAB BAR
      ════════════════════════════════════════════════════════ */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? Colors.primary : Colors.muted}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.key === 'conversation' && messages.filter(m => !m.is_system).length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: Colors.primary }]}>
                <Text style={[styles.tabBadgeText, { color: '#fff' }]}>
                  {messages.filter(m => !m.is_system).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ════════════════════════════════════════════════════════
          PROJECT CONTEXT CARD (pinned above messages)
      ════════════════════════════════════════════════════════ */}
      {booking && activeTab === 'conversation' && (
        <ProjectContextCard
          booking={booking}
          contextType={contextType as ConversationContextType}
          contextLabel={contextLabel}
          onViewProject={openRight}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          CENTER CONTENT
      ════════════════════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Conversation tab ── */}
        {activeTab === 'conversation' && (
          <>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={i => i.id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                // System event pill
                if (item.is_system) {
                  return (
                    <View style={styles.systemMsgWrap}>
                      <View style={styles.systemMsgLine} />
                      <View style={styles.systemMsgPill}>
                        <Ionicons
                          name={(item.system_icon ?? 'information-circle-outline') as any}
                          size={12}
                          color={Colors.muted}
                        />
                        <Text style={styles.systemMsgText}>{item.body}</Text>
                      </View>
                      <View style={styles.systemMsgLine} />
                    </View>
                  );
                }

                // User message
                const mine     = item.sender_id === user?.id;
                const prevMsg  = messages[index - 1];
                const showAvatar = !mine && (!prevMsg || prevMsg.sender_id !== item.sender_id || prevMsg.is_system);
                const timeStr  = new Date(item.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric', minute: '2-digit',
                });
                return (
                  <View style={[styles.msgRow, mine && styles.msgRowMine]}>
                    {!mine && (
                      <View style={styles.avatarSpace}>
                        {showAvatar && (
                          <Avatar
                            uri={item.sender?.avatar_url}
                            name={item.sender?.full_name ?? ''}
                            size={28}
                          />
                        )}
                      </View>
                    )}
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                        {item.body}
                      </Text>
                      <Text style={[styles.timeText, mine && styles.timeTextMine]}>
                        {timeStr}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyCenter}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={36} color={Colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptySub}>
                    Start the conversation with {otherUserName}
                  </Text>
                </View>
              }
            />

            {/* Action bar (accept / complete / etc.) */}
            {booking && user?.id && (
              <ProjectActions
                booking={booking}
                userId={user.id}
                onStatusChange={async updated => {
                  setBooking(updated);
                  const fresh = await getMessages(bookingId);
                  setMessages(fresh);
                }}
                onNavigateReview={() =>
                  navigation.navigate('Review', {
                    bookingId,
                    revieweeId:   isClient ? booking.provider_id : booking.client_id,
                    revieweeName: otherUserName,
                    reviewerRole: isClient ? 'client' : 'provider',
                  })
                }
              />
            )}

            <MessageTemplates isClient={isClient} onSelect={t => setText(t)} />

            {/* Input bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Type a message…"
                placeholderTextColor={Colors.muted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="send" size={16} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Deliverables tab ── */}
        {activeTab === 'deliverables' && user?.id && (
          <DeliverablesTab
            bookingId={bookingId}
            userId={user.id}
            isClient={isClient}
          />
        )}

        {/* ── Timeline tab ── */}
        {activeTab === 'updates' && (
          <View style={styles.flex}>
            <ProjectTimeline bookingId={bookingId} />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ════════════════════════════════════════════════════════
          LEFT SIDEBAR — Project List
      ════════════════════════════════════════════════════════ */}
      {leftOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={closeLeft} />
          <Animated.View
            style={[styles.leftPanel, { transform: [{ translateX: leftAnim }] }]}
          >
            <SafeAreaView style={styles.flex}>
              {/* Panel header */}
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderLeft}>
                  <Ionicons name="folder-outline" size={18} color={Colors.primary} />
                  <Text style={styles.panelTitle}>Projects</Text>
                </View>
                <TouchableOpacity onPress={closeLeft} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={20} color={Colors.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.flex}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.leftPanelScroll}
              >
                {/* ── Active ── */}
                {activeConvos.length > 0 && (
                  <>
                    <SectionLabel label="Active" count={activeConvos.length} />
                    {activeConvos.map(c => (
                      <ProjectRow
                        key={c.booking_id}
                        convo={c}
                        isActive={c.booking_id === bookingId}
                        isProvider={!isClient}
                        onPress={() => switchConversation(c)}
                      />
                    ))}
                  </>
                )}

                {/* ── Pending ── */}
                {pendingConvos.length > 0 && (
                  <>
                    <SectionLabel label="Pending" count={pendingConvos.length} />
                    {pendingConvos.map(c => (
                      <ProjectRow
                        key={c.booking_id}
                        convo={c}
                        isActive={c.booking_id === bookingId}
                        isProvider={!isClient}
                        onPress={() => switchConversation(c)}
                      />
                    ))}
                  </>
                )}

                {/* ── Completed ── */}
                {completedConvos.length > 0 && (
                  <>
                    <SectionLabel label="Completed" count={completedConvos.length} />
                    {completedConvos.map(c => (
                      <ProjectRow
                        key={c.booking_id}
                        convo={c}
                        isActive={c.booking_id === bookingId}
                        isProvider={!isClient}
                        onPress={() => switchConversation(c)}
                      />
                    ))}
                  </>
                )}

                {conversations.length === 0 && (
                  <View style={styles.leftEmpty}>
                    <Ionicons name="folder-open-outline" size={32} color={Colors.muted} />
                    <Text style={styles.leftEmptyText}>No projects yet</Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          RIGHT SIDEBAR — Project Details
      ════════════════════════════════════════════════════════ */}
      {rightOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={closeRight} />
          <Animated.View
            style={[styles.rightPanel, { transform: [{ translateX: rightAnim }] }]}
          >
            <SafeAreaView style={styles.flex}>
              {/* Panel header */}
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderLeft}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                  <Text style={styles.panelTitle}>Project Details</Text>
                </View>
                <TouchableOpacity onPress={closeRight} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={20} color={Colors.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.flex}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.rightPanelScroll}
              >

                {/* ── Status stepper ── */}
                {booking?.project_status && (
                  <View style={styles.rightSection}>
                    <Text style={styles.panelSectionLabel}>Project Status</Text>
                    <View style={styles.stepperWrap}>
                      <ProjectStatusStepper status={booking.project_status} />
                    </View>
                  </View>
                )}

                {/* ── Key numbers ── */}
                {(budget != null || dueDate) && (
                  <View style={styles.rightSection}>
                    <Text style={styles.panelSectionLabel}>Key Details</Text>
                    <View style={styles.statGrid}>
                      {budget != null && (
                        <StatCard
                          icon="cash-outline"
                          label="Budget"
                          value={formatCurrency(budget)}
                          color={Colors.success}
                        />
                      )}
                      {dueDate && (
                        <StatCard
                          icon="calendar-outline"
                          label="Deadline"
                          value={formatDue(dueDate)}
                          color={dueDateColor(dueDate)}
                        />
                      )}
                      {booking?.created_at && (
                        <StatCard
                          icon="folder-open-outline"
                          label="Created"
                          value={timeAgo(booking.created_at)}
                          color={Colors.primary}
                        />
                      )}
                    </View>
                  </View>
                )}

                {/* ── Project info ── */}
                {booking?.request && (
                  <View style={styles.rightSection}>
                    <Text style={styles.panelSectionLabel}>Project Info</Text>
                    <View style={styles.infoCard}>
                      {/* Title */}
                      <View style={styles.infoRow}>
                        <Ionicons name="briefcase-outline" size={13} color={Colors.muted} />
                        <Text style={styles.infoKey}>Title</Text>
                        <Text style={styles.infoVal} numberOfLines={2}>{booking.request.title}</Text>
                      </View>

                      {/* Category */}
                      {booking.request.category && (
                        <View style={styles.infoRow}>
                          <Ionicons name="pricetag-outline" size={13} color={Colors.muted} />
                          <Text style={styles.infoKey}>Category</Text>
                          <View style={[
                            styles.categoryChip,
                            { backgroundColor: booking.request.category.color + '20' },
                          ]}>
                            <Text style={[
                              styles.categoryChipText,
                              { color: booking.request.category.color },
                            ]}>
                              {booking.request.category.name}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Location */}
                      {booking.request.address && (
                        <View style={styles.infoRow}>
                          <Ionicons name="location-outline" size={13} color={Colors.muted} />
                          <Text style={styles.infoKey}>Location</Text>
                          <Text style={styles.infoVal} numberOfLines={2}>{booking.request.address}</Text>
                        </View>
                      )}

                      {/* Status */}
                      <View style={styles.infoRow}>
                        <Ionicons name="ellipse-outline" size={13} color={Colors.muted} />
                        <Text style={styles.infoKey}>Status</Text>
                        <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.statusPillText, { color: statusColor }]}>
                            {getBookingStatusLabel(booking.status)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Description */}
                    {booking.request.description && (
                      <View style={styles.descBox}>
                        <Text style={styles.descLabel}>Description</Text>
                        <Text style={styles.descText}>{booking.request.description}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ── Client card ── */}
                {booking?.client && (
                  <PersonCard
                    label="Client"
                    name={booking.client.full_name}
                    avatar={booking.client.avatar_url}
                    sub={booking.client.phone ?? undefined}
                    badge="Client"
                    badgeColor={Colors.info}
                    stats={[
                      { icon: 'calendar-outline',   value: `Member since ${new Date(booking.client.created_at).getFullYear()}` },
                      ...(booking.client.identity_verified ? [{ icon: 'shield-checkmark-outline', value: 'ID Verified' }] : []),
                    ]}
                  />
                )}

                {/* ── Worker card ── */}
                {booking?.provider && (
                  <View style={styles.rightSection}>
                    <Text style={styles.panelSectionLabel}>Worker</Text>
                    <View style={styles.personCard}>
                      <Avatar
                        uri={booking.provider.avatar_url}
                        name={booking.provider.full_name}
                        size={42}
                        showOnlineIndicator
                        isOnline={booking.provider_profile?.is_available ?? false}
                      />
                      <View style={styles.personInfo}>
                        <View style={styles.personNameRow}>
                          <Text style={styles.personName} numberOfLines={1}>
                            {booking.provider.full_name}
                          </Text>
                          <View style={[styles.personBadge, { backgroundColor: Colors.primary + '18' }]}>
                            <Text style={[styles.personBadgeText, { color: Colors.primary }]}>Worker</Text>
                          </View>
                        </View>
                        {booking.provider_profile && (
                          <>
                            <View style={styles.ratingRow}>
                              <StarRating rating={booking.provider_profile.rating} size={11} />
                              <Text style={styles.ratingText}>
                                {booking.provider_profile.rating.toFixed(1)} · {booking.provider_profile.review_count} reviews
                              </Text>
                            </View>
                            <View style={styles.personStats}>
                              <View style={styles.personStat}>
                                <Ionicons name="shield-checkmark-outline" size={11} color={Colors.primary} />
                                <Text style={styles.personStatText}>
                                  Trust {booking.provider_profile.trust_score}
                                </Text>
                              </View>
                              <View style={styles.personStat}>
                                <Ionicons name="checkmark-circle-outline" size={11} color={Colors.success} />
                                <Text style={styles.personStatText}>
                                  {booking.provider_profile.completion_rate}% done
                                </Text>
                              </View>
                            </View>
                          </>
                        )}
                        {booking.provider_profile?.skills && booking.provider_profile.skills.length > 0 && (
                          <Text style={styles.personSub} numberOfLines={1}>
                            {booking.provider_profile.skills.slice(0, 3).join(' · ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Constants ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  flex:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: Colors.muted },

  // ── Header ───────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 3 },
  headerTitle:  { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  headerStatusText: { fontSize: 10, fontWeight: '700' },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '40',
  },

  // ── Tab bar ──────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive:  { borderBottomColor: Colors.primary },
  tabLabel:       { fontSize: 12, fontWeight: '600', color: Colors.muted },
  tabLabelActive: { color: Colors.primary },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.full,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },

  // ── Messages ─────────────────────────────────────────────────
  messageList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 6, flexGrow: 1 },
  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  msgRowMine:  { flexDirection: 'row-reverse' },
  avatarSpace: { width: 28, flexShrink: 0 },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 3,
  },
  bubbleMine:     { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOther:    { backgroundColor: Colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText:     { fontSize: 15, color: Colors.text, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  timeText:       { fontSize: 10, color: Colors.muted, alignSelf: 'flex-end' },
  timeTextMine:   { color: 'rgba(255,255,255,0.6)' },

  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySub:   { fontSize: 13, color: Colors.muted, textAlign: 'center', maxWidth: 220 },

  // ── System messages ──────────────────────────────────────────
  systemMsgWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  systemMsgLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  systemMsgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginHorizontal: 8,
  },
  systemMsgText: { fontSize: 11, color: Colors.muted, fontStyle: 'italic' },

  // ── Input ────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.muted },

  // ── Shared panel chrome ───────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.4)',
    zIndex: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },

  // ── LEFT panel ────────────────────────────────────────────────
  leftPanel: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: LEFT_PANEL_WIDTH,
    backgroundColor: Colors.card,
    zIndex: 21,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    ...Shadow.lg,
  },
  leftPanelScroll: { paddingBottom: 32 },

  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionLabelText: { fontSize: 10, fontWeight: '800', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionBadge: {
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.muted },

  projectRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingRight: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  projectRowActive: { backgroundColor: Colors.primaryLight },
  projectRowAccent: { width: 3, marginRight: 10, borderRadius: 2 },
  projectRowContent: { flex: 1, gap: 2 },
  projectRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  projectRowTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1 },
  projectRowTitleActive: { color: Colors.primary, fontWeight: '800' },
  projectRowUser:   { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  projectRowPreview: { fontSize: 11, color: Colors.muted, lineHeight: 16 },
  projectRowTime:   { fontSize: 10, color: Colors.muted, marginTop: 1 },

  leftEmpty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  leftEmptyText: { fontSize: 13, color: Colors.muted },

  // ── RIGHT panel ───────────────────────────────────────────────
  rightPanel: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: RIGHT_PANEL_WIDTH,
    backgroundColor: Colors.card,
    zIndex: 21,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    ...Shadow.lg,
  },
  rightPanelScroll: { paddingBottom: 40 },

  rightSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  panelSectionLabel: { fontSize: 10, fontWeight: '800', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },

  stepperWrap: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingLeft: 6,
    overflow: 'hidden',
  },

  // Stat cards
  statGrid: { gap: 8 },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    padding: 10,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: { gap: 2 },
  statLabel:   { fontSize: 10, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue:   { fontSize: 15, fontWeight: '800' },

  // Info card
  infoCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoKey: { fontSize: 12, color: Colors.muted, width: 68, flexShrink: 0 },
  infoVal: { fontSize: 12, color: Colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },

  descBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  descLabel: { fontSize: 10, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  descText:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  // Person cards
  personSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  personCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  personInfo:    { flex: 1, gap: 4 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personName:    { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  personBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  personBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  personSub:     { fontSize: 11, color: Colors.muted },
  personStats:   { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  personStat:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  personStatText: { fontSize: 11, color: Colors.muted },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, color: Colors.muted },

  // Shared
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  categoryChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  categoryChipText: { fontSize: 11, fontWeight: '700' },
});
