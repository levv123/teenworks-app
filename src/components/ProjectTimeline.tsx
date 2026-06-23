/**
 * ProjectTimeline
 *
 * A chronological, bottom-up event log for a project.
 * Pulled from the project_events table which is populated
 * automatically by DB triggers on every meaningful action.
 *
 * Groups events by date. Each event row shows:
 *   icon · title · actor · timestamp · optional detail
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import { ProjectEvent, ProjectEventType } from '../types';
import { getProjectTimeline } from '../api/bookings';
import { timeAgo } from '../utils/helpers';

// ── Event meta ────────────────────────────────────────────────
// Provides fallback icon/color if the DB values aren't populated
const EVENT_META: Record<ProjectEventType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  project_created:       { icon: 'folder-open-outline',      color: '#6C47FF', label: 'Project Created'          },
  offer_sent:            { icon: 'send-outline',             color: '#3B82F6', label: 'Offer Sent'               },
  offer_accepted:        { icon: 'checkmark-circle-outline', color: '#10B981', label: 'Offer Accepted'           },
  work_started:          { icon: 'construct-outline',        color: '#6C47FF', label: 'Work Started'             },
  deliverable_submitted: { icon: 'cloud-upload-outline',     color: '#3B82F6', label: 'Deliverables Submitted'   },
  revision_requested:    { icon: 'refresh-outline',          color: '#F59E0B', label: 'Revision Requested'       },
  deliverable_approved:  { icon: 'checkmark-done-outline',   color: '#10B981', label: 'Work Approved'            },
  project_completed:     { icon: 'trophy-outline',           color: '#10B981', label: 'Project Completed'        },
  project_cancelled:     { icon: 'close-circle-outline',     color: '#EF4444', label: 'Project Cancelled'        },
  review_left:           { icon: 'star-outline',             color: '#F59E0B', label: 'Review Left'              },
};

// ── Date grouping ─────────────────────────────────────────────
function dateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface Group {
  label: string;
  events: ProjectEvent[];
}

function groupByDate(events: ProjectEvent[]): Group[] {
  const map = new Map<string, ProjectEvent[]>();
  for (const e of events) {
    const key = dateGroupLabel(e.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([label, evts]) => ({ label, events: evts }));
}

// ── Single event row ──────────────────────────────────────────
interface EventRowProps {
  event: ProjectEvent;
  isLast: boolean;
  isFirst: boolean;
  delay: number;
}

function EventRow({ event, isLast, isFirst, delay }: EventRowProps) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const meta  = EVENT_META[event.event_type] ?? { icon: 'information-circle-outline', color: Colors.muted, label: event.title };
  const icon  = (event.icon ?? meta.icon) as keyof typeof Ionicons.glyphMap;
  const color = event.color ?? meta.color;

  const actorLabel = event.actor?.full_name
    ? event.actor.full_name
    : event.actor_role === 'system'
    ? 'System'
    : event.actor_role === 'provider'
    ? 'Provider'
    : 'Client';

  const hasDetail = !!event.detail;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        activeOpacity={hasDetail ? 0.75 : 1}
        onPress={() => hasDetail && setExpanded(p => !p)}
        style={styles.eventRow}
      >
        {/* Left: icon + vertical connector line */}
        <View style={styles.eventLeft}>
          <View style={[styles.iconCircle, { backgroundColor: color + '18', borderColor: color + '40' }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
          {!isLast && <View style={[styles.connector, { backgroundColor: color + '30' }]} />}
        </View>

        {/* Right: content */}
        <View style={styles.eventRight}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventTime}>{timeAgo(event.created_at)}</Text>
          </View>

          {/* Actor */}
          <View style={styles.actorRow}>
            <View style={[styles.actorDot, { backgroundColor: color }]} />
            <Text style={styles.actorText}>{actorLabel}</Text>
            {event.actor_role !== 'system' && (
              <View style={[styles.rolePill, { backgroundColor: color + '18' }]}>
                <Text style={[styles.rolePillText, { color }]}>
                  {event.actor_role === 'provider' ? 'Worker' : 'Client'}
                </Text>
              </View>
            )}
          </View>

          {/* Expandable detail */}
          {hasDetail && (
            <>
              {expanded && (
                <View style={[styles.detailBox, { borderLeftColor: color }]}>
                  <Text style={styles.detailText}>{event.detail}</Text>
                </View>
              )}
              {hasDetail && !expanded && (
                <TouchableOpacity
                  onPress={() => setExpanded(true)}
                  style={styles.showDetailBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.showDetailText, { color }]}>Show details</Text>
                  <Ionicons name="chevron-down" size={11} color={color} />
                </TouchableOpacity>
              )}
              {expanded && (
                <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.7} style={styles.showDetailBtn}>
                  <Text style={[styles.showDetailText, { color }]}>Hide</Text>
                  <Ionicons name="chevron-up" size={11} color={color} />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Extra metadata badges (rating, file name, etc.) */}
          {event.metadata?.rating != null && (
            <View style={styles.metaBadge}>
              {[1,2,3,4,5].map(s => (
                <Ionicons
                  key={s}
                  name={s <= event.metadata.rating ? 'star' : 'star-outline'}
                  size={12}
                  color={Colors.warning}
                />
              ))}
              <Text style={styles.metaBadgeText}>{event.metadata.rating}/5</Text>
            </View>
          )}
          {event.metadata?.file_name && (
            <View style={styles.metaBadge}>
              <Ionicons name="document-outline" size={12} color={Colors.muted} />
              <Text style={styles.metaBadgeText}>{String(event.metadata.file_name)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Date group header ─────────────────────────────────────────
function GroupHeader({ label }: { label: string }) {
  return (
    <View style={styles.groupHeader}>
      <View style={styles.groupLine} />
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupLine} />
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyTimeline() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="time-outline" size={32} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No events yet</Text>
      <Text style={styles.emptySub}>
        Actions like accepting offers, uploading deliverables, and leaving reviews will appear here.
      </Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────
interface Props {
  bookingId: string;
}

export function ProjectTimeline({ bookingId }: Props) {
  const [events, setEvents]       = useState<ProjectEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getProjectTimeline(bookingId);
      setEvents(data);
    } catch (e: any) {
      setError('Could not load timeline.');
      console.error('ProjectTimeline error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groups = groupByDate(events);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="time-outline" size={16} color={Colors.primary} />
        <Text style={styles.headerTitle}>Project Timeline</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{events.length} event{events.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {events.length === 0 ? (
        <EmptyTimeline />
      ) : (
        <>
          {groups.map((group, gi) => {
            // Compute global event index for staggered animation delay
            const globalOffset = groups.slice(0, gi).reduce((acc, g) => acc + g.events.length, 0);

            return (
              <View key={group.label}>
                <GroupHeader label={group.label} />
                {group.events.map((event, ei) => {
                  const globalIdx = globalOffset + ei;
                  const isLastInGroup = ei === group.events.length - 1;
                  const isGlobalLast  = gi === groups.length - 1 && isLastInGroup;
                  return (
                    <EventRow
                      key={event.id}
                      event={event}
                      isFirst={globalIdx === 0}
                      isLast={isGlobalLast}
                      delay={globalIdx * 40}
                    />
                  );
                })}
              </View>
            );
          })}

          {/* Bottom cap */}
          <View style={styles.bottomCap}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.muted} />
            <Text style={styles.bottomCapText}>Start of project history</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const ICON_SIZE = 36;
const CONN_LEFT = ICON_SIZE / 2;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: 40 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, flex: 1 },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  countText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  // Loading / error
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorText:   { fontSize: 14, color: Colors.error, marginBottom: 12 },
  retryBtn:    { backgroundColor: Colors.primaryLight, paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.full },
  retryText:   { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Group header
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  groupLine:   { flex: 1, height: 1, backgroundColor: Colors.border },
  groupLabel:  { fontSize: 11, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Event row
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
  },
  eventLeft: {
    alignItems: 'center',
    width: ICON_SIZE,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  connector: {
    flex: 1,
    width: 2,
    minHeight: 20,
    marginVertical: 3,
    borderRadius: 1,
  },
  eventRight: {
    flex: 1,
    paddingBottom: 16,
    gap: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  eventTime:  { fontSize: 11, color: Colors.muted, marginTop: 1 },

  // Actor row
  actorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actorDot:  { width: 5, height: 5, borderRadius: 3 },
  actorText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    marginLeft: 2,
  },
  rolePillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Detail
  detailBox: {
    borderLeftWidth: 3,
    borderRadius: 2,
    paddingLeft: 10,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    marginTop: 4,
  },
  detailText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  showDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  showDetailText: { fontSize: 11, fontWeight: '600' },

  // Metadata badges
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  metaBadgeText: { fontSize: 11, color: Colors.muted, fontWeight: '500' },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 10 },
  emptyIcon:  { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySub:   { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 19 },

  // Bottom cap
  bottomCap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 8,
  },
  bottomCapText: { fontSize: 11, color: Colors.muted, fontStyle: 'italic' },
});
