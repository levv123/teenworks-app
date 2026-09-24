/**
 * The photo block that opens step 2.
 *
 * Empty, it is one wide "Add photos" panel, so a photo is the first thing the
 * form asks for. With photos it becomes a row of thumbnails, cover first, each
 * with a remove button, and a smaller add tile at the end until MAX_PHOTOS.
 * Picking is the caller's job (it goes through the existing pickServiceImage).
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, HIT_SLOP, R, S } from '../../design/tokens';
import { AppText, Pill } from '../../ui';
import { MAX_PHOTOS } from './constants';

const THUMB = 88;

export interface PhotoStripProps {
  photos: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** True while the picker is open, so a second tap can't open another. */
  picking?: boolean;
  style?: StyleProp<ViewStyle>;
}

function Thumb({
  uri,
  index,
  onRemove,
}: {
  uri: string;
  index: number;
  onRemove: (index: number) => void;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View style={styles.thumb}>
      {failed ? (
        <Ionicons name="image-outline" size={26} color={C.textSubtle} />
      ) : (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      )}
      {index === 0 ? <Pill label="Cover" tone="light" style={styles.cover} /> : null}
      <Pressable
        onPress={() => onRemove(index)}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={`Remove photo ${index + 1}`}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={14} color={C.text} />
      </Pressable>
    </View>
  );
}

export function PhotoStrip({ photos, onAdd, onRemove, picking = false, style }: PhotoStripProps) {
  const full = photos.length >= MAX_PHOTOS;

  if (photos.length === 0) {
    return (
      <Pressable
        onPress={picking ? undefined : onAdd}
        disabled={picking}
        accessibilityRole="button"
        accessibilityLabel="Add photos"
        accessibilityHint="The first photo becomes the cover of your listing"
        style={({ pressed }) => [styles.panel, style, pressed && styles.pressed]}
      >
        {picking ? (
          <ActivityIndicator color={C.text} />
        ) : (
          <>
            <View style={styles.panelIcon}>
              <Ionicons name="camera-outline" size={22} color={C.text} />
            </View>
            <AppText variant="bodyBold" style={styles.panelTitle}>
              Add photos
            </AppText>
            <AppText variant="small" color={C.textMuted} style={styles.panelHint}>
              {`Show your work. Up to ${MAX_PHOTOS}, and the first is your cover.`}
            </AppText>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {photos.map((uri, index) => (
          <View key={`${index}:${uri}`} style={styles.slot}>
            <Thumb uri={uri} index={index} onRemove={onRemove} />
          </View>
        ))}
        {full ? null : (
          <Pressable
            onPress={picking ? undefined : onAdd}
            disabled={picking}
            accessibilityRole="button"
            accessibilityLabel="Add another photo"
            style={({ pressed }) => [styles.thumb, styles.addTile, pressed && styles.pressed]}
          >
            {picking ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <>
                <Ionicons name="add" size={22} color={C.text} />
                <AppText variant="tiny" color={C.textMuted} style={styles.addLabel}>
                  Add
                </AppText>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
      <AppText variant="tiny" color={C.textSubtle} style={styles.count}>
        {`${photos.length}/${MAX_PHOTOS} photos`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 148,
    paddingVertical: S.xl,
    paddingHorizontal: S.lg,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderStyle: 'dashed',
    borderRadius: R.xl,
  },
  panelIcon: {
    width: 44,
    height: 44,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceHigh,
  },
  panelTitle: {
    marginTop: S.md,
  },
  panelHint: {
    marginTop: 2,
    textAlign: 'center',
  },
  slot: {
    marginRight: S.sm,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: R.md,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cover: {
    position: 'absolute',
    left: S.xs + 2,
    bottom: S.xs + 2,
  },
  remove: {
    position: 'absolute',
    top: S.xs + 2,
    right: S.xs + 2,
    width: 24,
    height: 24,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  addTile: {
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderStyle: 'dashed',
  },
  addLabel: {
    marginTop: 2,
  },
  count: {
    marginTop: S.sm - 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
