/** Every string in the app goes through AppText so type + color come from tokens. */
import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { C, T } from '../design/tokens';

export interface AppTextProps extends TextProps {
  /** Key of the type scale in tokens (display / h1 / h2 / h3 / body / bodyBold / small / tiny). */
  variant?: keyof typeof T;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function AppText({
  variant = 'body',
  color = C.text,
  style,
  ...rest
}: AppTextProps) {
  return <Text {...rest} style={[T[variant], { color }, style]} />;
}
