/**
 * The whole TeenWorks session in one context: filters, saved gigs,
 * applications, the services and requests the user created, and the toast.
 *
 * Implements the contract in docs/DESIGN.md section 7.3. Everything is
 * in-memory and seeded from src/data/mock.ts; the slices a user can change are
 * mirrored into AsyncStorage so they survive a reload.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppMode,
  Application,
  Booking,
  BookingDraft,
  BookingsSegment,
  ReportReason,
  SafetyReport,
  ServiceListing,
  Worker,
  CategoryId,
  EarningsSummary,
  Gig,
  GigSort,
  HireRequest,
  PastJob,
  RequestDraft,
  Review,
  Service,
  ServiceDraft,
  TimeRange,
  User,
} from '../data/types';
import {
  BOOKINGS,
  EARNINGS_BY_RANGE,
  LISTINGS,
  WORKERS,
  GIGS,
  HIRE_REQUESTS,
  PAST_JOBS,
  REVIEWS,
  SERVICES,
  USER,
} from '../data/mock';
import * as api from '../services/marketplace';

const STORAGE_KEY = 'teenworks.v1';
const TOAST_MS = 2200;

export interface AppLocation {
  label: string;
  distanceMi: number;
}

export interface AppState {
  user: User;
  mode: AppMode;
  location: AppLocation;
  radiusMi: number;
  category: CategoryId;
  query: string;
  sort: GigSort;
  timeRange: TimeRange;
  gigs: Gig[];
  savedIds: string[];
  applications: Application[];
  services: Service[];
  requests: HireRequest[];
  pastJobs: PastJob[];
  reviews: Review[];
  /** Hire side. */
  listings: ServiceListing[];
  workers: Worker[];
  bookings: Booking[];
  reports: SafetyReport[];
  blockedWorkerIds: string[];
  toast: string | null;
}

export interface AppActions {
  setMode: (mode: AppMode) => void;
  setCategory: (category: CategoryId) => void;
  setQuery: (query: string) => void;
  setSort: (sort: GigSort) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  setLocation: (location: AppLocation) => void;
  setRadius: (radiusMi: number) => void;
  toggleSave: (gigId: string) => void;
  applyToGig: (gigId: string, note?: string) => void;
  withdrawApplication: (gigId: string) => void;
  postService: (draft: ServiceDraft) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  toggleServiceActive: (id: string) => void;
  /** Resolves with the stored need; rejects with a readable error. */
  postRequest: (draft: RequestDraft) => Promise<HireRequest>;
  closeRequest: (id: string) => Promise<void>;
  hireForRequest: (requestId: string, workerId: string) => Promise<Booking>;
  createBooking: (draft: BookingDraft) => Promise<Booking>;
  cancelBooking: (id: string) => Promise<void>;
  completeBooking: (id: string) => Promise<void>;
  reviewBooking: (id: string, rating: number, body: string) => Promise<void>;
  submitReport: (input: {
    targetType: SafetyReport['targetType'];
    targetId: string;
    reason: ReportReason;
    details: string;
    block?: string | null;
  }) => Promise<SafetyReport>;
  toggleBlockWorker: (workerId: string) => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

export type AppContextValue = AppState & AppActions;

/** An application joined to the gig it points at, for the Applications screen. */
export type ApplicationEntry = Application & { gig: Gig | null };

// ── Ids for anything the user creates in-session ───────────────────────────────

const SERVICE_ID_PREFIX = 'svc_new_';
const REQUEST_ID_PREFIX = 'req_new_';

let serviceSeq = 0;
let requestSeq = 0;

function nextId(prefix: string, seq: number): string {
  return `${prefix}${seq}`;
}

/** Push a counter past anything already persisted so reloads cannot collide. */
function reserveSeq(ids: string[], prefix: string, current: number): number {
  let next = current;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isFinite(n) && n > next) next = n;
  }
  return next;
}

// ── Persistence ───────────────────────────────────────────────────────────────

interface PersistedState {
  savedIds: string[];
  applications: Application[];
  services: Service[];
  requests: HireRequest[];
  location: AppLocation;
  radiusMi: number;
  bookings: Booking[];
  reports: SafetyReport[];
  blockedWorkerIds: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

function isApplication(v: unknown): v is Application {
  return (
    isRecord(v) &&
    isStr(v.gigId) &&
    isStr(v.appliedAt) &&
    (v.status === 'applied' || v.status === 'accepted' || v.status === 'declined')
  );
}

function isService(v: unknown): v is Service {
  return (
    isRecord(v) &&
    isStr(v.id) &&
    isStr(v.title) &&
    isNum(v.rate) &&
    Array.isArray(v.availability)
  );
}

function isRequest(v: unknown): v is HireRequest {
  return isRecord(v) && isStr(v.id) && isStr(v.title) && isNum(v.budget);
}

function isBooking(v: unknown): v is Booking {
  return (
    isRecord(v) &&
    isStr(v.id) &&
    isStr(v.workerId) &&
    isStr(v.title) &&
    isNum(v.total) &&
    (v.status === 'requested' ||
      v.status === 'confirmed' ||
      v.status === 'completed' ||
      v.status === 'cancelled' ||
      v.status === 'declined')
  );
}

function isReport(v: unknown): v is SafetyReport {
  return isRecord(v) && isStr(v.id) && isStr(v.targetId) && isStr(v.reason);
}

function isLocation(v: unknown): v is AppLocation {
  return isRecord(v) && isStr(v.label) && isNum(v.distanceMi);
}

/** Anything the stored blob got wrong is dropped rather than trusted. */
function sanitize(raw: unknown): Partial<PersistedState> {
  if (!isRecord(raw)) return {};
  const out: Partial<PersistedState> = {};
  if (Array.isArray(raw.savedIds)) out.savedIds = raw.savedIds.filter(isStr);
  if (Array.isArray(raw.applications)) {
    out.applications = raw.applications.filter(isApplication);
  }
  if (Array.isArray(raw.services)) out.services = raw.services.filter(isService);
  if (Array.isArray(raw.requests)) out.requests = raw.requests.filter(isRequest);
  if (isLocation(raw.location)) out.location = raw.location;
  if (isNum(raw.radiusMi)) out.radiusMi = raw.radiusMi;
  if (Array.isArray(raw.bookings)) out.bookings = raw.bookings.filter(isBooking);
  if (Array.isArray(raw.reports)) out.reports = raw.reports.filter(isReport);
  if (Array.isArray(raw.blockedWorkerIds)) {
    out.blockedWorkerIds = raw.blockedWorkerIds.filter(isStr);
  }
  return out;
}

function persistedOf(state: AppState): PersistedState {
  return {
    savedIds: state.savedIds,
    applications: state.applications,
    services: state.services,
    requests: state.requests,
    location: state.location,
    radiusMi: state.radiusMi,
    bookings: state.bookings,
    reports: state.reports,
    blockedWorkerIds: state.blockedWorkerIds,
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'hydrate'; payload: Partial<PersistedState> }
  | { type: 'setMode'; mode: AppMode }
  | { type: 'setCategory'; category: CategoryId }
  | { type: 'setQuery'; query: string }
  | { type: 'setSort'; sort: GigSort }
  | { type: 'setTimeRange'; timeRange: TimeRange }
  | { type: 'setLocation'; location: AppLocation }
  | { type: 'setRadius'; radiusMi: number }
  | { type: 'toggleSave'; gigId: string }
  | { type: 'applyToGig'; gigId: string; appliedAt: string; note?: string }
  | { type: 'withdrawApplication'; gigId: string }
  | { type: 'addService'; service: Service }
  | { type: 'updateService'; id: string; patch: Partial<Service> }
  | { type: 'toggleServiceActive'; id: string }
  | { type: 'addRequest'; request: HireRequest }
  | { type: 'patchRequest'; id: string; patch: Partial<HireRequest> }
  | { type: 'addBooking'; booking: Booking }
  | { type: 'patchBooking'; id: string; patch: Partial<Booking> }
  | { type: 'addReport'; report: SafetyReport }
  | { type: 'toggleBlock'; workerId: string }
  | { type: 'showToast'; message: string }
  | { type: 'dismissToast' };

const INITIAL_STATE: AppState = {
  user: USER,
  mode: 'earn',
  location: { label: 'Surfside, FL', distanceMi: 3 },
  radiusMi: 3,
  category: 'all',
  query: '',
  sort: 'newest',
  timeRange: 'month',
  gigs: GIGS,
  savedIds: [],
  applications: [],
  services: SERVICES,
  requests: HIRE_REQUESTS,
  pastJobs: PAST_JOBS,
  reviews: REVIEWS,
  listings: LISTINGS,
  workers: WORKERS,
  bookings: BOOKINGS,
  reports: [],
  blockedWorkerIds: [],
  toast: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        savedIds: action.payload.savedIds ?? state.savedIds,
        applications: action.payload.applications ?? state.applications,
        services: action.payload.services ?? state.services,
        requests: action.payload.requests ?? state.requests,
        location: action.payload.location ?? state.location,
        radiusMi: action.payload.radiusMi ?? state.radiusMi,
        bookings: action.payload.bookings ?? state.bookings,
        reports: action.payload.reports ?? state.reports,
        blockedWorkerIds: action.payload.blockedWorkerIds ?? state.blockedWorkerIds,
      };
    case 'setMode':
      // Tab screens re-assert their mode on every focus; a no-op keeps that cheap.
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case 'setCategory':
      return { ...state, category: action.category };
    case 'setQuery':
      return { ...state, query: action.query };
    case 'setSort':
      return { ...state, sort: action.sort };
    case 'setTimeRange':
      return { ...state, timeRange: action.timeRange };
    case 'setLocation':
      return { ...state, location: action.location };
    case 'setRadius':
      return { ...state, radiusMi: action.radiusMi };
    case 'toggleSave':
      return {
        ...state,
        savedIds: state.savedIds.includes(action.gigId)
          ? state.savedIds.filter((id) => id !== action.gigId)
          : [...state.savedIds, action.gigId],
      };
    case 'applyToGig': {
      // Idempotent: a second tap must not stack up duplicate applications.
      if (state.applications.some((a) => a.gigId === action.gigId)) return state;
      const application: Application = {
        gigId: action.gigId,
        status: 'applied',
        appliedAt: action.appliedAt,
        ...(action.note === undefined ? {} : { note: action.note }),
      };
      return { ...state, applications: [application, ...state.applications] };
    }
    case 'withdrawApplication':
      return {
        ...state,
        applications: state.applications.filter((a) => a.gigId !== action.gigId),
      };
    case 'addService':
      return { ...state, services: [action.service, ...state.services] };
    case 'updateService':
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === action.id ? { ...s, ...action.patch, id: s.id } : s,
        ),
      };
    case 'toggleServiceActive':
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === action.id ? { ...s, active: !s.active } : s,
        ),
      };
    case 'addRequest':
      return { ...state, requests: [action.request, ...state.requests] };
    case 'patchRequest':
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id ? { ...r, ...action.patch, id: r.id } : r,
        ),
      };
    case 'addBooking':
      return { ...state, bookings: [action.booking, ...state.bookings] };
    case 'patchBooking':
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, ...action.patch, id: b.id } : b,
        ),
      };
    case 'addReport':
      return { ...state, reports: [action.report, ...state.reports] };
    case 'toggleBlock':
      return {
        ...state,
        blockedWorkerIds: state.blockedWorkerIds.includes(action.workerId)
          ? state.blockedWorkerIds.filter((id) => id !== action.workerId)
          : [...state.blockedWorkerIds, action.workerId],
      };
    case 'showToast':
      return { ...state, toast: action.message };
    case 'dismissToast':
      return state.toast === null ? state : { ...state, toast: null };
    default:
      return state;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Lets the action callbacks read the latest state without becoming new
  // functions on every render.
  const stateRef = useRef<AppState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);
  const lastWritten = useRef<string | null>(null);

  const clearToastTimer = useCallback(() => {
    if (toastTimer.current !== null) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string) => {
      dispatch({ type: 'showToast', message });
      // Replacing a toast restarts the clock instead of inheriting the old one.
      clearToastTimer();
      toastTimer.current = setTimeout(() => {
        toastTimer.current = null;
        dispatch({ type: 'dismissToast' });
      }, TOAST_MS);
    },
    [clearToastTimer],
  );

  const dismissToast = useCallback(() => {
    clearToastTimer();
    dispatch({ type: 'dismissToast' });
  }, [clearToastTimer]);

  useEffect(() => clearToastTimer, [clearToastTimer]);

  // Hydrate once. It never blocks the first paint — the screen renders the
  // seeded defaults and swaps in the stored slices when they arrive.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || raw === null) return;
        const stored = sanitize(JSON.parse(raw) as unknown);
        serviceSeq = reserveSeq(
          (stored.services ?? []).map((s) => s.id),
          SERVICE_ID_PREFIX,
          serviceSeq,
        );
        requestSeq = reserveSeq(
          (stored.requests ?? []).map((r) => r.id),
          REQUEST_ID_PREFIX,
          requestSeq,
        );
        dispatch({ type: 'hydrate', payload: stored });
      } catch {
        // Storage unavailable or corrupt: keep the in-memory defaults.
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist. The hydrated guard keeps the empty pre-hydration state from
  // overwriting what is already on disk.
  useEffect(() => {
    if (!hydrated.current) return;
    const payload = JSON.stringify(persistedOf(stateRef.current));
    if (payload === lastWritten.current) return;
    lastWritten.current = payload;
    try {
      void AsyncStorage.setItem(STORAGE_KEY, payload).catch(() => {
        // A failed write is a no-op, not a crash.
      });
    } catch {
      // Same for a synchronous throw from a missing storage backend.
    }
  }, [
    state.savedIds,
    state.applications,
    state.services,
    state.requests,
    state.location,
    state.radiusMi,
    state.bookings,
    state.reports,
    state.blockedWorkerIds,
  ]);

  const actions = useMemo<AppActions>(
    () => ({
      setMode: (mode) => dispatch({ type: 'setMode', mode }),
      setCategory: (category) => dispatch({ type: 'setCategory', category }),
      setQuery: (query) => dispatch({ type: 'setQuery', query }),
      setSort: (sort) => dispatch({ type: 'setSort', sort }),
      setTimeRange: (timeRange) => dispatch({ type: 'setTimeRange', timeRange }),
      setLocation: (location) => dispatch({ type: 'setLocation', location }),
      setRadius: (radiusMi) => dispatch({ type: 'setRadius', radiusMi }),
      toggleSave: (gigId) => {
        const wasSaved = stateRef.current.savedIds.includes(gigId);
        dispatch({ type: 'toggleSave', gigId });
        showToast(wasSaved ? 'Removed' : 'Saved');
      },
      applyToGig: (gigId, note) => {
        dispatch({
          type: 'applyToGig',
          gigId,
          note,
          appliedAt: new Date().toISOString(),
        });
        showToast('Application sent');
      },
      withdrawApplication: (gigId) =>
        dispatch({ type: 'withdrawApplication', gigId }),
      postService: (draft) => {
        serviceSeq += 1;
        const service: Service = {
          id: nextId(SERVICE_ID_PREFIX, serviceSeq),
          ...draft,
          active: true,
          views: 0,
          requests: 0,
        };
        dispatch({ type: 'addService', service });
        showToast('Service posted');
      },
      updateService: (id, patch) => dispatch({ type: 'updateService', id, patch }),
      toggleServiceActive: (id) => dispatch({ type: 'toggleServiceActive', id }),
      postRequest: async (draft) => {
        const created = await api.createNeed(draft);
        requestSeq += 1;
        const request: HireRequest = { ...created, id: nextId(REQUEST_ID_PREFIX, requestSeq) };
        dispatch({ type: 'addRequest', request });
        return request;
      },
      closeRequest: async (id) => {
        const request = stateRef.current.requests.find((r) => r.id === id);
        if (request === undefined) throw new api.MarketplaceError('That need no longer exists.');
        await api.closeNeed(request);
        dispatch({ type: 'patchRequest', id, patch: { status: 'closed' } });
        showToast('Need closed');
      },
      hireForRequest: async (requestId, workerId) => {
        const { requests, workers } = stateRef.current;
        const request = requests.find((r) => r.id === requestId);
        const worker = workers.find((w) => w.id === workerId);
        if (request === undefined || worker === undefined) {
          throw new api.MarketplaceError('That need or worker is no longer available.');
        }
        const booking = await api.hireForNeed(request, worker);
        dispatch({ type: 'addBooking', booking });
        dispatch({
          type: 'patchRequest',
          id: requestId,
          patch: { status: 'hired', hiredWorkerId: workerId, bookingId: booking.id },
        });
        showToast(`You hired ${worker.name.split(' ')[0]}`);
        return booking;
      },
      createBooking: async (draft) => {
        const { listings, workers, bookings, blockedWorkerIds } = stateRef.current;
        const listing = listings.find((l) => l.id === draft.listingId);
        const worker = listing && workers.find((w) => w.id === listing.workerId);
        if (listing === undefined || worker === undefined) {
          throw new api.MarketplaceError('This service is no longer available.');
        }
        const booking = await api.createBooking(draft, {
          listing,
          worker,
          existing: bookings,
          blockedWorkerIds,
        });
        dispatch({ type: 'addBooking', booking });
        return booking;
      },
      cancelBooking: async (id) => {
        const booking = stateRef.current.bookings.find((b) => b.id === id);
        if (booking === undefined) throw new api.MarketplaceError('That booking no longer exists.');
        await api.cancelBooking(booking);
        dispatch({ type: 'patchBooking', id, patch: { status: 'cancelled' } });
        showToast('Booking cancelled');
      },
      completeBooking: async (id) => {
        const booking = stateRef.current.bookings.find((b) => b.id === id);
        if (booking === undefined) throw new api.MarketplaceError('That booking no longer exists.');
        await api.completeBooking(booking);
        dispatch({ type: 'patchBooking', id, patch: { status: 'completed' } });
        showToast('Marked as completed');
      },
      reviewBooking: async (id, rating, body) => {
        const booking = stateRef.current.bookings.find((b) => b.id === id);
        if (booking === undefined) throw new api.MarketplaceError('That booking no longer exists.');
        await api.reviewBooking(booking, rating, body);
        dispatch({ type: 'patchBooking', id, patch: { review: { rating, body: body.trim() } } });
        showToast('Review posted');
      },
      submitReport: async ({ block, ...input }) => {
        const report = await api.submitReport(input);
        dispatch({ type: 'addReport', report });
        if (block && !stateRef.current.blockedWorkerIds.includes(block)) {
          dispatch({ type: 'toggleBlock', workerId: block });
        }
        return report;
      },
      toggleBlockWorker: (workerId) => {
        const wasBlocked = stateRef.current.blockedWorkerIds.includes(workerId);
        dispatch({ type: 'toggleBlock', workerId });
        showToast(wasBlocked ? 'Unblocked' : 'Blocked');
      },
      showToast,
      dismissToast,
    }),
    [showToast, dismissToast],
  );

  const value = useMemo<AppContextValue>(
    () => ({ ...state, ...actions }),
    [state, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (ctx === null) {
    throw new Error('useApp() must be called inside an <AppProvider>.');
  }
  return ctx;
}

// ── Derived selectors ─────────────────────────────────────────────────────────

function matchesQuery(gig: Gig, needle: string): boolean {
  if (gig.title.toLowerCase().includes(needle)) return true;
  if (gig.place.toLowerCase().includes(needle)) return true;
  return gig.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function sortGigs(gigs: Gig[], sort: GigSort): Gig[] {
  const sorted = gigs.slice();
  switch (sort) {
    case 'closest':
      return sorted.sort((a, b) => a.distanceMi - b.distanceMi);
    case 'highest':
      return sorted.sort((a, b) => b.price - a.price);
    case 'newest':
    default:
      return sorted.sort((a, b) => a.postedMinutesAgo - b.postedMinutesAgo);
  }
}

/** Category, then query, then radius — then the active sort. */
export function useVisibleGigs(): Gig[] {
  const { gigs, category, query, radiusMi, sort } = useApp();
  return useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = gigs.filter((gig) => {
      if (category !== 'all' && gig.category !== category) return false;
      if (needle.length > 0 && !matchesQuery(gig, needle)) return false;
      // The radius stays applied even when it empties the list: an honest empty
      // state beats quietly showing gigs the user said were too far away.
      return gig.distanceMi <= radiusMi;
    });
    return sortGigs(filtered, sort);
  }, [gigs, category, query, radiusMi, sort]);
}

export function useEarnings(): EarningsSummary {
  const { timeRange } = useApp();
  return EARNINGS_BY_RANGE[timeRange];
}

/** Saved gigs in the order they were saved. */
export function useSavedGigs(): Gig[] {
  const { gigs, savedIds } = useApp();
  return useMemo(() => {
    const byId = new Map(gigs.map((gig) => [gig.id, gig]));
    const out: Gig[] = [];
    for (const id of savedIds) {
      const gig = byId.get(id);
      if (gig !== undefined) out.push(gig);
    }
    return out;
  }, [gigs, savedIds]);
}

/** Applications newest first, each joined to its gig where one still exists. */
export function useApplications(): ApplicationEntry[] {
  const { gigs, applications } = useApp();
  return useMemo(() => {
    const byId = new Map(gigs.map((gig) => [gig.id, gig]));
    return applications
      .slice()
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      .map((application) => ({
        ...application,
        gig: byId.get(application.gigId) ?? null,
      }));
  }, [gigs, applications]);
}

export function useIsSaved(gigId: string): boolean {
  const { savedIds } = useApp();
  return savedIds.includes(gigId);
}

export function useHasApplied(gigId: string): boolean {
  const { applications } = useApp();
  return applications.some((application) => application.gigId === gigId);
}

// ── Hire-side selectors ───────────────────────────────────────────────────────

function listingMatches(listing: ServiceListing, worker: Worker | undefined, needle: string): boolean {
  if (listing.title.toLowerCase().includes(needle)) return true;
  if (listing.description.toLowerCase().includes(needle)) return true;
  if (listing.place.toLowerCase().includes(needle)) return true;
  return worker !== undefined && worker.name.toLowerCase().includes(needle);
}

/** Listings in range, minus blocked workers, filtered and closest-first. */
export function useVisibleListings(category: CategoryId, query: string): ServiceListing[] {
  const { listings, workers, radiusMi, blockedWorkerIds } = useApp();
  return useMemo(() => {
    const byId = new Map(workers.map((w) => [w.id, w]));
    const needle = query.trim().toLowerCase();
    return listings
      .filter((listing) => {
        if (blockedWorkerIds.includes(listing.workerId)) return false;
        if (category !== 'all' && listing.category !== category) return false;
        if (listing.distanceMi > radiusMi) return false;
        return needle.length === 0 || listingMatches(listing, byId.get(listing.workerId), needle);
      })
      .sort((a, b) => a.distanceMi - b.distanceMi || b.rating - a.rating);
  }, [listings, workers, radiusMi, blockedWorkerIds, category, query]);
}

export function useWorker(id: string | null | undefined): Worker | null {
  const { workers } = useApp();
  return useMemo(() => workers.find((w) => w.id === id) ?? null, [workers, id]);
}

export function useListing(id: string | null | undefined): ServiceListing | null {
  const { listings } = useApp();
  return useMemo(() => listings.find((l) => l.id === id) ?? null, [listings, id]);
}

const UPCOMING = new Set(['requested', 'confirmed']);

/** Upcoming soonest-first (undated last); past newest-first. */
export function useBookings(segment: Exclude<BookingsSegment, 'needs'>): Booking[] {
  const { bookings } = useApp();
  return useMemo(() => {
    if (segment === 'upcoming') {
      return bookings
        .filter((b) => UPCOMING.has(b.status))
        .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
    }
    return bookings
      .filter((b) => !UPCOMING.has(b.status))
      .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt));
  }, [bookings, segment]);
}

/**
 * Who has offered to do a need. Seeded needs carry an applicant count but no
 * names, so the list is the nearby workers who fit the category best.
 */
export function useApplicants(request: HireRequest | null): Worker[] {
  const { workers, blockedWorkerIds } = useApp();
  return useMemo(() => {
    if (request === null || request.applicants <= 0) return [];
    const ranked = workers
      .filter((w) => !blockedWorkerIds.includes(w.id))
      .slice()
      .sort((a, b) => {
        const fitA = a.categories.includes(request.category) ? 0 : 1;
        const fitB = b.categories.includes(request.category) ? 0 : 1;
        return fitA - fitB || a.distanceMi - b.distanceMi;
      });
    return ranked.slice(0, Math.min(request.applicants, ranked.length));
  }, [workers, blockedWorkerIds, request]);
}
