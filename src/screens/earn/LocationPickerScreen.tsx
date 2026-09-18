/**
 * Location Picker (spec 6) — where the user is searching from and how far out.
 * Picking a place writes it straight to the store and pops back, so the Home
 * location bar and the gig feed are already updated when the screen closes.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import type { Place } from '../../data/types';
import { NEARBY_PLACES } from '../../data/mock';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import {
  AppText,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
  SearchField,
} from '../../ui';
import { formatDistance } from '../../utils/format';

const RADII = [1, 3, 5, 10, 25];

/** Where "my current location" resolves to in the seeded world. */
const CURRENT_PLACE: Place = NEARBY_PLACES.find(
  (place) => place.label === 'Surfside, FL',
) ?? { id: 'here', label: 'Surfside, FL', distanceMi: 0 };

export function LocationPickerScreen() {
  const nav = useNavigation<Nav>();
  const { location, radiusMi, setLocation, setRadius, showToast } = useApp();
  const [search, setSearch] = useState('');

  const places = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length === 0) return NEARBY_PLACES;
    return NEARBY_PLACES.filter((place) =>
      place.label.toLowerCase().includes(needle),
    );
  }, [search]);

  const choose = useCallback(
    (place: Place) => {
      setLocation({ label: place.label, distanceMi: place.distanceMi });
      nav.goBack();
    },
    [nav, setLocation],
  );

  const useCurrent = useCallback(() => {
    choose(CURRENT_PLACE);
    showToast('Using your current location');
  }, [choose, showToast]);

  return (
    <Screen header={<ScreenHeader title="Location" onBack={() => nav.goBack()} />}>
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search a city or neighborhood"
      />

      <AppText variant="small" color={C.textMuted} style={styles.radiusLabel}>
        Search radius
      </AppText>
      <View style={styles.chips}>
        {RADII.map((miles, index) => {
          const active = miles === radiusMi;
          return (
            <Pressable
              key={miles}
              onPress={() => setRadius(miles)}
              accessibilityRole="button"
              accessibilityLabel={`Search within ${formatDistance(miles)}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : styles.chipInactive,
                index > 0 && styles.chipGap,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="small"
                color={active ? C.onLight : C.text}
                style={TABULAR}
              >
                {formatDistance(miles)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={useCurrent}
        accessibilityRole="button"
        accessibilityLabel="Use my current location"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Ionicons name="navigate-outline" size={18} color={C.text} />
        <AppText variant="body" numberOfLines={1} style={styles.rowLabel}>
          Use my current location
        </AppText>
      </Pressable>

      <Divider style={styles.divider} />

      {places.length === 0 ? (
        <EmptyState
          icon="map-outline"
          title="No places found"
          message={`Nothing nearby matches “${search.trim()}”. Try a shorter search.`}
          actionLabel="Clear search"
          onAction={() => setSearch('')}
        />
      ) : (
        places.map((place, index) => {
          const selected = place.label === location.label;
          return (
            <View key={place.id}>
              {index > 0 ? <Divider inset={S.huge - 2} /> : null}
              <Pressable
                onPress={() => choose(place)}
                accessibilityRole="button"
                accessibilityLabel={`${place.label}, ${formatDistance(place.distanceMi)}`}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Ionicons name="location-outline" size={18} color={C.textMuted} />
                <AppText variant="body" numberOfLines={1} style={styles.rowLabel}>
                  {place.label}
                </AppText>
                <AppText variant="small" color={C.textMuted} style={TABULAR}>
                  {formatDistance(place.distanceMi)}
                </AppText>
                {selected ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={C.text}
                    style={styles.check}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  radiusLabel: {
    marginTop: S.xl,
  },
  chips: {
    flexDirection: 'row',
    marginTop: S.md,
  },
  chip: {
    paddingVertical: S.sm,
    paddingHorizontal: S.base,
    borderRadius: R.full,
  },
  chipInactive: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.text,
  },
  chipGap: {
    marginLeft: S.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.base - 2,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  check: {
    marginLeft: S.sm,
  },
  divider: {
    marginBottom: S.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
