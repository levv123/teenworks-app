/**
 * The app's single toast. Mounted once above the navigation tree so the pill
 * survives screen changes; the store owns the message and its 2.2s lifetime.
 */
import React from 'react';
import { useApp } from '../../store/AppStore';
import { Toast } from '../../ui';

export function ToastHost() {
  const { toast } = useApp();
  return <Toast message={toast} />;
}
