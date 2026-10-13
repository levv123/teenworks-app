/**
 * "Near you / Surfside, FL • 3 mi" row with the Change control (spec 3.3).
 * Away from the place the seeded distances are measured from, a muted line
 * under the text says so, on every screen that shows the bar.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S } from '../../design/tokens';
import { formatDistance } from '../../utils/format';
import { AppText, SecondaryButton } from '../../ui';
import { distanceNoteFor } from './distanceNote';

const ICON = 16;

export interface LocationBarProps {
  place: string;
  distanceMi: number;
  onChange: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function LocationBar({
  place,
  distanceMi,
  onChange,
  label = 'Near you',
  style,
}: LocationBarProps) {
  const note = distanceNoteFor(place);

  return (
    <View style={style}>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={ICON} color={C.text} />

        <View style={styles.stack}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {label}
          </AppText>
          <AppText variant="small" color={C.textMuted} numberOfLines={1}>
            {`${place} • ${formatDistance(distanceMi)}`}
          </AppText>
        </View>

        <SecondaryButton label="Change" onPress={onChange} style={styles.change} />
      </View>

      {note ? (
        <AppText variant="small" color={C.textMuted} style={styles.note}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stack: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm,
  },
  change: {
    marginLeft: S.md,
  },
  // Lined up under the text stack, not the icon.
  note: {
    marginTop: S.sm,
    marginLeft: ICON + S.sm,
  },
});
