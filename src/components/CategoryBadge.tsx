import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../utils/colors';
import { Category } from '../types';

interface CategoryBadgeProps {
  category: Pick<Category, 'name' | 'icon' | 'color'>;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const isSmall = size === 'sm';
  const iconName = getCategoryIcon(category.icon);
  const bg = category.color + '20';

  return (
    <View style={[styles.container, { backgroundColor: bg }, isSmall && styles.sm]}>
      <Ionicons
        name={iconName}
        size={isSmall ? 12 : 14}
        color={category.color}
      />
      <Text style={[styles.label, { color: category.color }, isSmall && styles.labelSm]}>
        {category.name}
      </Text>
    </View>
  );
}

export function getCategoryIcon(icon: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    sparkles: 'sparkles',
    water: 'water',
    flash: 'flash',
    cube: 'cube',
    hammer: 'hammer',
    bicycle: 'bicycle',
    book: 'book',
    paw: 'paw',
    default: 'grid',
  };
  return (map[icon] ?? map.default) as keyof typeof Ionicons.glyphMap;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSm: { fontSize: 11 },
});
