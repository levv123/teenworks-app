import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../../../types';
import { getCategoryIcon } from '../../../components/CategoryBadge';
import { StepHeading } from './FlowHeader';
import { PostServiceForm } from './formState';
import { WEEKDAYS, durationLabel, formatRate } from './constants';
import { Dark, S, R } from './theme';

export function PreviewStep({
  form,
  category,
  onEditPhotos,
}: {
  form: PostServiceForm;
  category: Category | null;
  onEditPhotos: () => void;
}) {
  const hero = form.images[0] ?? null;
  const duration = durationLabel(form.durationHours);
  const hasAvailability = form.availabilityDays.length > 0;

  // The cheapest enabled package drives the headline price, matching what
  // buildServicePayload writes and what ServiceCard will render in the list.
  const enabledPackagePrices = form.packages
    .filter((p) => p.enabled && Number(p.price) > 0)
    .map((p) => Number(p.price));
  const headlinePrice = enabledPackagePrices.length
    ? Math.min(...enabledPackagePrices)
    : Number(form.price);

  return (
    <View>
      <StepHeading title="Preview Your Service" subtitle="Make sure everything looks good." />

      <View style={styles.card}>
        {/* Hero */}
        <View style={styles.hero}>
          {hero ? (
            <Image source={{ uri: hero }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={styles.heroEmpty}>
              <Ionicons name="image-outline" size={26} color={Dark.textMuted} />
              <Text style={styles.heroEmptyText}>No photo yet</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.editPhotos}
            onPress={onEditPhotos}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={hero ? 'Edit photos' : 'Add photos'}
          >
            <Ionicons name="camera-outline" size={14} color={Dark.text} />
            <Text style={styles.editPhotosText}>{hero ? 'Edit Photos' : 'Add Photos'}</Text>
          </TouchableOpacity>

          {form.images.length > 1 && (
            <View style={styles.dots}>
              {form.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.dotOn]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Title + price */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {form.title.trim() || 'Untitled service'}
            </Text>
            <Text style={styles.price}>
              {formatRate(headlinePrice, form.rateType)}
            </Text>
          </View>

          {/* Category + location */}
          <View style={styles.metaRow}>
            {category && (
              <View style={styles.metaItem}>
                <Ionicons
                  name={getCategoryIcon(category.icon)}
                  size={14}
                  color={Dark.textSecondary}
                />
                <Text style={styles.metaText}>{category.name}</Text>
              </View>
            )}
            {!!form.locationText.trim() && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={Dark.textSecondary} />
                <Text style={styles.metaText}>{form.locationText.trim()}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {!!form.description.trim() && (
            <Text style={styles.description}>{form.description.trim()}</Text>
          )}

          {(duration || hasAvailability) && <View style={styles.rule} />}

          {/* Duration */}
          {duration && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={Dark.textSecondary} />
              <Text style={styles.detailText}>{duration}</Text>
            </View>
          )}

          {/* Availability */}
          {hasAvailability && (
            <View style={styles.availBlock}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Dark.textSecondary} />
                <Text style={styles.detailText}>Available</Text>
              </View>
              <View style={styles.dayRow}>
                {WEEKDAYS.map((day) => {
                  const on = form.availabilityDays.includes(day);
                  return (
                    <View key={day} style={[styles.dayChip, on && styles.dayChipOn]}>
                      <Text style={[styles.dayText, on && styles.dayTextOn]}>{day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: R.card,
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    overflow: 'hidden',
  },

  hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: Dark.surfaceRaised },
  heroImg: { width: '100%', height: '100%' },
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  heroEmptyText: { fontSize: 13, color: Dark.textMuted },

  editPhotos: {
    position: 'absolute',
    top: S.md,
    right: S.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  editPhotosText: { fontSize: 12, fontWeight: '600', color: Dark.text },

  dots: {
    position: 'absolute',
    bottom: S.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: R.full,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotOn: { backgroundColor: Dark.text, width: 14 },

  body: { padding: S.base, gap: S.md },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  title: { flex: 1, fontSize: 19, fontWeight: '700', color: Dark.text, lineHeight: 25 },
  price: { fontSize: 19, fontWeight: '700', color: Dark.text },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.base },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 14, color: Dark.textSecondary },

  description: { fontSize: 15, color: Dark.textSecondary, lineHeight: 22 },

  rule: { height: 1, backgroundColor: Dark.border },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  detailText: { fontSize: 15, color: Dark.text },

  availBlock: { gap: S.md },
  // All seven days share one row at every supported width: each chip flexes
  // and may shrink below its text's natural width rather than wrapping.
  dayRow: { flexDirection: 'row', gap: 4 },
  dayChip: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
    paddingVertical: 7,
    borderRadius: R.md,
    backgroundColor: Dark.surfaceRaised,
    borderWidth: 1,
    borderColor: Dark.border,
    alignItems: 'center',
  },
  dayChipOn: { backgroundColor: Dark.ctaBg, borderColor: Dark.ctaBg },
  dayText: { fontSize: 12, fontWeight: '600', color: Dark.textMuted },
  dayTextOn: { color: Dark.ctaText },
});
