import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/store/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

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
  prefixes: [prefix, 'https://teenworks.app', 'teenworks://'],
  config: {
    screens: {
      PublicProfile: ':username',
      App: {
        screens: {
          HomeTab: 'home',
          ExploreTab: 'explore',
        },
      },
    },
  },
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
