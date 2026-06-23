import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Dimensions,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { PortfolioItem, PortfolioFileType } from '../../types';
import { deletePortfolioItem } from '../../api/portfolio';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<any, 'PortfolioDetail'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const FILE_META: Record<PortfolioFileType, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }> = {
  image: { icon: 'image-outline',         label: 'Image', color: Colors.primary,  bg: Colors.primaryLight },
  video: { icon: 'videocam-outline',       label: 'Video', color: '#8B5CF6',       bg: '#EDE9FE' },
  pdf:   { icon: 'document-text-outline',  label: 'PDF',   color: '#EF4444',       bg: '#FEE2E2' },
};

export function PortfolioDetailScreen({ route, navigation }: Props) {
  const { items: initialItems, initialIndex, ownerName, ownerUserId } = route.params as {
    items: PortfolioItem[];
    initialIndex: number;
    ownerName: string;
    ownerUserId: string;
  };

  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const listRef = useRef<FlatList>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;

  const current = items[currentIndex];
  const isOwner = user?.id === ownerUserId;

  // ── Navigation ────────────────────────────────────────────────

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= items.length) return;
    listRef.current?.scrollToIndex({ index: idx, animated: true });
    setCurrentIndex(idx);
  }, [items.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  // ── CTA actions ───────────────────────────────────────────────

  const handleHire = () => {
    navigation.navigate('PostRequest', {});
  };

  const handleContact = () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to contact this worker.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }
    navigation.navigate('PostRequest', {});
  };

  // ── Actions ───────────────────────────────────────────────────

  const handleShare = async () => {
    if (!current) return;
    try {
      await Share.share({
        message: `Check out "${current.title}" by ${ownerName} on TeenWorks.`,
        title: current.title,
      });
    } catch {}
  };

  const handleDelete = () => {
    if (!current) return;
    Alert.alert('Remove item', `Remove "${current.title}" from your portfolio?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePortfolioItem(current.id, current.thumbnail_url);
            const updated = items.filter((i) => i.id !== current.id);
            if (updated.length === 0) {
              navigation.goBack();
              return;
            }
            setItems(updated);
            setCurrentIndex(Math.min(currentIndex, updated.length - 1));
          } catch {
            Alert.alert('Error', 'Could not remove item.');
          }
        },
      },
    ]);
  };

  // ── Render each full-screen slide ─────────────────────────────

  const renderItem = ({ item }: { item: PortfolioItem }) => {
    const fm = FILE_META[item.file_type];
    const formatDate = (iso: string) =>
      new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
      <View style={styles.slide}>
        {/* Media */}
        <View style={styles.mediaWrap}>
          {item.file_type === 'image' && item.thumbnail_url ? (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={styles.mediaImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.mediaPlaceholder, { backgroundColor: fm.bg }]}>
              <Ionicons name={fm.icon} size={72} color={fm.color} />
              <Text style={[styles.mediaPlaceholderLabel, { color: fm.color }]}>{fm.label} File</Text>
              {item.thumbnail_url && (
                <Text style={styles.mediaPlaceholderSub}>Tap to open</Text>
              )}
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          {/* Category + file type badges */}
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Ionicons name="pricetag-outline" size={12} color={Colors.primary} />
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: fm.bg }]}>
              <Ionicons name={fm.icon} size={12} color={fm.color} />
              <Text style={[styles.typeBadgeText, { color: fm.color }]}>{fm.label}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Description */}
          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : (
            <Text style={styles.noDescription}>No description provided.</Text>
          )}

          {/* Upload date */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.muted} />
            <Text style={styles.dateText}>Uploaded {formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!current) return null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top bar ──────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.topOwner} numberOfLines={1}>{ownerName}</Text>
          <Text style={styles.topCounter}>{currentIndex + 1} / {items.length}</Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity style={styles.topBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={styles.topBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Swipeable slides ─────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {/* ── Dot indicators ───────────────────────────────── */}
      {items.length > 1 && (
        <View style={styles.dotsRow}>
          {items.map((_, idx) => (
            <TouchableOpacity key={idx} onPress={() => goTo(idx)}>
              <View
                style={[
                  styles.dot,
                  idx === currentIndex && styles.dotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Prev / Next arrow buttons ────────────────────── */}
      {items.length > 1 && (
        <>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowLeft]}
              onPress={() => goTo(currentIndex - 1)}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          )}
          {currentIndex < items.length - 1 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowRight]}
              onPress={() => goTo(currentIndex + 1)}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-forward" size={22} color={Colors.text} />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── Hire / Contact CTA bar (visitors only) ───────── */}
      {!isOwner && (
        <View style={styles.ctaBar}>
          <Text style={styles.ctaLabel}>Like what you see?</Text>
          <View style={styles.ctaBtns}>
            <TouchableOpacity style={styles.ctaHire} onPress={handleHire} activeOpacity={0.85}>
              <Ionicons name="flash" size={15} color="#fff" />
              <Text style={styles.ctaHireText}>Hire Me</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaServices} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Ionicons name="briefcase-outline" size={15} color={Colors.primary} />
              <Text style={styles.ctaServicesText}>View Services</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaContact} onPress={handleContact} activeOpacity={0.85}>
              <Ionicons name="chatbubble-outline" size={17} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topCenter: { flex: 1, alignItems: 'center', gap: 1 },
  topOwner: { fontSize: 13, fontWeight: '700', color: Colors.text },
  topCounter: { fontSize: 11, color: Colors.muted },
  topRight: { flexDirection: 'row', gap: 8 },

  // Slides
  slide: {
    width: SCREEN_W,
    flex: 1,
  },
  mediaWrap: {
    width: SCREEN_W,
    height: SCREEN_H * 0.45,
    backgroundColor: '#000',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mediaPlaceholderLabel: { fontSize: 18, fontWeight: '700' },
  mediaPlaceholderSub: { fontSize: 13, color: Colors.muted },

  // Info card
  infoCard: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: 12,
    backgroundColor: Colors.background,
  },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: Colors.text, lineHeight: 28, letterSpacing: -0.3 },
  description: { fontSize: 15, color: Colors.textSecondary, lineHeight: 23 },
  noDescription: { fontSize: 14, color: Colors.muted, fontStyle: 'italic' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dateText: { fontSize: 13, color: Colors.muted },

  // Dot indicators
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },

  // CTA bar
  ctaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaLabel: { fontSize: 12, color: Colors.muted, fontWeight: '600', flex: 1 },
  ctaBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ctaHire: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  ctaHireText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  ctaServices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  ctaServicesText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  ctaContact: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Prev/Next arrow overlays
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -20,
    ...Shadow.sm,
  },
  navArrowLeft: { left: Spacing.md },
  navArrowRight: { right: Spacing.md },
});
