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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import { getMyServices, updateService, deleteService } from '../../api/services';
import { getReviewsForUser } from '../../api/reviews';
import { ProviderService, Review, ServicesStackParamList } from '../../types';
import { ServiceCard } from '../../components/ServiceCard';
import { computeTrustScore } from '../../utils/trust';

type Nav = NativeStackNavigationProp<ServicesStackParamList, 'MyServices'>;

export function MyServicesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [services, setServices] = useState<ProviderService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  const trustScore = user?.profile
    ? computeTrustScore(user.profile as any, user.providerProfile as any, reviews)
    : undefined;

  const fetch = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [svcs, revs] = await Promise.all([
        getMyServices(user.id),
        getReviewsForUser(user.id),
      ]);
      setServices(svcs);
      setReviews(revs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const onRefresh = () => { setRefreshing(true); fetch(); };

  const handleToggleActive = async (service: ProviderService) => {
    try {
      await updateService(service.id, { is_active: !service.is_active });
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s)),
      );
    } catch {
      Alert.alert('Error', 'Could not update service status.');
    }
  };

  const handleDelete = (service: ProviderService) => {
    Alert.alert('Delete Service', `Delete "${service.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteService(service.id);
            setServices((prev) => prev.filter((s) => s.id !== service.id));
          } catch {
            Alert.alert('Error', 'Could not delete service.');
          }
        },
      },
    ]);
  };

  const filtered = services.filter((s) => {
    if (filter === 'active') return s.is_active;
    if (filter === 'paused') return !s.is_active;
    return true;
  });

  const activeCount = services.filter((s) => s.is_active).length;
  const pausedCount = services.filter((s) => !s.is_active).length;

  const renderItem = ({ item }: { item: ProviderService }) => (
    <View style={styles.itemWrap}>
      <ServiceCard
        service={item}
        trustScore={trustScore}
        onPress={() => navigation.navigate('ServiceDetail', { service: item })}
      />
      {/* Management actions below card */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleToggleActive(item)}
        >
          <Ionicons
            name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
            size={15}
            color={item.is_active ? Colors.warning : Colors.success}
          />
          <Text style={[styles.actionText, { color: item.is_active ? Colors.warning : Colors.success }]}>
            {item.is_active ? 'Pause' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('CreateEditService', { service: item })}
        >
          <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
          <Text style={[styles.actionText, { color: Colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('ServiceAnalysis', { service: item })}
        >
          <Ionicons name="sparkles" size={15} color={Colors.primary} />
          <Text style={[styles.actionText, { color: Colors.primary }]}>Analyze</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={15} color={Colors.error} />
          <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>My Services</Text>
          {services.length > 0 && (
            <Text style={styles.subheading}>
              {activeCount} active · {pausedCount} paused
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.savedBtn}
            onPress={() => navigation.navigate('ServiceRequests')}
          >
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.savedBtn}
            onPress={() => navigation.navigate('SavedServices')}
          >
            <Ionicons name="heart-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateEditService', {})}
          >
            <Ionicons name="add" size={22} color={Colors.card} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      {services.length > 0 && (
        <View style={styles.filterRow}>
          {(['all', 'active', 'paused'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'active' && activeCount > 0 ? ` (${activeCount})` : ''}
                {f === 'paused' && pausedCount > 0 ? ` (${pausedCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyTitle}>
                {filter !== 'all' ? `No ${filter} services` : 'No services yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter !== 'all'
                  ? `Switch to "All" to see your other services`
                  : 'Add a service to start getting hired'}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('CreateEditService', {})}
                >
                  <Text style={styles.emptyBtnText}>Add Your First Service</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  subheading: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  savedBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterTabActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  filterTabTextActive: {
    color: Colors.card,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
  },
  itemWrap: {
    gap: 0,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm + 2,
  },
  actionDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  emptyBtnText: {
    color: Colors.card,
    fontWeight: '600',
    fontSize: 14,
  },
});
