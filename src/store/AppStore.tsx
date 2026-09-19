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
  EARNINGS_BY_RANGE,
  GIGS,
  HIRE_REQUESTS,
  PAST_JOBS,
  REVIEWS,
  SERVICES,
  USER,
} from '../data/mock';

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
  postRequest: (draft: RequestDraft) => void;
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
      };
    case 'setMode':
      return { ...state, mode: action.mode };
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
      postRequest: (draft) => {
        requestSeq += 1;
        const request: HireRequest = {
          id: nextId(REQUEST_ID_PREFIX, requestSeq),
          ...draft,
          status: 'open',
          applicants: 0,
          postedMinutesAgo: 0,
        };
        dispatch({ type: 'addRequest', request });
        showToast('Request posted');
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
