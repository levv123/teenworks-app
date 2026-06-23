import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/store/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// ── Startup diagnostics (safe to remove once the app renders correctly) ───────
console.log('[TeenWorks] ✅ App.tsx module evaluated — platform:', Platform.OS);
console.log('[TeenWorks] SUPABASE_URL configured:', Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL));

// ── Error boundary ────────────────────────────────────────────────────────────
// Catches any synchronous render-time crash and shows a readable screen
// instead of a blank white page.

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
            If you are the developer, check that EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your Vercel environment
            variables, then redeploy.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0f0f1a' },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 12 },
  msg:   { fontSize: 14, color: '#f87171', marginBottom: 20, textAlign: 'center' },
  hint:  { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
});

// ── App ───────────────────────────────────────────────────────────────────────

const prefix = Linking.createURL('/');

const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: [prefix, 'https://teenworks.app', 'https://myteenworks.com', 'teenworks://'],
  config: {
    screens: {
      // Prefix with /u/ so the root path '/' is NOT accidentally matched
      PublicProfile: 'u/:username',
      PortfolioDetail: 'portfolio/:id',
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          Onboarding: 'onboarding',
        },
      },
      App: {
        screens: {
          HomeTab: 'home',
          ExploreTab: 'explore',
          InboxTab: 'inbox',
          ProfileTab: 'profile',
        },
      },
    },
  },
};

export default function App() {
  console.log('[TeenWorks] ✅ App component rendering');
  return (
    <ErrorBoundary>
      {/* ── Debug banner — confirms JS is executing and React is mounting ── */}
      <View style={debugStyles.banner}>
        <Text style={debugStyles.bannerText}>⚡ TeenWorks App Loaded</Text>
      </View>

      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer
            linking={linking}
            onReady={() => console.log('[TeenWorks] ✅ NavigationContainer ready')}
          >
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const debugStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#6C47FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
