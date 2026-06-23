import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { PublicProfileScreen } from '../screens/shared/PublicProfileScreen';
import { PortfolioDetailScreen } from '../screens/shared/PortfolioDetailScreen';
import { Colors } from '../utils/colors';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      // Auth or App must be first so '/' renders the correct initial screen.
      // PublicProfile/PortfolioDetail are registered after so deep-links work,
      // but they are never the default initial route.
    >
      {/* Auth-gated screens — whichever is first becomes the initial route */}
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}

      {/* Public deep-link screens — accessible via /u/:username etc. */}
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="PortfolioDetail" component={PortfolioDetailScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
