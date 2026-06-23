/**
 * InboxScreen
 *
 * The professional messaging inbox — shows all active conversations,
 * each anchored to a real business event (job application, service inquiry,
 * accepted offer, active project). No cold DMs. No random messaging.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getConversations } from '../../api/bookings';
import { ConversationSummary, ConversationContextType, CONVERSATION_CONTEXT_META, InboxStackParamList } from '../../types';
import { Avatar } from '../../components/Avatar';
import { timeAgo, formatCurrency } from '../../utils/helpers';
import { ProjectStatusStepper } from '../../components/ProjectStatusStepper';

type Props = NativeStackScreenProps<InboxStackParamList, 'Inbox'>;

// ── Filter tabs ───────────────────────────────────────────────
type FilterTab = 'all' | 'active' | 'pending';
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'active',  label: 'Active'  },
  { key: 'pending', label: 'Pending' },
];

const ACTIVE_STATUSES  = new Set(['accepted', 'in_progress']);
const PENDING_STATUSES = new Set(['pending']);

// ── Context pill colour map ───────────────────────────────────
function contextColor(type: ConversationContextType): string {
  return CONVERSATION_CONTEXT_META[type]?.color ?? Colors.muted;
}

function contextLabel(type: ConversationContextType): string {
  return CONVERSATION_CONTEXT_META[type]?.label ?? type;
}

function contextIcon(type: ConversationContextType): string {
  return CONVERSATION_CONTEXT_META[type]?.icon ?? 'chatbubble-outline';
}

// ── Status badge ──────────────────────────────────────────────
// ── Due date helpers ──────────────────────────────────────────
function formatDueShort(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff <= 6)  return 'Due ' + new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  return 'Due ' + new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueDateColor(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return Colors.error;
  if (diff <= 2) return Colors.warning;
  return Colors.success;
}


// ── Empty state ───────────────────────────────────────────────
function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { icon: string; title: string; sub: string }> = {
    all: {
      icon: 'chatbubbles-outline',
      title: 'No conversations yet',
      sub: 'Your messages will appear here once you apply to a job, contact a service, or accept an offer.',
    },
    active: {
      icon: 'construct-outline',
      title: 'No active projects',
      sub: 'Projects in progress or with accepted offers show here.',
    },
    pending: {
      icon: 'time-outline',
      title: 'Nothing pending',
      sub: 'Conversations waiting for a response will appear here.',
    },
  };
  const { icon, title, sub } = messages[filter];
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon as any} size={36} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

// ── Conversation row ──────────────────────────────────────────
interface RowProps {
  convo: ConversationSummary;
  isProvider: boolean;
  onPress: () => void;
}

function ConversationRow({ convo, isProvider, onPress }: RowProps) {
  const otherName   = isProvider ? convo.client_name   : convo.provider_name;
  const otherAvatar = isProvider ? convo.client_avatar : convo.provider_avatar;
  const ctxColor    = contextColor(convo.context_type);
  const ctxLabel    = contextLabel(convo.context_type);
  const ctxIcon     = contextIcon(convo.context_type);
  const budget      = convo.booking_price ?? convo.request_budget;
  const dueDate     = convo.deadline_date ?? convo.scheduled_at;

  // Last message preview — soften system messages
  const lastPreview = convo.last_message
    ? convo.last_is_system
      ? `📌 ${convo.last_message}`
      : convo.last_message
    : 'No messages yet';

  const isUnread = false; // extend with unread count later

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      {/* Left accent bar keyed to context colour */}
      <View style={[styles.rowAccent, { backgroundColor: ctxColor }]} />

      {/* Avatar */}
      <Avatar uri={otherAvatar} name={otherName} size={46} />

      {/* Main content */}
      <View style={styles.rowContent}>
        {/* Top line: name + timestamp */}
        <View style={styles.rowTopLine}>
          <Text style={[styles.rowName, isUnread && styles.rowNameUnread]} numberOfLines={1}>
            {otherName}
          </Text>
          {convo.last_message_at && (
            <Text style={styles.rowTime}>{timeAgo(convo.last_message_at)}</Text>
          )}
        </View>

        {/* Project title */}
        <Text style={styles.rowProject} numberOfLines={1}>{convo.project_title}</Text>

        {/* Last message */}
        <Text style={[styles.rowPreview, isUnread && styles.rowPreviewUnread]} numberOfLines={1}>
          {lastPreview}
        </Text>

        {/* Project meta: budget + due date */}
        {(budget != null || dueDate) && (
          <View style={styles.projectMeta}>
            {budget != null && (
              <View style={styles.metaChip}>
                <Ionicons name="cash-outline" size={10} color={Colors.success} />
                <Text style={[styles.metaChipText, { color: Colors.success }]}>
                  {formatCurrency(budget)}
                </Text>
              </View>
            )}
            {dueDate && (
              <View style={[styles.metaChip, { backgroundColor: dueDateColor(dueDate) + '12' }]}>
                <Ionicons name="calendar-outline" size={10} color={dueDateColor(dueDate)} />
                <Text style={[styles.metaChipText, { color: dueDateColor(dueDate) }]}>
                  {formatDueShort(dueDate)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom: context type pill + compact status stepper */}
        <View style={styles.rowBottom}>
          <View style={[styles.ctxPill, { backgroundColor: ctxColor + '18' }]}>
            <Ionicons name={ctxIcon as any} size={10} color={ctxColor} />
            <Text style={[styles.ctxPillText, { color: ctxColor }]}>{ctxLabel}</Text>
          </View>
          <ProjectStatusStepper status={convo.project_status} compact />
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color={Colors.muted} style={styles.chevron} />
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────
export function InboxScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isProvider = user?.profile?.role === 'provider';

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [filter, setFilter]               = useState<FilterTab>('all');

  const load = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const data = await getConversations(user.id);
      setConversations(data);
    } catch (e) {
      console.error('InboxScreen load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  // Apply filter
  const filtered = conversations.filter(c => {
    if (filter === 'active')  return ACTIVE_STATUSES.has(c.booking_status);
    if (filter === 'pending') return PENDING_STATUSES.has(c.booking_status);
    return true;
  });

  // Count badges for tabs
  const counts: Record<FilterTab, number> = {
    all:     conversations.length,
    active:  conversations.filter(c => ACTIVE_STATUSES.has(c.booking_status)).length,
    pending: conversations.filter(c => PENDING_STATUSES.has(c.booking_status)).length,
  };

  function openConversation(convo: ConversationSummary) {
    const otherUserName = isProvider ? convo.client_name : convo.provider_name;
    navigation.navigate('Chat', {
      bookingId:    convo.booking_id,
      otherUserName,
      contextType:  convo.context_type,
      contextLabel: convo.context_label,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSub}>
            {conversations.length > 0
              ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
              : 'No conversations yet'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => (navigation as any).navigate('Notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Context explainer banner */}
      <View style={styles.contextBanner}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.primary} />
        <Text style={styles.contextBannerText}>
          All conversations are linked to real projects — no cold messages.
        </Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map(tab => {
          const active = filter === tab.key;
          const count  = counts[tab.key];
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.booking_id}
          renderItem={({ item }) => (
            <ConversationRow
              convo={item}
              isProvider={isProvider}
              onPress={() => openConversation(item)}
            />
          )}
          ListEmptyComponent={<EmptyState filter={filter} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={filtered.length === 0 ? styles.listEmpty : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  headerSub:   { fontSize: 12, color: Colors.muted, marginTop: 1 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Context banner
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '80',
  },
  contextBannerText: { fontSize: 12, color: Colors.primary, fontWeight: '500', flex: 1 },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText:       { fontSize: 13, fontWeight: '600', color: Colors.muted },
  filterTabTextActive: { color: '#fff' },
  filterBadge: {
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeActive:     { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText:       { fontSize: 10, fontWeight: '700', color: Colors.muted },
  filterBadgeTextActive: { color: '#fff' },

  // Loading / empty
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 32 },
  listEmpty:   { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  emptySub:   { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 14,
    paddingRight: Spacing.md,
    gap: 12,
  },
  rowPressed: { opacity: 0.85, backgroundColor: Colors.background },
  rowAccent:  { width: 3, alignSelf: 'stretch', borderRadius: 2, marginLeft: 0 },
  rowContent: { flex: 1, gap: 3 },
  rowTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName:           { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  rowNameUnread:     { fontWeight: '800' },
  rowTime:           { fontSize: 11, color: Colors.muted, marginLeft: 6 },
  rowProject:        { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  rowPreview:        { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  rowPreviewUnread:  { color: Colors.text, fontWeight: '500' },

  rowPills: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ctxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  ctxPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  chevron: { marginLeft: 4 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 3 + 12 + 46 + 12 },

  // Project meta chips (budget / due date)
  projectMeta: { flexDirection: 'row', gap: 6, marginTop: 2 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  metaChipText: { fontSize: 10, fontWeight: '700' },
});
