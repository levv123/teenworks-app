/**
 * The app's single toast. Mounted once above the navigation tree so the pill
 * survives screen changes; the store owns the message and its 2.2s lifetime.
 */
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { S, TAB_BAR_HEIGHT } from '../../design/tokens';
import { useApp } from '../../store/AppStore';
import { Toast } from '../../ui';

export function ToastHost() {
  const { toast } = useApp();
  const insets = useSafeAreaInsets();

  // The tab bar grows by the bottom inset on devices with a home indicator, so
  // a fixed offset would leave the pill sitting on top of the tab icons.
  return <Toast message={toast} bottomOffset={TAB_BAR_HEIGHT + insets.bottom + S.xl} />;
}
