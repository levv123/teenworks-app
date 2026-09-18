/** "Near you / Surfside, FL • 3 mi" row with the Change control (spec 3.3). */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S } from '../../design/tokens';
import { formatDistance } from '../../utils/format';
import { AppText, SecondaryButton } from '../../ui';

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
  return (
    <View style={[styles.row, style]}>
      <Ionicons name="location-outline" size={16} color={C.text} />

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
});
