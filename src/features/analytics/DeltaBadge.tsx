/** The "up 28%" pill shown next to a total: green up, red down, grey when flat. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { S } from '../../design/tokens';
import type { IoniconName } from '../../data/types';
import { Pill } from '../../ui';
import type { PillTone } from '../../ui';

export interface DeltaBadgeProps {
  /** Percent change against the previous period; may be negative. */
  percent: number;
}

export function DeltaBadge({ percent }: DeltaBadgeProps) {
  const safe = Number.isFinite(percent) ? Math.round(percent) : 0;
  const magnitude = Math.abs(safe);

  // Pill's tones already map to the spec's colour pairs: success -> successBg/success,
  // danger -> dangerBg/danger, neutral -> surfaceAlt/textMuted.
  const tone: PillTone = safe > 0 ? 'success' : safe < 0 ? 'danger' : 'neutral';
  const icon: IoniconName =
    safe > 0 ? 'arrow-up' : safe < 0 ? 'arrow-down' : 'remove';
  const direction = safe > 0 ? 'Up' : safe < 0 ? 'Down' : 'Flat at';

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${direction} ${magnitude} percent`}
      style={styles.wrap}
    >
      <Pill tone={tone} icon={icon} label={`${magnitude}%`} style={styles.pill} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  // Spec 4.3 asks for 4x8 padding, two pixels tighter than Pill's own small size.
  pill: {
    paddingHorizontal: S.sm,
  },
});
