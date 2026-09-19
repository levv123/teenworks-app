/**
 * App entry point: the error boundary, the providers the whole tree needs, and
 * the navigation container that owns deep linking and the browser tab title.
 */
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { C, S, T } from './src/design/tokens';
import { AppProvider } from './src/store/AppStore';
import { MainNavigator, navTheme } from './src/navigation/MainNavigator';
import type { RootStackParamList, TabParamList } from './src/navigation/routes';

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

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'https://teenworks.app', 'https://myteenworks.com', 'teenworks://'],
  config: {
    // Places the tabs beneath every deep-linked secondary screen, so a shared
    // link like /gigs/g1 opens with a back path instead of a dead-end stack.
    initialRouteName: 'Tabs',
    screens: {
      // Registered first so '/' lands on the Home tab, not on a secondary screen.
      Tabs: {
        screens: {
          Home: '',
          Analytics: 'analytics',
        },
      },

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

      HireHome: 'hire',
      PostRequest: 'hire/post',
      WorkerProfile: 'hire/worker/:workerId',
    },
  },
};

// ── Document title ────────────────────────────────────────────────────────────

const ROOT_TITLE = 'TeenWorks — Find Local Gigs';

type ScreenName = keyof RootStackParamList | keyof TabParamList;

/** `null` means "this route is the root" and gets the brand title on its own. */
const TITLES: Record<ScreenName, string | null> = {
  Tabs: null,
  Home: null,
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
  HireHome: 'Hire',
  PostRequest: 'Post a Request',
  WorkerProfile: 'Worker Profile',
};

/** A route we have no readable name for falls back to the brand title. */
function titleFor(routeName: string | undefined): string {
  if (routeName === undefined) return ROOT_TITLE;
  const screen = routeName in TITLES ? TITLES[routeName as ScreenName] : null;
  return screen === null ? ROOT_TITLE : `${screen} — TeenWorks`;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer
            theme={navTheme}
            linking={linking}
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
            <MainNavigator />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
