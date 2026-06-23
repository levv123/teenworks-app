import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications';
import { Notification, NotificationType } from '../../types';
import { timeAgo } from '../../utils/helpers';

const NOTIF_ICONS: Record<NotificationType, { icon: string; color: string }> = {
  new_offer: { icon: 'cash-outline', color: Colors.primary },
  offer_accepted: { icon: 'checkmark-circle-outline', color: Colors.success },
  offer_rejected: { icon: 'close-circle-outline', color: Colors.error },
  booking_started: { icon: 'play-circle-outline', color: Colors.info },
  booking_completed: { icon: 'checkmark-done-circle-outline', color: Colors.success },
  new_review: { icon: 'star-outline', color: Colors.warning },
  new_message: { icon: 'chatbubble-outline', color: Colors.primary },
  request_cancelled: { icon: 'ban-outline', color: Colors.error },
};

export function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleTap = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, read: true } : n),
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => {
            const iconConfig = NOTIF_ICONS[item.type] ?? { icon: 'notifications-outline', color: Colors.primary };
            return (
              <TouchableOpacity
                style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                onPress={() => handleTap(item)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconWrap, { backgroundColor: iconConfig.color + '20' }]}>
                  <Ionicons name={iconConfig.icon as any} size={22} color={iconConfig.color} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  {item.body && <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>}
                  <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.muted} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubText}>You'll see notifications about your bookings and requests here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  unreadCount: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  markAllBtn: { backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full },
  markAllText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, gap: 2, paddingBottom: Spacing.xxl },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 2 },
  notifCardUnread: { backgroundColor: Colors.primaryLight + '60', borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifContent: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  notifBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4, flexShrink: 0 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubText: { fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
