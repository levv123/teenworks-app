/**
 * The gig feed row (spec 3.1).
 *
 * Borderless on purpose: it sits directly on the black background with no card
 * surface and no hairline, so the photo and the type carry the whole row.
 */
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, TABULAR } from '../../design/tokens';
import type { Gig } from '../../data/types';
import { formatDistance, formatRate, timeAgo } from '../../utils/format';
import { AppText, IconButton, Pill } from '../../ui';
import { useApp, useIsSaved } from '../../store/AppStore';
import { GigThumb } from './GigThumb';

/** Photo edge; the meta column is built to land on the same height. */
/** The row height is tuned for two tags. */
const MAX_TAGS = 2;

const THUMB = 72;

export interface GigCardProps {
  gig: Gig;
  onPress: () => void;
  /** Replaces the price / timestamp column, e.g. a status pill. */
  right?: ReactNode;
  /** Adds a bookmark toggle on the far right, wired to the store. */
  showSaveButton?: boolean;
}

export function GigCard({ gig, onPress, right, showSaveButton = false }: GigCardProps) {
  const { toggleSave } = useApp();
  const saved = useIsSaved(gig.id);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${gig.title}, ${formatRate(gig.price, gig.rateType)}, ${gig.place}, ${formatDistance(gig.distanceMi)}`}
        style={({ pressed }) => [styles.press, pressed && styles.pressed]}
      >
        <GigThumb gig={gig} size={THUMB} />

        <View style={styles.main}>
          <AppText variant="h3" numberOfLines={1}>
            {gig.title}
          </AppText>

          <View style={styles.meta}>
            <Ionicons name="location-outline" size={12} color={C.textMuted} />
            <AppText
              variant="small"
              color={C.textMuted}
              numberOfLines={1}
              style={styles.metaText}
            >
              {`${gig.place} • ${formatDistance(gig.distanceMi)}`}
            </AppText>
          </View>

          <View style={styles.tags}>
            {/* The row is sized for two tags (docs/DESIGN.md 3.1); a third would
                run over the price column, so extra tags are dropped here. */}
            {gig.tags.slice(0, MAX_TAGS).map((tag, index, shown) => (
              <Pill
                key={`${tag}-${index}`}
                label={tag}
                style={index === shown.length - 1 ? styles.tagLast : styles.tag}
              />
            ))}
          </View>
        </View>

        {right !== undefined ? (
          right
        ) : (
          <View style={styles.side}>
            <AppText variant="h3" numberOfLines={1} style={TABULAR}>
              {formatRate(gig.price, gig.rateType)}
            </AppText>
            <AppText variant="tiny" color={C.textSubtle} numberOfLines={1}>
              {timeAgo(gig.postedMinutesAgo)}
            </AppText>
          </View>
        )}
      </Pressable>

      {showSaveButton ? (
        <IconButton
          icon={saved ? 'bookmark' : 'bookmark-outline'}
          color={saved ? C.text : C.textMuted}
          size={18}
          onPress={() => toggleSave(gig.id)}
          accessibilityLabel={saved ? `Unsave ${gig.title}` : `Save ${gig.title}`}
          style={styles.save}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  press: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  main: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
    minHeight: THUMB,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.xs,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.sm - 2,
  },
  tag: {
    marginRight: S.sm - 2,
    // Backstop for an unusually long tag: shrink rather than push the price out.
    flexShrink: 1,
  },
  tagLast: {
    flexShrink: 1,
  },
  /** Stretches to the row height so the price tops out level with the title. */
  side: {
    marginLeft: S.md,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: THUMB,
  },
  save: {
    marginLeft: S.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
