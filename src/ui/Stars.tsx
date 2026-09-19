/** Five-star rating row, with an optional "(42 reviews)" suffix. */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S } from '../design/tokens';
import type { IoniconName } from '../data/types';
import { formatRating } from '../utils/format';
import { AppText } from './AppText';

export interface StarsProps {
  rating: number;
  size?: number;
  /** When given, renders "(n reviews)" after the stars. */
  count?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** A star is full past three quarters and half past a quarter, so 4.6 reads 4.5. */
function iconFor(rating: number, index: number): IoniconName {
  const remainder = rating - index;
  if (remainder >= 0.75) return 'star';
  if (remainder >= 0.25) return 'star-half';
  return 'star-outline';
}

export function Stars({
  rating,
  size = 14,
  count,
  color = C.star,
  style,
}: StarsProps) {
  const safe = Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Rated ${formatRating(safe)} out of 5`}
      style={[styles.row, style]}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <Ionicons
          key={index}
          name={iconFor(safe, index)}
          size={size}
          color={color}
          style={index > 0 ? styles.gap : undefined}
        />
      ))}
      {count === undefined ? null : (
        <AppText variant="tiny" color={C.textMuted} style={styles.count}>
          {`(${count} ${count === 1 ? 'review' : 'reviews'})`}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gap: {
    marginLeft: 1,
  },
  count: {
    marginLeft: S.sm - 2,
  },
});
