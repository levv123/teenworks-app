/** 1px hairline between rows. `inset` indents the line from the left. */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { C, GUTTER } from '../design/tokens';

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  /** true uses the screen gutter; a number indents by that many pixels. */
  inset?: boolean | number;
}

export function Divider({ style, inset }: DividerProps) {
  const marginLeft = inset === true ? GUTTER : inset === false || inset === undefined ? 0 : inset;

  return <View style={[styles.line, { marginLeft }, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: C.border,
  },
});
