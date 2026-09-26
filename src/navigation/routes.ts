/**
 * Navigation contract for the TeenWorks frontend.
 *
 * Every screen types its navigation against these. Adding a screen means adding
 * it here first, then registering it in MainNavigator.
 */
import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppMode, CategoryId } from '../data/types';

/** Earn side tabs. */
export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
};

/** Hire side tabs. */
export type HireTabParamList = {
  HireHome: undefined;
  Bookings: undefined;
};

export type RootStackParamList = {
  /** Earn side root. */
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  /** Hire side root. Exactly one of the two roots sits at the bottom of the stack. */
  HireTabs: NavigatorScreenParams<HireTabParamList> | undefined;
  /** The full-screen confirmation that moves the user to the other side. */
  SwitchSide: { to: AppMode };

  // Earn side
  Gigs: { category?: CategoryId } | undefined;
  GigDetail: { gigId: string };
  /** With a serviceId the form opens in edit mode on that service. */
  PostService: { serviceId?: string } | undefined;
  MyServices: undefined;
  PastJobs: undefined;
  Profile: undefined;
  LocationPicker: undefined;
  EarningsBreakdown: undefined;
  Reviews: undefined;
  Applications: undefined;
  SavedGigs: undefined;

  // Hire side
  PostRequest: undefined;
  WorkerProfile: { workerId: string };
};

/** `const nav = useNavigation<Nav>()` in every screen. */
export type Nav = NativeStackNavigationProp<RootStackParamList>;

/** `const { params } = useRoute<Route<'GigDetail'>>()` */
export type Route<K extends keyof RootStackParamList> = RouteProp<RootStackParamList, K>;
