/**
 * Navigation contract for the TeenWorks frontend.
 *
 * Every screen types its navigation against these. Adding a screen means adding
 * it here first, then registering it in MainNavigator.
 */
import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BookingsSegment, CategoryId, SafetyReport } from '../data/types';

/**
 * One tab navigator holds both sides of the account. The tab bar shows the
 * Earn pair (Home, Analytics) or the Hire pair (Hire, Bookings) depending on
 * which side is focused, so switching modes never remounts — and never loses —
 * the other side's state.
 */
export type TabParamList = {
  // Earn side
  Home: undefined;
  Analytics: undefined;
  // Hire side
  Hire: undefined;
  Bookings: { segment?: BookingsSegment } | undefined;
};

export const EARN_TABS: (keyof TabParamList)[] = ['Home', 'Analytics'];
export const HIRE_TABS: (keyof TabParamList)[] = ['Hire', 'Bookings'];

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;

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
  /** "Upload a Need". */
  PostRequest: undefined;
  WorkerProfile: { workerId: string };
  ServiceListing: { listingId: string };
  BookService: { listingId: string };
  BookingDetail: { bookingId: string };
  NeedDetail: { requestId: string };
  Report: { targetType: SafetyReport['targetType']; targetId: string; name: string; workerId?: string };
};

/** `const nav = useNavigation<Nav>()` in every screen. */
export type Nav = NativeStackNavigationProp<RootStackParamList>;

/** `const { params } = useRoute<Route<'GigDetail'>>()` */
export type Route<K extends keyof RootStackParamList> = RouteProp<RootStackParamList, K>;
