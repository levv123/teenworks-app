/**
 * Earn / Hire side switching.
 *
 * One user, two sides. The store's `mode` is the active side and is persisted,
 * so the app reopens where the user left off; each side owns one root in the
 * stack (`Tabs` for Earn, `HireTabs` for Hire) and switching resets the stack
 * onto the other root, so Back never walks across sides.
 */
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppMode } from '../../data/types';
import type { Nav, RootStackParamList } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';

type SideRoot = Extract<keyof RootStackParamList, 'Tabs' | 'HireTabs'>;

/** The stack root each side lives under. */
export const SIDE_ROOT: Record<AppMode, SideRoot> = {
  earn: 'Tabs',
  hire: 'HireTabs',
};

export const otherSide = (side: AppMode): AppMode => (side === 'earn' ? 'hire' : 'earn');

/** Makes `to` the active side (persisted) and lands on that side's Home. */
export function useSwitchSide(): (to: AppMode) => void {
  const nav = useNavigation<Nav>();
  const { setMode, showToast } = useApp();

  return useCallback(
    (to: AppMode) => {
      setMode(to);
      nav.reset({ index: 0, routes: [{ name: SIDE_ROOT[to] }] });
      showToast(to === 'hire' ? 'Switched to Hire Side' : 'Switched to Earn Side');
    },
    [nav, setMode, showToast],
  );
}

/**
 * Mounted in each side's tab navigator. A deep link can open a side's root
 * directly (e.g. /hire); whichever root the user is actually on is the active
 * side, so the next launch opens there too.
 */
export function useActiveSideRoot(side: AppMode): void {
  const { mode, setMode } = useApp();
  useFocusEffect(
    useCallback(() => {
      if (mode !== side) setMode(side);
    }, [mode, setMode, side]),
  );
}
