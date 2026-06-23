import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import { TrustHistoryEvent, TrustHistoryEventType } from '../types';
import { getTrustLevel, TRUST_LEVELS } from '../utils/trust';

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 86400 * 30) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(events: TrustHistoryEvent[]): { label: string; events: TrustHistoryEvent[] }[] {
  const groups: Map<string, TrustHistoryEvent[]> = new Map();
  const now = new Date();

  for (const ev of events) {
    const d = new Date(ev.created_at);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    let label: string;
    if (diffDays === 0)       label = 'Today';
    else if (diffDays === 1)  label = 'Yesterday';
    else if (diffDays < 7)    label = `${diffDays} days ago`;
    else if (diffDays < 30)   label = `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    else                      label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(ev);
  }

  return Array.from(groups.entries()).map(([label, evs]) => ({ label, events: evs }));
}

// ── Event config: icon + colors per type ─────────────────────

interface EventStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

function getEventStyle(event: TrustHistoryEvent): EventStyle {
  switch (event.event_type) {
    case 'level_up': {
      const levelAfter = event.metadata?.level_after as number | undefined;
      const lvl = levelAfter ? TRUST_LEVELS[(levelAfter - 1)] : null;
      return {
        icon: (lvl?.icon ?? 'ribbon') as keyof typeof Ionicons.glyphMap,
        color: lvl?.color ?? Colors.primary,
        bg: lvl?.bg ?? Colors.primaryLight,
      };
    }
    case 'milestone': {
      const key = event.metadata?.milestone_key as string | undefined ?? '';
      if (key.startsWith('score_'))    return { icon: 'trending-up', color: Colors.success, bg: Colors.successLight };
      if (key.startsWith('reviews_'))  return { icon: 'star',         color: '#F59E0B',     bg: '#FEF3C7' };
      if (key.startsWith('jobs_'))     return { icon: 'checkmark-circle', color: Colors.primary, bg: Colors.primaryLight };
      return { icon: 'flag', color: Colors.primary, bg: Colors.primaryLight };
    }
    case 'verification':
      return { icon: 'shield-checkmark', color: Colors.info, bg: Colors.infoLight };
    case 'score_change':
      return (event.score_delta ?? 0) >= 0
        ? { icon: 'arrow-up-circle', color: Colors.success, bg: Colors.successLight }
        : { icon: 'arrow-down-circle', color: Colors.error,   bg: Colors.errorLight  };
    case 'review_received':
      return { icon: 'chatbubble-ellipses', color: '#8B5CF6', bg: '#F5F3FF' };
    default:
      return { icon: 'time-outline', color: Colors.muted, bg: Colors.border };
  }
}

function getDeltaLabel(event: TrustHistoryEvent): string | null {
  if (event.event_type === 'score_change' && event.score_delta != null) {
    const sign = event.score_delta > 0 ? '+' : '';
    return `${sign}${event.score_delta}`;
  }
  if (event.event_type === 'verification' && event.metadata?.trust_pts) {
    return `+${event.metadata.trust_pts} pts`;
  }
  return null;
}

// ── Animated event row ────────────────────────────────────────

function EventRow({
  event,
  isLast,
  index,
}: {
  event: TrustHistoryEvent;
  isLast: boolean;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const style = getEventStyle(event);
  const deltaLabel = getDeltaLabel(event);
  const isPositiveScore = event.event_type === 'score_change' && (event.score_delta ?? 0) > 0;
  const isLevelUp = event.event_type === 'level_up';
  const isMilestone = event.event_type === 'milestone';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.eventRow}>
        {/* Timeline line */}
        <View style={styles.timelineCol}>
          <View style={[styles.eventIconWrap, { backgroundColor: style.bg }, (isLevelUp || isMilestone) && styles.eventIconWrapLarge]}>
            <Ionicons name={style.icon} size={isLevelUp || isMilestone ? 20 : 17} color={style.color} />
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Content */}
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text
              style={[
                styles.eventTitle,
                (isLevelUp || isMilestone) && { fontWeight: '800', color: style.color },
              ]}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            {deltaLabel && (
              <View style={[
                styles.deltaBadge,
                { backgroundColor: style.bg },
                isPositiveScore && styles.deltaBadgePositive,
              ]}>
                <Text style={[styles.deltaText, { color: style.color }]}>{deltaLabel}</Text>
              </View>
            )}
          </View>

          {event.detail && (
            <Text style={styles.eventDetail}>{event.detail}</Text>
          )}

          <View style={styles.eventMeta}>
            {/* Score pill for score_change events */}
            {event.event_type === 'score_change' && (
              <View style={styles.scoreChip}>
                <Ionicons name="shield-half" size={11} color={Colors.primary} />
                <Text style={styles.scoreChipText}>Score: {event.score_after}</Text>
              </View>
            )}
            <Text style={styles.eventTime}>{timeAgo(event.created_at)}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Tabs ──────────────────────────────────────────────────────

type Tab = 'all' | 'milestones' | 'score';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all',        label: 'All Activity', icon: 'time-outline'     },
  { key: 'milestones', label: 'Milestones',   icon: 'flag-outline'     },
  { key: 'score',      label: 'Score Changes',icon: 'trending-up-outline' },
];

// ── Summary stats bar ─────────────────────────────────────────

function SummaryBar({ events }: { events: TrustHistoryEvent[] }) {
  const milestones = events.filter((e) => e.event_type === 'milestone' || e.event_type === 'level_up');
  const scoreEvents = events.filter((e) => e.event_type === 'score_change');
  const totalGain = scoreEvents.reduce((sum, e) => sum + Math.max(0, e.score_delta ?? 0), 0);
  const levelUps = events.filter((e) => e.event_type === 'level_up').length;

  const items = [
    { label: 'Milestones', value: String(milestones.length), icon: 'flag' as keyof typeof Ionicons.glyphMap, color: Colors.primary },
    { label: 'Points gained', value: `+${totalGain}`, icon: 'trending-up' as keyof typeof Ionicons.glyphMap, color: Colors.success },
    { label: 'Level-ups', value: String(levelUps), icon: 'ribbon' as keyof typeof Ionicons.glyphMap, color: '#F59E0B' },
  ];

  return (
    <View style={styles.summaryBar}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={styles.summaryDivider} />}
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconWrap, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={15} color={item.color} />
            </View>
            <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────

interface Props {
  events: TrustHistoryEvent[];
  loading?: boolean;
  /** How many events to show before "Show more" */
  initialCount?: number;
}

export function TrustHistoryFeed({ events, loading = false, initialCount = 10 }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showAll, setShowAll] = useState(false);

  const filtered = events.filter((e) => {
    if (activeTab === 'milestones') return e.event_type === 'milestone' || e.event_type === 'level_up';
    if (activeTab === 'score')      return e.event_type === 'score_change';
    return true;
  });

  const visible = showAll ? filtered : filtered.slice(0, initialCount);
  const groups = groupByDate(visible);

  if (loading) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="time-outline" size={32} color={Colors.border} />
        <Text style={styles.emptyTitle}>Loading history…</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="trending-up" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your journey starts here</Text>
        <Text style={styles.emptyDesc}>
          Complete your first booking to begin earning trust milestones and watching your score grow.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary stats */}
      <SummaryBar events={events} />

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {TABS.map((tab) => {
          const count = tab.key === 'all'
            ? events.length
            : tab.key === 'milestones'
            ? events.filter((e) => e.event_type === 'milestone' || e.event_type === 'level_up').length
            : events.filter((e) => e.event_type === 'score_change').length;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => { setActiveTab(tab.key); setShowAll(false); }}
            >
              <Ionicons
                name={tab.icon}
                size={13}
                color={activeTab === tab.key ? Colors.primary : Colors.muted}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Empty state per tab */}
      {filtered.length === 0 ? (
        <View style={styles.tabEmptyWrap}>
          <Ionicons
            name={activeTab === 'milestones' ? 'flag-outline' : 'trending-up-outline'}
            size={28}
            color={Colors.muted}
          />
          <Text style={styles.tabEmptyText}>
            {activeTab === 'milestones'
              ? 'No milestones yet — complete a job to earn your first!'
              : 'No score changes recorded yet.'}
          </Text>
        </View>
      ) : (
        <>
          {/* Event groups */}
          {groups.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.groupEvents}>
                {group.events.map((ev, idx) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    isLast={idx === group.events.length - 1}
                    index={idx}
                  />
                ))}
              </View>
            </View>
          ))}

          {/* Show more */}
          {!showAll && filtered.length > initialCount && (
            <TouchableOpacity
              style={styles.showMoreBtn}
              onPress={() => setShowAll(true)}
            >
              <Text style={styles.showMoreText}>
                Show {filtered.length - initialCount} more events
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {showAll && filtered.length > initialCount && (
            <TouchableOpacity
              style={styles.showMoreBtn}
              onPress={() => setShowAll(false)}
            >
              <Text style={styles.showMoreText}>Show less</Text>
              <Ionicons name="chevron-up" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.md },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: Colors.muted, fontWeight: '500', textAlign: 'center' },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Tabs
  tabsScroll: { gap: 8, paddingBottom: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  tabTextActive: { color: Colors.primary },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: Colors.primary + '33' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.muted },
  tabBadgeTextActive: { color: Colors.primary },

  // Group header
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
    marginTop: 4,
  },
  groupEvents: { gap: 0 },

  // Event row
  eventRow: { flexDirection: 'row', gap: 12, paddingBottom: 4 },
  timelineCol: { alignItems: 'center', width: 36 },
  eventIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconWrapLarge: {
    width: 40,
    height: 40,
    borderRadius: 13,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  eventContent: { flex: 1, paddingBottom: 16 },
  eventHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  eventTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text, lineHeight: 20 },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  deltaBadgePositive: {},
  deltaText: { fontSize: 12, fontWeight: '800' },
  eventDetail: { fontSize: 12, color: Colors.muted, marginTop: 2, lineHeight: 17 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  scoreChipText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  eventTime: { fontSize: 11, color: Colors.muted },

  // Show more
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Empty states
  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 12 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.md },
  tabEmptyWrap: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 10 },
  tabEmptyText: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.sm },
});
