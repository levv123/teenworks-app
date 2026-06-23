/**
 * ProjectContextCard
 *
 * Pinned at the top of every conversation. Shows the full project context
 * so users always know exactly what they're discussing — title, budget,
 * due date, status, description. Collapses to a compact summary strip
 * when the user wants more message space.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import { Booking, ConversationContextType, CONVERSATION_CONTEXT_META } from '../types';
import { formatCurrency, getBookingStatusLabel, getStatusColor } from '../utils/helpers';
import { ProjectStatusStepper } from './ProjectStatusStepper';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Due-date formatting ────────────────────────────────────────
function formatDueDate(dateStr: string): string {
  const date  = new Date(dateStr);
  const now   = new Date();
  const diff  = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Due Today';
  if (diff === 1) return 'Due Tomorrow';
  if (diff === -1) return 'Was Due Yesterday';
  if (diff < 0)  return `${Math.abs(diff)}d Overdue`;
  if (diff <= 6) {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `Due ${weekday}`;
  }
  return 'Due ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueDateColor(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return Colors.error;
  if (diff <= 2) return Colors.warning;
  return Colors.success;
}

// ── Status config ─────────────────────────────────────────────
const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending:     'time-outline',
  accepted:    'checkmark-circle-outline',
  in_progress: 'construct-outline',
  completed:   'trophy-outline',
  cancelled:   'close-circle-outline',
  rejected:    'close-circle-outline',
};

// ── Props ─────────────────────────────────────────────────────
interface Props {
  booking:     Booking;
  contextType: ConversationContextType;
  contextLabel: string;
  onViewProject?: () => void;
}

// ── Component ─────────────────────────────────────────────────
export function ProjectContextCard({ booking, contextType, contextLabel, onViewProject }: Props) {
  const [expanded, setExpanded] = useState(true);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  const meta          = CONVERSATION_CONTEXT_META[contextType];
  const ctxColor      = meta.color;
  const projectStatus = booking.project_status ?? 'offer_sent';
  const statusColor   = getStatusColor(booking.status);
  const statusLabel   = getBookingStatusLabel(booking.status);
  const statusIcon    = STATUS_ICONS[booking.status] ?? 'ellipse-outline';

  // Project data
  const title       = booking.request?.title ?? booking.notes?.split('\n')[0] ?? 'Project';
  const budget      = booking.price ?? booking.request?.budget;
  const dueDate     = booking.request?.deadline_date ?? booking.request?.scheduled_at ?? null;
  const description = booking.request?.description ?? booking.notes ?? null;
  const category    = booking.request?.category?.name ?? null;
  const address     = booking.request?.address ?? null;

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accent, { backgroundColor: ctxColor }]} />

      <View style={styles.inner}>
        {/* ── Always-visible header row ── */}
        <TouchableOpacity
          style={styles.headerRow}
          onPress={toggle}
          activeOpacity={0.75}
        >
          {/* Context type pill */}
          <View style={[styles.ctxPill, { backgroundColor: ctxColor + '18' }]}>
            <Ionicons name={meta.icon as any} size={11} color={ctxColor} />
            <Text style={[styles.ctxPillText, { color: ctxColor }]}>{meta.label}</Text>
          </View>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Ionicons name={statusIcon} size={11} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {/* Expand/collapse chevron */}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={Colors.muted}
            style={styles.chevron}
          />
        </TouchableOpacity>

        {/* Project title — always visible */}
        <Text style={styles.title} numberOfLines={expanded ? 3 : 1}>{title}</Text>

        {/* ── Expanded detail rows ── */}
        {expanded && (
          <View style={styles.details}>
            {/* Status stepper */}
            <View style={styles.stepperWrap}>
              <ProjectStatusStepper status={projectStatus} />
            </View>
            {/* Budget */}
            {budget != null && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons name="cash-outline" size={13} color={Colors.success} />
                </View>
                <View>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={[styles.detailValue, { color: Colors.success }]}>
                    {formatCurrency(budget)}
                  </Text>
                </View>
              </View>
            )}

            {/* Due date */}
            {dueDate && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: dueDateColor(dueDate) + '15' }]}>
                  <Ionicons name="calendar-outline" size={13} color={dueDateColor(dueDate)} />
                </View>
                <View>
                  <Text style={styles.detailLabel}>Deadline</Text>
                  <Text style={[styles.detailValue, { color: dueDateColor(dueDate) }]}>
                    {formatDueDate(dueDate)}
                  </Text>
                </View>
              </View>
            )}

            {/* Category */}
            {category && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="pricetag-outline" size={13} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{category}</Text>
                </View>
              </View>
            )}

            {/* Location */}
            {address && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: Colors.info + '15' }]}>
                  <Ionicons name="location-outline" size={13} color={Colors.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{address}</Text>
                </View>
              </View>
            )}

            {/* Description */}
            {description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Project Details</Text>
                <Text style={styles.descriptionText} numberOfLines={3}>{description}</Text>
              </View>
            )}

            {/* Context label sub-info */}
            {contextLabel ? (
              <Text style={styles.contextLabelText}>{contextLabel}</Text>
            ) : null}

            {/* View full project CTA */}
            {onViewProject && (
              <TouchableOpacity style={styles.viewBtn} onPress={onViewProject} activeOpacity={0.75}>
                <Ionicons name="folder-open-outline" size={14} color={Colors.primary} />
                <Text style={styles.viewBtnText}>View Full Project</Text>
                <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Collapsed mini-summary */}
        {!expanded && (budget != null || dueDate) && (
          <View style={styles.collapsedMeta}>
            {budget != null && (
              <Text style={styles.collapsedChip}>
                💰 {formatCurrency(budget)}
              </Text>
            )}
            {dueDate && (
              <Text style={[styles.collapsedChip, { color: dueDateColor(dueDate) }]}>
                📅 {formatDueDate(dueDate)}
              </Text>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 6,
  },

  // Header row (always visible)
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  ctxPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: 'auto',
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  chevron: { marginLeft: 4 },

  // Title
  title: { fontSize: 15, fontWeight: '800', color: Colors.text, lineHeight: 20 },

  // Detail rows
  details: { gap: 8, marginTop: 2 },
  stepperWrap: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingLeft: 8,
    marginBottom: 2,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: 10, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 1 },

  // Description
  descriptionBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 2,
  },
  descriptionLabel: { fontSize: 10, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  descriptionText:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  // Context sub-label
  contextLabelText: { fontSize: 11, color: Colors.muted, fontStyle: 'italic' },

  // View project button
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginTop: 4,
  },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Collapsed mini-meta
  collapsedMeta: { flexDirection: 'row', gap: 12 },
  collapsedChip: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
});
