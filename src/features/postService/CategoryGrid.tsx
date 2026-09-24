/**
 * Step 1's four-by-two grid of category tiles.
 *
 * Each tile is the Home category chip scaled to the grid: same surfaces, same
 * category-tinted icon, same white active state. Tiles split the row width four
 * ways and stop growing at TILE_MAX, so a desktop window gets a tidy grid
 * rather than four giant squares. The two rows are separate Views: with capped
 * tiles, one wrapping row would pull a fifth tile up beside the first four.
 */
import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import { AppText } from '../../ui';
import { GRID_CATEGORIES, ServiceCategoryId } from './constants';

const COLUMNS = 4;
const GAP = S.sm;
/** Home's chip size: the grid's height before its width is measured. */
const TILE_GUESS = 74;
const TILE_MAX = 112;

/** The grid calls the catch-all tile "More"; the listing calls the category "Other". */
function tileLabel(id: ServiceCategoryId): string {
  return id === 'other' ? 'More' : CATEGORY_BY_ID[id].label;
}

export interface CategoryGridProps {
  selected: ServiceCategoryId | null;
  onSelect: (id: ServiceCategoryId) => void;
  style?: StyleProp<ViewStyle>;
}

export function CategoryGrid({ selected, onSelect, style }: CategoryGridProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  // No floor: on a 320pt phone the row is 280 wide and four tiles must still fit.
  const tile = Math.min(TILE_MAX, Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS));
  const rows = [GRID_CATEGORIES.slice(0, COLUMNS), GRID_CATEGORIES.slice(COLUMNS)];

  const renderTile = (id: ServiceCategoryId, column: number) => {
    const category = CATEGORY_BY_ID[id];
    const active = id === selected;
    const label = tileLabel(id);
    return (
      <Pressable
        key={id}
        onPress={() => onSelect(id)}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ checked: active }}
        // react-native-web drops accessibilityState; this reaches the DOM.
        aria-checked={active}
        style={({ pressed }) => [
          styles.tile,
          { width: tile, height: tile },
          active ? styles.tileActive : styles.tileIdle,
          column < COLUMNS - 1 && styles.tileGapRight,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name={category.icon}
          size={tile >= 96 ? 30 : 26}
          color={active ? C.onLight : category.color}
        />
        {/* Two lines only as a fallback: a 64pt tile on a 320pt phone can't fit "Yard Work" on one. */}
        <AppText
          variant="tiny"
          color={active ? C.onLight : C.text}
          numberOfLines={2}
          style={styles.label}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      style={[styles.grid, style]}
      onLayout={onLayout}
      accessibilityRole="radiogroup"
      accessibilityLabel="Category"
    >
      {/* Nothing draws until the width is known, so tiles never jump size. */}
      {width > 0
        ? rows.map((row, index) => (
            <View key={index} style={[styles.row, index > 0 && styles.rowGap]}>
              {row.map(renderTile)}
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    // Holds the grid's height while the first layout pass measures its width.
    minHeight: TILE_GUESS * 2 + GAP,
  },
  row: {
    flexDirection: 'row',
  },
  rowGap: {
    marginTop: GAP,
  },
  tile: {
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    // Kept on both states so the active tile is not 2px smaller inside.
    borderWidth: 1,
  },
  tileIdle: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  tileActive: {
    backgroundColor: C.text,
    borderColor: 'transparent',
  },
  tileGapRight: {
    marginRight: GAP,
  },
  label: {
    marginTop: S.sm - 2,
    paddingHorizontal: 2,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
