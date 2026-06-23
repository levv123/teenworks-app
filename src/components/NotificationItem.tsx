import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../utils/colors';
import { Notification, NotificationType } from '../types';
import { timeAgo } from '../utils/helpers';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
}

function getNotificationIcon(type: NotificationType): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
} {
  const map: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
    new_offer: { icon: 'person-add-outline', color: Colors.primary, bg: Colors.primaryLight },
    offer_accepted: { icon: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successLight },
    offer_rejected: { icon: 'close-circle-outline', color: Colors.error, bg: Colors.errorLight },
    booking_started: { icon: 'play-circle-outline', color: Colors.info, bg: Colors.infoLight },
    booking_completed: { icon: 'trophy-outline', color: Colors.success, bg: Colors.successLight },
    new_review: { icon: 'star-outline', color: '#F59E0B', bg: Colors.warningLight },
    new_message: { icon: 'chatbubble-outline', color: Colors.secondary, bg: Colors.secondaryLight },
    request_cancelled: { icon: 'ban-outline', color: Colors.error, bg: Colors.errorLight },
  };
  return map[type] ?? { icon: 'notifications-outline', color: Colors.primary, bg: Colors.primaryLight };
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { icon, color, bg } = getNotificationIcon(notification.type as NotificationType);

  return (
    <TouchableOpacity
      style={[styles.container, !notification.read && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
        {notification.body && (
          <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        )}
        <Text style={styles.time}>{timeAgo(notification.created_at)}</Text>
      </View>
      {!notification.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: Colors.card,
  },
  unread: {
    backgroundColor: Colors.primaryLight + '60',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.text },
  body: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  time: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
});
