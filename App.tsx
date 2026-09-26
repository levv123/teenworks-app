/**
 * App entry point: the error boundary, the providers the whole tree needs, and
 * the navigation container that owns deep linking and the browser tab title.
 */
import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, getStateFromPath } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { C, S, T } from './src/design/tokens';
import { AppProvider, useApp } from './src/store/AppStore';
import { MainNavigator, navTheme } from './src/navigation/MainNavigator';
import { SIDE_ROOT } from './src/features/sides';
import type { AppMode } from './src/data/types';
import type {
  HireTabParamList,
  RootStackParamList,
  TabParamList,
} from './src/navigation/routes';

// src/store/AuthContext and src/navigation/RootNavigator are deliberately no longer
// mounted here: they belong to the Supabase layer a later chapter will pick back up.

// ── Error boundary ────────────────────────────────────────────────────────────
// Catches any synchronous render-time crash and shows a readable screen
// instead of a blank black page.

interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[TeenWorks] Unhandled render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>Something went wrong</Text>
          <Text style={errStyles.msg}>{this.state.error.message}</Text>
          <Text style={errStyles.hint}>
            Reload the page to start over. If it keeps happening, the message above
            names the screen that failed — check the console for the full stack.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xxl,
    backgroundColor: C.bg,
  },
  title: { ...T.h2, color: C.text, marginBottom: S.md },
  msg: { ...T.body, color: C.danger, marginBottom: S.lg, textAlign: 'center' },
  hint: { ...T.small, color: C.textMuted, textAlign: 'center' },
});

// ── Deep links ────────────────────────────────────────────────────────────────

const prefix = Linking.createURL('/');

/** '/' with or without a query or hash — the one path that means "open the app". */
function isAppRoot(path: string): boolean {
  return path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '') === '';
}

/**
 * `getSide` reports the current active side. It decides two things only: which
 * side's root sits beneath a deep-linked secondary screen, and where a bare '/'
 * lands (so reopening the app on the web opens the side the user last used).
 */
function buildLinking(
  initialSide: AppMode,
  getSide: () => AppMode,
): LinkingOptions<RootStackParamList> {
  return {
    prefixes: [prefix, 'https://teenworks.app', 'https://myteenworks.com', 'teenworks://'],
    getStateFromPath: (path, options) => {
      const side = getSide();
      if (isAppRoot(path) && side === 'hire') {
        return { routes: [{ name: 'HireTabs', state: { routes: [{ name: 'HireHome' }] } }] };
      }
      const state = getStateFromPath(path, options);
      // `initialRouteName` is fixed at mount; after a switch, the root slipped
      // beneath a secondary screen (browser Back to /profile, say) must be the
      // side the user is on now, not the side the app opened on.
      const [first, ...rest] = state?.routes ?? [];
      if (state && first && rest.length > 0 && first.name === SIDE_ROOT[initialSide] && !first.state) {
        return { ...state, routes: [{ name: SIDE_ROOT[side] }, ...rest] } as typeof state;
      }
      return state;
    },
    config: {
      // Places a side root beneath every deep-linked secondary screen, so a shared
      // link like /gigs/g1 opens with a back path instead of a dead-end stack.
      initialRouteName: SIDE_ROOT[initialSide],
      screens: {
        // Registered first so '/' lands on the Home tab, not on a secondary screen.
        Tabs: {
          screens: {
            Home: '',
            Analytics: 'analytics',
          },
        },
        HireTabs: {
          screens: {
            HireHome: 'hire',
            Bookings: 'hire/bookings',
          },
        },
        SwitchSide: 'switch/:to',

        Gigs: 'gigs',
        GigDetail: 'gigs/:gigId',
        PostService: 'post-service',
        MyServices: 'my-services',
        PastJobs: 'past-jobs',
        Profile: 'profile',
        LocationPicker: 'location',
        EarningsBreakdown: 'earnings',
        Reviews: 'reviews',
        Applications: 'applications',
        SavedGigs: 'saved',

        PostRequest: 'hire/post',
        WorkerProfile: 'hire/worker/:workerId',
      },
    },
  };
}

// ── Document title ────────────────────────────────────────────────────────────

const ROOT_TITLE = 'TeenWorks — Find Local Gigs';

type ScreenName = keyof RootStackParamList | keyof TabParamList | keyof HireTabParamList;

/** `null` means "this route is the root" and gets the brand title on its own. */
const TITLES: Record<ScreenName, string | null> = {
  Tabs: null,
  Home: null,
  HireTabs: null,
  HireHome: 'Hire',
  Bookings: 'Bookings',
  SwitchSide: 'Switch Sides',
  Analytics: 'Analytics',
  Gigs: 'Find Gigs',
  GigDetail: 'Gig Details',
  PostService: 'Post a Service',
  MyServices: 'My Services',
  PastJobs: 'Past Jobs',
  Profile: 'Profile',
  LocationPicker: 'Location',
  EarningsBreakdown: 'Earnings Breakdown',
  Reviews: 'Reviews',
  Applications: 'Applications',
  SavedGigs: 'Saved Gigs',
  PostRequest: 'Post a Request',
  WorkerProfile: 'Worker Profile',
};

/** A route we have no readable name for falls back to the brand title. */
function titleFor(routeName: string | undefined): string {
  if (routeName === undefined) return ROOT_TITLE;
  const screen = routeName in TITLES ? TITLES[routeName as ScreenName] : null;
  return screen === null ? ROOT_TITLE : `${screen} — TeenWorks`;
}

// ── Navigation ────────────────────────────────────────────────────────────────

/**
 * Waits for the stored side before mounting the navigator, so the first screen
 * is the side the user last used rather than a flash of the other one. The
 * rest of the session still hydrates in the background.
 */
function AppNavigation() {
  const { mode, modeReady } = useApp();
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Captured once: the linking config and the stack's first route are
  // mount-time settings, and later switches go through navigation instead.
  const [boot, setBoot] = useState<{
    side: AppMode;
    linking: LinkingOptions<RootStackParamList>;
  } | null>(null);
  useEffect(() => {
    if (!modeReady || boot !== null) return;
    modeRef.current = mode;
    setBoot({ side: mode, linking: buildLinking(mode, () => modeRef.current) });
  }, [boot, mode, modeReady]);

  if (boot === null) return <View style={styles.boot} />;

  return (
    <NavigationContainer
      theme={navTheme}
      linking={boot.linking}
      documentTitle={{
        formatter: (options, route) => {
          const explicit = options?.title;
          // A screen that sets its own `title` option wins; otherwise the
          // route name is looked up, so we never print 'undefined — TeenWorks'.
          if (typeof explicit === 'string' && explicit.length > 0) {
            return `${explicit} — TeenWorks`;
          }
          return titleFor(route?.name);
        },
      }}
    >
      <StatusBar style="light" />
      <MainNavigator initialSide={boot.side} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: C.bg },
});

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <AppNavigation />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
