import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/colors';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showLabel?: boolean;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  interactive = false,
  onRatingChange,
  showLabel = false,
}: StarRatingProps) {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const filled = star <= Math.round(rating);
        const half = !filled && star - 0.5 <= rating;

        if (interactive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => onRatingChange?.(star)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={size}
                color={star <= rating ? '#F59E0B' : Colors.border}
              />
            </TouchableOpacity>
          );
        }

        return (
          <Ionicons
            key={star}
            name={filled ? 'star' : half ? 'star-half' : 'star-outline'}
            size={size}
            color={filled || half ? '#F59E0B' : Colors.border}
          />
        );
      })}
      {showLabel && (
        <Text style={[styles.label, { fontSize: size * 0.9 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
});
