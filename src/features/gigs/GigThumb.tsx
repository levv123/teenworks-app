/**
 * Square gig photo used by every gig row and list.
 *
 * Degrades to a tinted category tile whenever there is no photo or the network
 * one fails, so a dead Unsplash URL never leaves a hole in the feed.
 */
import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { CategoryId } from '../../data/types';

/** The slice of a Gig this component actually needs. A full Gig satisfies it. */
export interface GigThumbSource {
  imageUrl: string | null;
  category: Exclude<CategoryId, 'all'>;
}

export interface GigThumbProps {
  gig: GigThumbSource;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function GigThumb({
  gig,
  size = 72,
  radius = R.md,
  style,
}: GigThumbProps) {
  const [failed, setFailed] = useState(false);

  // A different photo deserves a fresh attempt even if the previous one 404'd.
  useEffect(() => {
    setFailed(false);
  }, [gig.imageUrl]);

  const category = CATEGORY_BY_ID[gig.category];

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {gig.imageUrl !== null && !failed ? (
        <Image
          source={{ uri: gig.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Ionicons
          name={category.icon}
          size={Math.round(size * 0.36)}
          color={category.color}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Doubles as the fallback surface: the image simply covers it when it loads.
  tile: {
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
