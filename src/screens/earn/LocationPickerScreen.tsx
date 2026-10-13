/**
 * Location Picker (spec 6) — where the user is searching from and how far out.
 * The place and radius picked here are a draft: Save writes both to the store
 * and pops back to Home, which re-filters the feed; Back leaves the store as it
 * was.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import type { Place } from '../../data/types';
import { NEARBY_PLACES } from '../../data/mock';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import type { AppLocation } from '../../store/AppStore';
import {
  AppText,
  Divider,
  EmptyState,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SearchField,
} from '../../ui';
import { distanceNoteFor } from '../../features/gigs';
import { formatDistance } from '../../utils/format';

const RADII = [1, 3, 5, 10, 25];

export function LocationPickerScreen() {
  const nav = useNavigation<Nav>();
  const { location, radiusMi, setLocation, setRadius } = useApp();
  const [search, setSearch] = useState('');

  const [draftLocation, setDraftLocation] = useState<AppLocation>(location);
  const [draftRadius, setDraftRadius] = useState(radiusMi);

  // Opened before the stored location finished loading (a cold deep link), the
  // draft follows the store until the user picks something themselves.
  const touched = useRef(false);
  useEffect(() => {
    if (touched.current) return;
    setDraftLocation(location);
    setDraftRadius(radiusMi);
  }, [location, radiusMi]);

  const places = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length === 0) return NEARBY_PLACES;
    return NEARBY_PLACES.filter((place) =>
      place.label.toLowerCase().includes(needle),
    );
  }, [search]);

  const pickPlace = useCallback((place: Place) => {
    touched.current = true;
    setDraftLocation({ label: place.label, distanceMi: place.distanceMi });
  }, []);

  const pickRadius = useCallback((miles: number) => {
    touched.current = true;
    setDraftRadius(miles);
  }, []);

  const save = useCallback(() => {
    setLocation(draftLocation);
    setRadius(draftRadius);
    nav.goBack();
  }, [draftLocation, draftRadius, nav, setLocation, setRadius]);

  const distanceNote = distanceNoteFor(draftLocation.label);

  return (
    <Screen
      header={<ScreenHeader title="Location" onBack={() => nav.goBack()} />}
      footer={
        <>
          {distanceNote ? (
            <AppText
              variant="small"
              color={C.textMuted}
              accessibilityLiveRegion="polite"
              style={styles.footerNote}
            >
              {distanceNote}
            </AppText>
          ) : null}
          <PrimaryButton label="Save" onPress={save} />
        </>
      }
    >
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search a city or neighborhood"
      />

      <AppText variant="small" color={C.textMuted} style={styles.radiusLabel}>
        Search radius
      </AppText>
      <View style={styles.chips}>
        {RADII.map((miles) => {
          const active = miles === draftRadius;
          return (
            <Pressable
              key={miles}
              onPress={() => pickRadius(miles)}
              accessibilityRole="button"
              accessibilityLabel={`Search within ${formatDistance(miles)}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : styles.chipInactive,
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
          const selected = place.label === draftLocation.label;
          return (
            <View key={place.id}>
              {index > 0 ? <Divider inset={S.huge - 2} /> : null}
              <Pressable
                onPress={() => pickPlace(place)}
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
    // Five chips overrun a 360pt gutter, so the row wraps rather than clipping
    // the widest radius off the edge of the screen.
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  chip: {
    paddingVertical: S.sm,
    paddingHorizontal: S.base,
    borderRadius: R.full,
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  chipInactive: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.text,
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
    // The chips keep their own 8px bottom margin; this tops it up to the
    // section gap the list sat at before.
    marginTop: S.md,
    marginBottom: S.xs,
  },
  footerNote: {
    marginBottom: S.md,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
