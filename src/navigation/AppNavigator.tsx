import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';

// Client screens
import { HomeScreen } from '../screens/client/HomeScreen';
import { CategoryScreen } from '../screens/client/CategoryScreen';
import { PostRequestScreen } from '../screens/client/PostRequestScreen';
import { RequestDetailScreen } from '../screens/client/RequestDetailScreen';
import { BookingScreen } from '../screens/client/BookingScreen';

// Provider screens
import { ProviderHomeScreen } from '../screens/provider/ProviderHomeScreen';
import { RequestsNearbyScreen } from '../screens/provider/RequestsNearbyScreen';
import { MyOffersScreen } from '../screens/provider/MyOffersScreen';

// Shared screens
import { ProviderProfileScreen } from '../screens/shared/ProviderProfileScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ProjectWorkspaceScreen } from '../screens/shared/ProjectWorkspaceScreen';
import { PublicProfileScreen } from '../screens/shared/PublicProfileScreen';
import { PortfolioDetailScreen } from '../screens/shared/PortfolioDetailScreen';
import { ReviewScreen } from '../screens/shared/ReviewScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { TrustCenterScreen } from '../screens/shared/TrustCenterScreen';
import { MyServicesScreen } from '../screens/shared/MyServicesScreen';
import { CreateEditServiceScreen } from '../screens/shared/CreateEditServiceScreen';
import { ServiceDetailScreen } from '../screens/shared/ServiceDetailScreen';
import { ServicesBrowseScreen } from '../screens/shared/ServicesBrowseScreen';
import { SavedServicesScreen } from '../screens/shared/SavedServicesScreen';
import { ServiceAnalysisScreen } from '../screens/shared/ServiceAnalysisScreen';
import { RequestServiceScreen } from '../screens/shared/RequestServiceScreen';
import { ServiceRequestsScreen } from '../screens/shared/ServiceRequestsScreen';
import { ExploreScreen } from '../screens/client/ExploreScreen';
import { MyRequestsScreen } from '../screens/client/MyRequestsScreen';
import { InboxScreen } from '../screens/shared/InboxScreen';

// ── Client Tab Navigator ─────────────────────────────────────
const ClientTab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ExploreStack = createNativeStackNavigator();
const RequestStack = createNativeStackNavigator();
const ServicesStack = createNativeStackNavigator();
const InboxStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Category" component={CategoryScreen} />
      <HomeStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
      <HomeStack.Screen name="PostRequest" component={PostRequestScreen} />
      <HomeStack.Screen name="RequestDetail" component={RequestDetailScreen} />
      <HomeStack.Screen name="Booking" component={BookingScreen} />
      <HomeStack.Screen name="Chat" component={ProjectWorkspaceScreen} />
      <HomeStack.Screen name="Review" component={ReviewScreen} />
      <HomeStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <HomeStack.Screen name="PortfolioDetail" component={PortfolioDetailScreen} />
      <HomeStack.Screen name="ServicesBrowse" component={ServicesBrowseScreen} />
      <HomeStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <HomeStack.Screen name="SavedServices" component={SavedServicesScreen} />
      <HomeStack.Screen name="RequestService" component={RequestServiceScreen} />
    </HomeStack.Navigator>
  );
}

function ExploreStackNav() {
  return (
    <ExploreStack.Navigator screenOptions={{ headerShown: false }}>
      <ExploreStack.Screen name="Explore" component={ExploreScreen} />
      <ExploreStack.Screen name="Category" component={CategoryScreen} />
      <ExploreStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
      <ExploreStack.Screen name="PostRequest" component={PostRequestScreen} />
      <ExploreStack.Screen name="ServicesBrowse" component={ServicesBrowseScreen} />
      <ExploreStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <ExploreStack.Screen name="SavedServices" component={SavedServicesScreen} />
      <ExploreStack.Screen name="RequestService" component={RequestServiceScreen} />
    </ExploreStack.Navigator>
  );
}

function RequestStackNav() {
  return (
    <RequestStack.Navigator screenOptions={{ headerShown: false }}>
      <RequestStack.Screen name="Requests" component={MyRequestsScreen} />
      <RequestStack.Screen name="RequestDetail" component={RequestDetailScreen} />
      <RequestStack.Screen name="Booking" component={BookingScreen} />
      <RequestStack.Screen name="Chat" component={ProjectWorkspaceScreen} />
      <RequestStack.Screen name="Review" component={ReviewScreen} />
    </RequestStack.Navigator>
  );
}

function ServicesStackNav() {
  return (
    <ServicesStack.Navigator screenOptions={{ headerShown: false }}>
      <ServicesStack.Screen name="MyServices" component={MyServicesScreen} />
      <ServicesStack.Screen name="CreateEditService" component={CreateEditServiceScreen} />
      <ServicesStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <ServicesStack.Screen name="ServicesBrowse" component={ServicesBrowseScreen} />
      <ServicesStack.Screen name="SavedServices" component={SavedServicesScreen} />
      <ServicesStack.Screen name="ServiceAnalysis" component={ServiceAnalysisScreen} />
      <ServicesStack.Screen name="RequestService" component={RequestServiceScreen} />
      <ServicesStack.Screen name="ServiceRequests" component={ServiceRequestsScreen} />
      <ServicesStack.Screen name="Booking" component={BookingScreen} />
      <ServicesStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
    </ServicesStack.Navigator>
  );
}

function InboxStackNav() {
  return (
    <InboxStack.Navigator screenOptions={{ headerShown: false }}>
      <InboxStack.Screen name="Inbox" component={InboxScreen} />
      <InboxStack.Screen name="Chat" component={ProjectWorkspaceScreen} />
      <InboxStack.Screen name="Notifications" component={NotificationsScreen} />
    </InboxStack.Navigator>
  );
}


function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="TrustCenter" component={TrustCenterScreen} />
    </ProfileStack.Navigator>
  );
}

function ClientTabNavigator() {
  return (
    <ClientTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            HomeTab: ['home', 'home-outline'],
            ExploreTab: ['compass', 'compass-outline'],
            RequestsTab: ['document-text', 'document-text-outline'],
            ServicesTab: ['briefcase', 'briefcase-outline'],
            MessagesTab: ['chatbubbles', 'chatbubbles-outline'],
            ProfileTab: ['person', 'person-outline'],
          };
          const [filledIcon, outlineIcon] = icons[route.name] ?? ['grid', 'grid-outline'];
          return <Ionicons name={focused ? filledIcon : outlineIcon} size={size} color={color} />;
        },
      })}
    >
      <ClientTab.Screen name="HomeTab" component={HomeStackNav} options={{ title: 'Home' }} />
      <ClientTab.Screen name="ExploreTab" component={ExploreStackNav} options={{ title: 'Explore' }} />
      <ClientTab.Screen name="RequestsTab" component={RequestStackNav} options={{ title: 'Requests' }} />
      <ClientTab.Screen name="ServicesTab" component={ServicesStackNav} options={{ title: 'Services' }} />
      <ClientTab.Screen name="MessagesTab" component={InboxStackNav} options={{ title: 'Messages' }} />
      <ClientTab.Screen name="ProfileTab" component={ProfileStackNav} options={{ title: 'Profile' }} />
    </ClientTab.Navigator>
  );
}

// ── Provider Tab Navigator ───────────────────────────────────
const ProviderTab = createBottomTabNavigator();
const ProviderHomeStack = createNativeStackNavigator();
const NearbyStack = createNativeStackNavigator();
const OffersStack = createNativeStackNavigator();
const ProviderServicesStack = createNativeStackNavigator();
const ProviderInboxStack = createNativeStackNavigator();
const ProviderProfileStack = createNativeStackNavigator();

function ProviderHomeStackNav() {
  return (
    <ProviderHomeStack.Navigator screenOptions={{ headerShown: false }}>
      <ProviderHomeStack.Screen name="ProviderHome" component={ProviderHomeScreen} />
      <ProviderHomeStack.Screen name="Booking" component={BookingScreen} />
      <ProviderHomeStack.Screen name="Chat" component={ProjectWorkspaceScreen} />
      <ProviderHomeStack.Screen name="Review" component={ReviewScreen} />
    </ProviderHomeStack.Navigator>
  );
}

function NearbyStackNav() {
  return (
    <NearbyStack.Navigator screenOptions={{ headerShown: false }}>
      <NearbyStack.Screen name="RequestsNearby" component={RequestsNearbyScreen} />
      <NearbyStack.Screen name="RequestDetail" component={RequestDetailScreen} />
    </NearbyStack.Navigator>
  );
}

function OffersStackNav() {
  return (
    <OffersStack.Navigator screenOptions={{ headerShown: false }}>
      <OffersStack.Screen name="MyOffers" component={MyOffersScreen} />
      <OffersStack.Screen name="Booking" component={BookingScreen} />
      <OffersStack.Screen name="Chat" component={ProjectWorkspaceScreen} />
    </OffersStack.Navigator>
  );
}

function ProviderTabNavigator() {
  return (
    <ProviderTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            ProviderHomeTab: ['home', 'home-outline'],
            NearbyRequestsTab: ['map', 'map-outline'],
            MyOffersTab: ['receipt', 'receipt-outline'],
            ProviderServicesTab: ['briefcase', 'briefcase-outline'],
            ProviderMessagesTab: ['chatbubbles', 'chatbubbles-outline'],
            ProviderProfileTab: ['person', 'person-outline'],
          };
          const [filledIcon, outlineIcon] = icons[route.name] ?? ['grid', 'grid-outline'];
          return <Ionicons name={focused ? filledIcon : outlineIcon} size={size} color={color} />;
        },
      })}
    >
      <ProviderTab.Screen name="ProviderHomeTab" component={ProviderHomeStackNav} options={{ title: 'Dashboard' }} />
      <ProviderTab.Screen name="NearbyRequestsTab" component={NearbyStackNav} options={{ title: 'Nearby' }} />
      <ProviderTab.Screen name="MyOffersTab" component={OffersStackNav} options={{ title: 'My Offers' }} />
      <ProviderTab.Screen
        name="ProviderServicesTab"
        component={() => (
          <ProviderServicesStack.Navigator screenOptions={{ headerShown: false }}>
            <ProviderServicesStack.Screen name="MyServices" component={MyServicesScreen} />
            <ProviderServicesStack.Screen name="CreateEditService" component={CreateEditServiceScreen} />
            <ProviderServicesStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <ProviderServicesStack.Screen name="ServicesBrowse" component={ServicesBrowseScreen} />
            <ProviderServicesStack.Screen name="SavedServices" component={SavedServicesScreen} />
            <ProviderServicesStack.Screen name="ServiceAnalysis" component={ServiceAnalysisScreen} />
            <ProviderServicesStack.Screen name="RequestService" component={RequestServiceScreen} />
            <ProviderServicesStack.Screen name="ServiceRequests" component={ServiceRequestsScreen} />
            <ProviderServicesStack.Screen name="Booking" component={BookingScreen} />
            <ProviderServicesStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
          </ProviderServicesStack.Navigator>
        )}
        options={{ title: 'Services' }}
      />
      <ProviderTab.Screen
        name="ProviderMessagesTab"
        component={() => (
          <ProviderInboxStack.Navigator screenOptions={{ headerShown: false }}>
            <ProviderInboxStack.Screen name="Inbox" component={InboxScreen} />
            <ProviderInboxStack.Screen name="Chat" component={ProjectWorkspaceScreen} />
            <ProviderInboxStack.Screen name="Notifications" component={NotificationsScreen} />
          </ProviderInboxStack.Navigator>
        )}
        options={{ title: 'Messages' }}
      />
      <ProviderTab.Screen
        name="ProviderProfileTab"
        component={() => (
          <ProviderProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ProviderProfileStack.Screen name="Profile" component={ProfileScreen} />
            <ProviderProfileStack.Screen name="TrustCenter" component={TrustCenterScreen} />
          </ProviderProfileStack.Navigator>
        )}
        options={{ title: 'Profile' }}
      />
    </ProviderTab.Navigator>
  );
}

// ── Root App Navigator ───────────────────────────────────────
export function AppNavigator() {
  const { user } = useAuth();
  const isProvider = user?.profile?.role === 'provider';

  if (isProvider) return <ProviderTabNavigator />;
  return <ClientTabNavigator />;
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 4,
    paddingBottom: 4,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
