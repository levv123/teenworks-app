import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radius, Shadow, Spacing } from '../../utils/colors';
import { ServiceCard } from '../../components/ServiceCard';
import { useAuth } from '../../hooks/useAuth';
import { getSavedServices, unsaveService } from '../../api/saved';
import { getRecentlyViewed, removeRecentlyViewed, clearRecentlyViewed } from '../../utils/recentlyViewed';
import { ProviderService, ServicesStackParamList } from '../../types';

type Props = NativeStackScreenProps<ServicesStackParamList, 'SavedServices'>;

export function SavedServicesScreen({ navigation }: Props) {
  const { user } = useAuth();

  const [saved, setSaved] = useState<ProviderService[]>([]);
  const [recent, setRecent] = useState<ProviderService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (!isRefresh) setLoading(true);
    try {
      const [savedData, recentData] = await Promise.all([
        getSavedServices(user.id),
        getRecentlyViewed(),
      ]);
      setSaved(savedData);
      // Recent: exclude ones already in saved so they don't appear twice
      const savedIds = new Set(savedData.map((s) => s.id));
      setRecent(recentData.filter((s) => !savedIds.has(s.id)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Reload every time the screen comes into focus (save/unsave on detail screen)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const handleUnsave = (service: ProviderService) => {
    Alert.alert(
      'Remove from Saved',
      `Remove "${service.title}" from your saved services?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            // Optimistic
            setSaved((prev) => prev.filter((s) => s.id !== service.id));
            try {
              await unsaveService(user.id, service.id);
            } catch {
              setSaved((prev) => [service, ...prev]);
              Alert.alert('Error', 'Could not remove saved service.');
            }
          },
        },
      ],
    );
  };

  const handleRemoveRecent = async (service: ProviderService) => {
    setRecent((prev) => prev.filter((s) => s.id !== service.id));
    await removeRecentlyViewed(service.id);
  };

  const handleClearRecent = () => {
    Alert.alert('Clear History', 'Remove all recently viewed services?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setRecent([]);
          await clearRecentlyViewed();
        },
      },
    ]);
  };

  const navigateToService = (service: ProviderService) => {
    navigation.navigate('ServiceDetail', { service });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => navigation.goBack()} />
        <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isEmpty = saved.length === 0 && recent.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => navigation.goBack()} />

      <SectionList
        sections={[
          ...(saved.length > 0
            ? [{
                key: 'saved',
                title: 'Saved Services',
                subtitle: `${saved.length} service${saved.length !== 1 ? 's' : ''}`,
                icon: 'heart' as const,
                iconColor: Colors.error,
                data: saved,
                onClear: undefined as undefined | (() => void),
              }]
            : []),
          ...(recent.length > 0
            ? [{
                key: 'recent',
                title: 'Recently Viewed',
                subtitle: `${recent.length} service${recent.length !== 1 ? 's' : ''}`,
                icon: 'time' as const,
                iconColor: Colors.primary,
                data: recent,
                onClear: handleClearRecent,
              }]
            : []),
        ]}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            title={section.title}
            subtitle={section.subtitle}
            icon={section.icon}
            iconColor={section.iconColor}
            onClear={section.onClear}
          />
        )}
        renderItem={({ item, section }) => (
          <View style={styles.cardWrap}>
            <ServiceCard
              service={item}
              onPress={() => navigateToService(item)}
            />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() =>
                section.key === 'saved'
                  ? handleUnsave(item)
                  : handleRemoveRecent(item)
              }
            >
              <Ionicons
                name={section.key === 'saved' ? 'heart-dislike-outline' : 'close-circle-outline'}
                size={18}
                color={Colors.muted}
              />
              <Text style={styles.removeBtnText}>
                {section.key === 'saved' ? 'Unsave' : 'Remove'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={<View style={{ height: Spacing.xxl }} />}
        contentContainerStyle={isEmpty ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
        <Ionicons name="chevron-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Saved & Recent</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor,
  onClear,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onClear?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {onClear && (
        <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="heart-outline" size={48} color={Colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>Nothing saved yet</Text>
      <Text style={styles.emptySub}>
        Tap the heart icon on any service to save it for later. Services you view will appear here too.
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  listContent: { padding: Spacing.md, gap: Spacing.sm },
  emptyContainer: { flex: 1, padding: Spacing.md },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionSubtitle: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  clearBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: Colors.muted },

  cardWrap: { gap: 4, marginBottom: Spacing.sm },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  removeBtnText: { fontSize: 12, color: Colors.muted, fontWeight: '500' },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  emptySub: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
});
