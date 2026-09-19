/**
 * The earnings bar chart on the Total Earned card, drawn with plain Views because the
 * project has no svg library. `height` is the plot height, so the tallest bar is
 * exactly that tall and the period labels sit underneath it.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C, R, S } from '../../design/tokens';
import type { ChartBar } from '../../data/types';
import { formatMoney } from '../../utils/format';
import { AppText } from '../../ui';

/**
 * Fills for the periods behind the current one. These literal hexes are the single
 * exception to the no-hard-coded-color rule: they are chart-only steps between
 * C.surfaceHigh and C.text with no token of their own, and they cycle when a range
 * has more than four bars.
 */
const BAR_STEPS = ['#2A2A2A', '#333333', '#3D3D3D'] as const;

const BAR_GAP = S.sm + 2;
/** A near-zero period still needs a visible stub. */
const MIN_BAR_HEIGHT = 14;
const LABEL_GAP = S.xs + 2;

export interface MiniBarChartProps {
  bars: ChartBar[];
  width?: number;
  /** Height of the bars alone; the labels add their own line below. */
  height?: number;
  /** The bar drawn in C.text. Defaults to the last (current) period. */
  activeIndex?: number;
}

export function MiniBarChart({
  bars,
  width = 132,
  height = 92,
  activeIndex = bars.length - 1,
}: MiniBarChartProps) {
  const max = bars.reduce(
    (peak, bar) => (Number.isFinite(bar.value) && bar.value > peak ? bar.value : peak),
    0,
  );

  const summary = bars
    .map((bar) => `${bar.label} ${formatMoney(bar.value)}`)
    .join(', ');

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Earnings by period: ${summary}`}
      style={[styles.root, { width }]}
    >
      {bars.map((bar, index) => {
        const active = index === activeIndex;
        const ratio =
          max > 0 && Number.isFinite(bar.value) ? Math.max(0, bar.value) / max : 0;

        return (
          <View
            key={`${bar.label}-${index}`}
            style={[styles.column, index > 0 && styles.columnGap]}
          >
            <View style={[styles.plot, { height }]}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(MIN_BAR_HEIGHT, Math.round(ratio * height)),
                    backgroundColor: active
                      ? C.text
                      : BAR_STEPS[index % BAR_STEPS.length],
                  },
                ]}
              />
            </View>
            <AppText
              variant="tiny"
              color={active ? C.text : C.textMuted}
              numberOfLines={1}
              style={styles.label}
            >
              {bar.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
  },
  columnGap: {
    marginLeft: BAR_GAP,
  },
  plot: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: R.sm,
    borderTopRightRadius: R.sm,
  },
  label: {
    marginTop: LABEL_GAP,
    textAlign: 'center',
  },
});
