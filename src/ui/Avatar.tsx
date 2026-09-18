/** Circular avatar: the photo when it loads, otherwise a white initial disc. */
import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { C, R } from '../design/tokens';
import { initialOf } from '../utils/format';
import { AppText } from './AppText';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, uri, size = 40, onPress, style }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // A new uri deserves a fresh attempt even if the previous one 404'd.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  // Left un-annotated so it satisfies both ViewStyle and ImageStyle.
  const dimensions = { width: size, height: size, borderRadius: R.full };
  const showImage = !!uri && !failed;

  const inner = showImage ? (
    <Image
      source={{ uri }}
      style={[dimensions, styles.image]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View style={[dimensions, styles.fallback]}>
      <AppText
        color={C.onLight}
        style={{ fontSize: size * 0.4, lineHeight: size * 0.5, fontWeight: '700' }}
      >
        {initialOf(name)}
      </AppText>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name} profile`}
        style={({ pressed }) => [dimensions, style, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name} avatar`}
      style={[dimensions, style]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: C.surfaceAlt,
  },
  fallback: {
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
