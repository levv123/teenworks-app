/** The signed-in user's avatar in a screen header; taps through to Profile. */
import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { Avatar } from '../../ui';

export interface HeaderAvatarProps {
  size?: number;
  /** Overrides the default Profile navigation. */
  onPress?: () => void;
}

export function HeaderAvatar({ size = 40, onPress }: HeaderAvatarProps) {
  const { user } = useApp();
  const nav = useNavigation<Nav>();

  const goToProfile = useCallback(() => {
    nav.navigate('Profile');
  }, [nav]);

  return (
    <Avatar
      name={user.name}
      uri={user.avatarUrl}
      size={size}
      onPress={onPress ?? goToProfile}
    />
  );
}
