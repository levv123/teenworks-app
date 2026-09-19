import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryIcon } from '../../../components/CategoryBadge';
import { Category } from '../../../types';
import { StepHeading } from './FlowHeader';
import { categoryImage } from './constants';
import { Dark, S, R, GUTTER } from './theme';

const VALUE_PROPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'eye-outline', title: 'Get noticed', body: 'Teens nearby can book you' },
  { icon: 'pricetag-outline', title: 'Set your price', body: 'You stay in control' },
  { icon: 'wallet-outline', title: 'Start earning', body: 'Paid safely in the app' },
];

function ValuePropsCard() {
  return (
    <View style={styles.valueCard}>
      {VALUE_PROPS.map((p) => (
        <View key={p.title} style={styles.valueCol}>
          <Ionicons name={p.icon} size={20} color={Dark.text} />
          <Text style={styles.valueTitle}>{p.title}</Text>
          <Text style={styles.valueBody}>{p.body}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * One category card: photographic background with a dark scrim, falling back to
 * a tint built from the category's own `color` plus its Ionicon whenever the
 * image is missing or fails to load.
 */
function CategoryCard({
  category,
  selected,
  onPress,
  width,
}: {
  category: Category;
  selected: boolean;
  onPress: () => void;
  width: number;
}) {
  const uri = categoryImage(category.name);
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;
  const tint = category.color || '#6C47FF';

  return (
    <TouchableOpacity
      style={[styles.card, { width }, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={category.name}
    >
      {showImage ? (
        <>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        </>
      ) : (
        // Fallback: layered translucent tints stand in for a gradient, so the
        // flow needs no extra gradient dependency.
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tint + '2E' }]} />
          <View style={[StyleSheet.absoluteFill, styles.fallbackShade]} />
          <Ionicons
            name={getCategoryIcon(category.icon)}
            size={26}
            color={tint}
            style={styles.fallbackIcon}
          />
        </>
      )}

      {selected && (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={14} color={Dark.ctaText} />
        </View>
      )}

      <Text style={styles.cardLabel} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

export function CategoryStep({
  title,
  subtitle,
  categories,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
}: {
  title: string;
  subtitle: string;
  categories: Category[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  // Two columns inside the gutters, with a 12px gap. Computed rather than
  // percentage-based so the cards never overflow at 320px.
  const available = Math.min(screenWidth, 640) - GUTTER * 2;
  const cardWidth = Math.floor((available - S.md) / 2);

  return (
    <View>
      <StepHeading title={title} subtitle={subtitle} />

      <ValuePropsCard />

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          What do you want to offer?
        </Text>
        <Text style={styles.sectionSub}>Choose a category to get started.</Text>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={Dark.textSecondary} />
        </View>
      ) : error || categories.length === 0 ? (
        <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={26} color={Dark.textMuted} />
          <Text style={styles.stateText}>
            {error ? "Couldn't load categories." : 'No categories available yet.'}
          </Text>
          <TouchableOpacity onPress={onRetry} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid} accessibilityRole="radiogroup">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              width={cardWidth}
              selected={selectedId === cat.id}
              onPress={() => onSelect(cat.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  valueCard: {
    flexDirection: 'row',
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    borderRadius: R.card,
    paddingVertical: S.base,
    paddingHorizontal: S.md,
    gap: S.sm,
  },
  valueCol: { flex: 1, gap: 5, alignItems: 'flex-start' },
  valueTitle: { fontSize: 13, fontWeight: '700', color: Dark.text },
  valueBody: { fontSize: 11, color: Dark.textMuted, lineHeight: 15 },

  sectionHead: { paddingTop: S.xl, paddingBottom: S.base, gap: 4 },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: Dark.text },
  sectionSub: { fontSize: 14, color: Dark.textSecondary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  card: {
    height: 118,
    borderRadius: R.card,
    overflow: 'hidden',
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    justifyContent: 'flex-end',
    padding: S.md,
  },
  cardSelected: { borderColor: Dark.borderSelected, borderWidth: 2 },
  scrim: { backgroundColor: Dark.scrim },
  fallbackShade: { backgroundColor: Dark.scrimStrong },
  fallbackIcon: { position: 'absolute', top: S.md, left: S.md },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Dark.text,
    // Keeps the label legible over the brightest photos.
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  check: {
    position: 'absolute',
    top: S.sm,
    right: S.sm,
    width: 22,
    height: 22,
    borderRadius: R.full,
    backgroundColor: Dark.ctaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  state: { paddingVertical: S.xxl, alignItems: 'center', gap: S.md },
  stateText: { fontSize: 14, color: Dark.textSecondary },
  retry: {
    paddingHorizontal: S.base,
    paddingVertical: S.sm,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: Dark.borderStrong,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: Dark.text },
});
