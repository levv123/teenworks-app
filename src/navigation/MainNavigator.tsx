/**
 * The whole navigation tree for the TeenWorks frontend: one tab navigator that
 * holds both sides of the account (Earn: Home + Analytics; Hire: Home +
 * Bookings — the tab bar shows whichever pair is active), nested inside the
 * root stack that owns every secondary screen, plus the single toast host.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DarkTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { C } from '../design/tokens';
import type { RootStackParamList, TabParamList } from './routes';
import { TabBar, ToastHost } from '../features/chrome';
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
import { BookingDetailScreen } from '../screens/hire/BookingDetailScreen';
import { BookingsScreen } from '../screens/hire/BookingsScreen';
import { BookServiceScreen } from '../screens/hire/BookServiceScreen';
import { HireHomeScreen } from '../screens/hire/HireHomeScreen';
import { NeedDetailScreen } from '../screens/hire/NeedDetailScreen';
import { PostRequestScreen } from '../screens/hire/PostRequestScreen';
import { ReportScreen } from '../screens/hire/ReportScreen';
import { ServiceListingScreen } from '../screens/hire/ServiceListingScreen';
import { WorkerProfileScreen } from '../screens/hire/WorkerProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * react-navigation paints the scene container before a screen mounts, so it
 * needs the black background too — otherwise web flashes white between tabs.
 */
const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

function TabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      sceneContainerStyle={styles.scene}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={EarnHomeScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Hire" component={HireHomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: styles.scene,
          animation: 'slide_from_right',
        }}
      >
        {/* First registered, so '/' resolves to the tabs rather than a detail screen. */}
        <Stack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ animation: 'fade' }}
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
        <Stack.Screen name="ServiceListing" component={ServiceListingScreen} />
        <Stack.Screen name="BookService" component={BookServiceScreen} />
        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
        <Stack.Screen name="NeedDetail" component={NeedDetailScreen} />
        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
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
