/**
 * The whole navigation tree for the TeenWorks frontend: one two-tab navigator
 * per side — Earn (Home + Analytics) and Hire (Home + Bookings) — nested inside
 * the root stack that owns every secondary screen, plus the single toast host
 * mounted above all of it. The stack starts on the user's last active side.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DarkTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { C } from '../design/tokens';
import type { AppMode } from '../data/types';
import type { HireTabParamList, RootStackParamList, TabParamList } from './routes';
import { TabBar, ToastHost } from '../features/chrome';
import { SIDE_ROOT, useActiveSideRoot } from '../features/sides';
import { AnalyticsScreen } from '../screens/earn/AnalyticsScreen';
import { ApplicationsScreen } from '../screens/earn/ApplicationsScreen';
import { EarnHomeScreen } from '../screens/earn/EarnHomeScreen';
import { EarningsBreakdownScreen } from '../screens/earn/EarningsBreakdownScreen';
import { GigDetailScreen } from '../screens/earn/GigDetailScreen';
import { GigsScreen } from '../screens/earn/GigsScreen';
import { LocationPickerScreen } from '../screens/earn/LocationPickerScreen';
import { MyServicesScreen } from '../screens/earn/MyServicesScreen';
import { PastJobsScreen } from '../screens/earn/PastJobsScreen';
import { PostServiceScreen } from '../screens/earn/PostServiceScreen';
import { ProfileScreen } from '../screens/earn/ProfileScreen';
import { ReviewsScreen } from '../screens/earn/ReviewsScreen';
import { SavedGigsScreen } from '../screens/earn/SavedGigsScreen';
import { BookingsScreen } from '../screens/hire/BookingsScreen';
import { HireHomeScreen } from '../screens/hire/HireHomeScreen';
import { PostRequestScreen } from '../screens/hire/PostRequestScreen';
import { WorkerProfileScreen } from '../screens/hire/WorkerProfileScreen';
import { SwitchSideScreen } from '../screens/sides/SwitchSideScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const HireTab = createBottomTabNavigator<HireTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * react-navigation paints the scene container before a screen mounts, so it
 * needs the black background too — otherwise web flashes white between tabs.
 */
const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

function TabsNavigator() {
  useActiveSideRoot('earn');
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      sceneContainerStyle={styles.scene}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={EarnHomeScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}

/** PLACEHOLDER screens today; the tab structure is the real one. */
function HireTabsNavigator() {
  useActiveSideRoot('hire');
  return (
    <HireTab.Navigator
      tabBar={renderTabBar}
      sceneContainerStyle={styles.scene}
      screenOptions={{ headerShown: false }}
    >
      <HireTab.Screen name="HireHome" component={HireHomeScreen} />
      <HireTab.Screen name="Bookings" component={BookingsScreen} />
    </HireTab.Navigator>
  );
}

export interface MainNavigatorProps {
  /** The last active side; read once, it only picks where the stack starts. */
  initialSide: AppMode;
}

export function MainNavigator({ initialSide }: MainNavigatorProps) {
  return (
    <View style={styles.root}>
      <Stack.Navigator
        initialRouteName={SIDE_ROOT[initialSide]}
        screenOptions={{
          headerShown: false,
          contentStyle: styles.scene,
          animation: 'slide_from_right',
        }}
      >
        {/* The two side roots. Switching sides resets the stack onto the other one. */}
        <Stack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="HireTabs"
          component={HireTabsNavigator}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="SwitchSide"
          component={SwitchSideScreen}
          options={{ animation: 'slide_from_bottom' }}
        />

        {/* Earn side */}
        <Stack.Screen name="Gigs" component={GigsScreen} />
        <Stack.Screen name="GigDetail" component={GigDetailScreen} />
        <Stack.Screen name="PostService" component={PostServiceScreen} />
        <Stack.Screen name="MyServices" component={MyServicesScreen} />
        <Stack.Screen name="PastJobs" component={PastJobsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
        <Stack.Screen name="EarningsBreakdown" component={EarningsBreakdownScreen} />
        <Stack.Screen name="Reviews" component={ReviewsScreen} />
        <Stack.Screen name="Applications" component={ApplicationsScreen} />
        <Stack.Screen name="SavedGigs" component={SavedGigsScreen} />

        {/* Hire side */}
        <Stack.Screen name="PostRequest" component={PostRequestScreen} />
        <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
      </Stack.Navigator>

      {/* Sibling of the navigator, not a child of it, so the pill outlives screen changes. */}
      <ToastHost />
    </View>
  );
}

/** Handed to NavigationContainer so no default light surface shows through. */
export const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.bg,
    card: C.bg,
    text: C.text,
    border: C.border,
    primary: C.text,
    notification: C.danger,
  },
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scene: {
    backgroundColor: C.bg,
  },
});
