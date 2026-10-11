/** Underlined segment tabs for switching a list's view (Bookings). */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { C, S, TABULAR } from '../design/tokens';
import { AppText } from './AppText';

export interface SegmentOption<Id extends string> {
  id: Id;
  label: string;
  count?: number;
}

export interface SegmentedProps<Id extends string> {
  options: SegmentOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  style?: StyleProp<ViewStyle>;
}

export function Segmented<Id extends string>({ options, value, onChange, style }: SegmentedProps<Id>) {
  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              option.count === undefined ? option.label : `${option.label}, ${option.count}`
            }
            style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}
          >
            <AppText variant="bodyBold" color={active ? C.text : C.textSubtle}>
              {option.label}
            </AppText>
            {option.count !== undefined && option.count > 0 ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <AppText variant="tiny" color={active ? C.onLight : C.textMuted} style={TABULAR}>
                  {String(option.count)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
    marginRight: S.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  itemActive: {
    borderBottomColor: C.text,
  },
  badge: {
    marginLeft: S.sm - 2,
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
  },
  badgeActive: {
    backgroundColor: C.text,
  },
  pressed: {
    opacity: 0.6,
  },
});
