import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../utils/colors';
import { getInitials } from '../utils/helpers';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

export function Avatar({ uri, name, size = 44, showOnlineIndicator, isOnline }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';
  const fontSize = size * 0.36;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}
      {showOnlineIndicator && (
        <View
          style={[
            styles.indicator,
            isOnline ? styles.online : styles.offline,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.border,
  },
  placeholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.primary,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  online: { backgroundColor: Colors.success },
  offline: { backgroundColor: Colors.muted },
});
