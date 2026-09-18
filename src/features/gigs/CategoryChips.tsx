/**
 * The horizontal category chip row (spec 3.4).
 *
 * Full-bleed on purpose: the gutter lives in contentContainerStyle so the first
 * chip lines up with the screen edge padding while the last one can scroll
 * clear of the right edge. Render it outside any gutter-padded container.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, GUTTER, R, S } from '../../design/tokens';
import { CATEGORIES } from '../../data/mock';
import type { Category, CategoryId } from '../../data/types';
import { AppText } from '../../ui';

const CHIP = 74;

/** Home shows the first five; the full filter passes all eight. */
const DEFAULT_CATEGORIES = CATEGORIES.slice(0, 5);

export interface CategoryChipsProps {
  selected: CategoryId;
  onSelect: (category: CategoryId) => void;
  categories?: Category[];
  style?: StyleProp<ViewStyle>;
}

export function CategoryChips({
  selected,
  onSelect,
  categories = DEFAULT_CATEGORIES,
  style,
}: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Without this the first tap after typing in search is spent dismissing
      // the keyboard, and the chip never registers.
      keyboardShouldPersistTaps="handled"
      style={style}
      contentContainerStyle={styles.content}
    >
      {categories.map((category, index) => {
        const active = category.id === selected;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            accessibilityRole="button"
            accessibilityLabel={category.label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : styles.chipInactive,
              index === categories.length - 1 ? undefined : styles.chipGap,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={category.icon}
              size={22}
              color={active ? C.onLight : category.color}
            />
            <AppText
              variant="tiny"
              color={active ? C.onLight : C.text}
              numberOfLines={1}
              style={styles.label}
            >
              {category.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: GUTTER,
  },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    // Kept on both states so the active chip is not 2px smaller inside.
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.text,
    borderColor: 'transparent',
  },
  chipGap: {
    marginRight: S.sm,
  },
  label: {
    marginTop: S.sm - 2,
    paddingHorizontal: S.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
