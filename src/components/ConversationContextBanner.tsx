/**
 * ConversationContextBanner
 *
 * Pinned at the top of every conversation thread. Shows the business
 * reason the conversation started — making it clear this is a professional
 * workspace, not casual social messaging.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import { ConversationContextType, CONVERSATION_CONTEXT_META } from '../types';

interface Props {
  contextType: ConversationContextType;
  contextLabel: string;
  projectTitle?: string;
  bookingStatus?: string;
  onViewProject?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Awaiting Response', color: Colors.warning },
  accepted:    { label: 'Offer Accepted',    color: Colors.success },
  in_progress: { label: 'In Progress',       color: Colors.primary },
  completed:   { label: 'Completed',         color: Colors.success },
  cancelled:   { label: 'Cancelled',         color: Colors.error   },
};

export function ConversationContextBanner({
  contextType,
  contextLabel,
  projectTitle,
  bookingStatus,
  onViewProject,
}: Props) {
  const meta = CONVERSATION_CONTEXT_META[contextType];
  const statusMeta = bookingStatus ? STATUS_LABELS[bookingStatus] : null;
  const slideAnim = useRef(new Animated.Value(-8)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      <View style={styles.content}>
        {/* Left: context info */}
        <View style={styles.left}>
          {/* Context type pill */}
          <View style={[styles.contextPill, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.contextPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>

          {/* Project title */}
          {projectTitle && (
            <Text style={styles.projectTitle} numberOfLines={1}>{projectTitle}</Text>
          )}

          {/* Context label (e.g. "Lawn Mowing · Jun 22") */}
          {contextLabel ? (
            <Text style={styles.contextLabel}>{contextLabel}</Text>
          ) : (
            <Text style={styles.contextDesc}>{meta.description}</Text>
          )}
        </View>

        {/* Right: status + view button */}
        <View style={styles.right}>
          {statusMeta && (
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.color + '18' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
              <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          )}
          {onViewProject && (
            <TouchableOpacity style={styles.viewBtn} onPress={onViewProject} activeOpacity={0.75}>
              <Text style={styles.viewBtnText}>View Project</Text>
              <Ionicons name="arrow-forward" size={11} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  accentBar: {
    width: 3,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 10,
  },
  left: { flex: 1, gap: 3 },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  contextPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  projectTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  contextLabel: { fontSize: 12, color: Colors.muted },
  contextDesc:  { fontSize: 12, color: Colors.muted, fontStyle: 'italic' },
  right: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
});
