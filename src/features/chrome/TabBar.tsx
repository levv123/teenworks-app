/**
 * The custom bottom tab bar (spec 5): black, hairline top border. Earn side is
 * Home + Analytics; the hire side reuses the same bar for Home + Bookings.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, TAB_BAR_HEIGHT } from '../../design/tokens';
import type { IoniconName } from '../../data/types';
import type { HireTabParamList, TabParamList } from '../../navigation/routes';
import { AppText } from '../../ui';

const ICON_SIZE = 22;

interface TabSpec {
  /** Filled glyph, shown while the tab is focused. */
  active: IoniconName;
  inactive: IoniconName;
  label: string;
}

type TabName = keyof TabParamList | keyof HireTabParamList;

const ICONS: Record<TabName, TabSpec> = {
  Home: { active: 'home', inactive: 'home-outline', label: 'Home' },
  HireHome: { active: 'home', inactive: 'home-outline', label: 'Home' },
  Bookings: { active: 'calendar', inactive: 'calendar-outline', label: 'Bookings' },
  Analytics: {
    active: 'stats-chart',
    inactive: 'stats-chart-outline',
    label: 'Analytics',
  },
};

/** A route the navigator grew that this bar has not been taught still renders. */
function specFor(routeName: string): TabSpec {
  if (routeName in ICONS) return ICONS[routeName as TabName];
  return { active: 'ellipse-outline', inactive: 'ellipse-outline', label: routeName };
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const spec = specFor(route.name);
        const focused = state.index === index;
        const tint = focused ? C.text : C.textSubtle;
        const options = descriptors[route.key]?.options;

        const onPress = () => {
          // The navigator (or a screen) may cancel the press; only move if it did not.
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options?.tabBarAccessibilityLabel ?? spec.label}
            testID={options?.tabBarTestID}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Ionicons
              name={focused ? spec.active : spec.inactive}
              size={ICON_SIZE}
              color={tint}
            />
            <AppText variant="tiny" color={tint} style={styles.label}>
              {spec.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: S.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
