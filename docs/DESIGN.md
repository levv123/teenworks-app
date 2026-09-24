# TeenWorks — Frontend Design Spec

The visual source of truth for the TeenWorks app. Every value below was read off the
approved mock. When in doubt, match this document exactly.

---

## 1. Product

TeenWorks is a local marketplace with two sides:

- **Earn (worker)** — teens browse nearby gigs, apply, post services, track earnings.
- **Hire (client)** — people post a task or hire a nearby worker.

The Earn side is the default experience and the one the mock covers. The mock shows
two bottom tabs only: **Home** and **Analytics**.

---

## 2. Visual language

Pure-black, high-contrast, mobile-first. Big bold white type on black, restrained
color used only for category identity and positive deltas. No gradients, no
drop-shadows, no glass. Generous vertical rhythm. Rounded but not pill-happy:
squircle cards (16–20px), full-round only for pills, chips and the primary CTA.

### 2.1 Color tokens (`src/design/tokens.ts` → `C`)

| Token | Value | Use |
|---|---|---|
| `bg` | `#000000` | app background, tab bar |
| `surface` | `#121212` | cards (Total Earned, stat tiles, review cards) |
| `surfaceAlt` | `#1A1A1A` | chips, pills, "Change" button, tag pills |
| `surfaceHigh` | `#242424` | progress-bar track, inactive chart bars |
| `border` | `rgba(255,255,255,0.08)` | hairlines, card + chip borders |
| `borderStrong` | `rgba(255,255,255,0.14)` | focused inputs, selected outline |
| `text` | `#FFFFFF` | primary type |
| `textMuted` | `#8E8E93` | secondary type, labels, meta |
| `textSubtle` | `#636366` | tertiary, timestamps, placeholder |
| `onLight` | `#0A0A0A` | type on white surfaces (CTA, active chip) |
| `onLightMuted` | `#4A4A4F` | secondary type on white surfaces |
| `success` | `#32D74B` | positive delta badge text, green category |
| `successBg` | `rgba(50,215,75,0.16)` | positive delta badge background |
| `star` | `#FF9F0A` | review stars |
| `danger` | `#FF453A` | destructive |

### 2.2 Category colors (`CATEGORY_COLORS`)

| Category | id | Color | Ionicon (outline) |
|---|---|---|---|
| All | `all` | `#FFFFFF` | `grid-outline` |
| Yard Work | `yard` | `#32D74B` | `leaf-outline` |
| Tutoring | `tutoring` | `#4EA3FF` | `book-outline` |
| Moving | `moving` | `#FF9F45` | `cube-outline` |
| Pets | `pets` | `#FF7A8A` | `paw-outline` |
| Cleaning | `cleaning` | `#5AC8FA` | `sparkles-outline` |
| Tech Help | `tech` | `#BF7BFF` | `laptop-outline` |
| Errands | `errands` | `#FFD60A` | `bicycle-outline` |

The first five appear in the Home chip row in that order. All eight are selectable in
Post a Service and in the full gig list filter.

### 2.3 Spacing (`S`)

`xs:4, sm:8, md:12, base:16, lg:20, xl:24, xxl:32, huge:40`

Screen horizontal gutter: **20px**. Vertical gap between major sections: **24px**.

### 2.4 Radius (`R`)

`sm:8, md:12, lg:16, xl:20, xxl:28, full:999`

### 2.5 Type scale (`T`) — system font, no custom font loading

| Name | Size | Weight | Letter spacing | Line height |
|---|---|---|---|---|
| `display` | 34 | `800` | `-0.8` | 40 |
| `h1` | 26 | `800` | `-0.5` | 32 |
| `h2` | 20 | `700` | `-0.3` | 26 |
| `h3` | 17 | `700` | `-0.2` | 22 |
| `body` | 15 | `500` | `0` | 21 |
| `bodyBold` | 15 | `700` | `-0.1` | 21 |
| `small` | 13 | `500` | `0` | 18 |
| `tiny` | 11 | `600` | `0.2` | 14 |

Numbers in stat positions (`$842`, `4.9`, `12`) use `display`/`h2` with
`fontVariant: ['tabular-nums']`.

---

## 3. Screen: Home (Earn) — `EarnHomeScreen`

Vertical order, 20px gutter, scrollable, black background.

1. **Header row** — `TeenWorks` (`display`, white) on the left; on the right, baseline
   aligned: `Past Jobs` (`small`, white, `textDecorationLine: 'underline'`) then a
   40px circular avatar showing the user's initial (`L`) — white circle, `onLight`
   letter, `bodyBold`. Tapping `Past Jobs` → `PastJobs`. Tapping the avatar → `Profile`.
2. **Tagline** — `Make money. Build your future.` (`body`, `textMuted`), 2px below the
   title.
3. **Location bar** (18px below tagline) — left: `location-outline` Ionicon 16 white,
   then a two-line stack: `Near you` (`bodyBold`, white) / `Surfside, FL • 3 mi`
   (`small`, `textMuted`). Right: **Change** button — `surfaceAlt`, 1px `border`,
   `R.full`, padding `10x18`, label `body`/white. Tapping → `LocationPicker`.
4. **Category chip row** — horizontal `ScrollView`, `showsHorizontalScrollIndicator=false`,
   8px between chips, first chip flush with the gutter, `contentContainerStyle` padded so
   the last chip can scroll clear of the right edge.
   - Chip: width 74, height 74, `R.lg`, centered icon (22) above label (`tiny`),
     6px gap. Inactive: `surfaceAlt` bg, 1px `border`, icon tinted with the category
     color, label white. Active: `#FFFFFF` bg, no border, icon + label `onLight`.
   - Selecting a chip filters the gig feed. `all` clears the filter.
5. **Section header** — `Find Your Next Gig` (`h2`, white) left, `See all ›` right
   (`small`, `textMuted`, chevron-forward 14). Tapping → `Gigs` (full list).
6. **Gig list** — up to 4 `GigCard` rows, 18px apart. Rows are **borderless** — no card
   background; they sit directly on black. Pressed state: `opacity 0.6`.
7. **Post a Service CTA** — full-width white button, `R.full`, vertical padding 14,
   centered two-line content: line 1 = `+` (`add` Ionicon 20, `onLight`) + `Post a
   Service` (`h3`, `onLight`); line 2 = `Set your skills. Get hired.` (`tiny`,
   `onLightMuted`). Tapping → `PostService`. 8px below the last gig row + 24px.
8. 24px bottom padding so content clears the tab bar.

### 3.1 `GigCard`

```
[ 72x72 photo ]  Title (h3, white, 1 line, flex)        $40 (h3, white, right)
    R.md         📍 Surfside, FL • 0.4 mi (small, textMuted)
                 [Outdoor] [One-time]                   2h ago (tiny, textSubtle)
```
- Photo: 72x72, `R.md`, `resizeMode: 'cover'`. If `imageUrl` is missing or fails to
  load, fall back to a solid `surfaceAlt` tile with the category icon in the category
  color at 26.
- Row 2 icon: `location-outline` 12 `textMuted`, 4px before the text.
- Tags: `surfaceAlt` pills, `R.full`, padding `4x10`, `tiny`, `textMuted`, 6px apart.
- Price and timestamp are right-aligned in their rows; title/meta column is `flex: 1`
  with `minWidth: 0` so long titles ellipsize (`numberOfLines={1}`).
- Whole row is pressable → `GigDetail` with the gig id.

Mock feed order (this exact data seeds the app):

| Title | Price | Location | Distance | Tags | Posted |
|---|---|---|---|---|---|
| Lawn Mowing | $40 | Surfside, FL | 0.4 mi | Outdoor, One-time | 2h ago |
| Dog Walking | $25 | Bal Harbour | 0.8 mi | Pets, Recurring | 4h ago |
| Help Moving Boxes | $60 | Miami Beach | 1.1 mi | Moving, One-time | 5h ago |
| Math Tutoring (HS) | $35 | Surfside, FL | 1.3 mi | Tutoring, Recurring | 6h ago |

---

## 4. Screen: Analytics — `AnalyticsScreen`

1. **Top row** — right-aligned: `This Month ⌄` pill (`surfaceAlt`, 1px `border`,
   `R.full`, padding `10x16`, label `body`/white, `chevron-down` 14 `textMuted`) then
   the 40px avatar. The pill opens a range menu: **This Week / This Month / Last 3
   Months / This Year / All Time**. Changing the range changes every number on the
   screen.
2. **Title** — `Analytics` (`display`) and `Track your progress. See your impact.`
   (`body`, `textMuted`).
3. **Total Earned card** — `surface`, `R.xl`, padding 18, 20px below the subtitle.
   Left column (`flex: 1`):
   - `Total Earned` (`small`, `textMuted`)
   - Row: `$842` (`display`, white, tabular) + 8px + delta badge: `successBg` pill,
     `R.full`, padding `4x8`, `arrow-up` Ionicon 11 `success` + `28%` (`tiny`,
     `success`). A negative delta uses `danger`/`rgba(255,69,58,0.16)` and `arrow-down`.
   - `+ $184 from last month` (`tiny`, `textMuted`), 6px below.
   Right: `MiniBarChart`, width 132, height 92 — 4 bars, 10px gap, `R.sm` top corners,
   bottom-aligned. Last bar (current period) is `#FFFFFF`; earlier bars step through
   `#2A2A2A → #333 → #3D3D3D`. Month label under each bar (`tiny`, `textMuted`; the
   active one is white). Bar heights are proportional to value with a 14px floor.
   Months: Jun, Jul, Aug, Sep.
4. **Stat tiles** — three equal columns, 10px apart, `surface`, `R.lg`, padding 14.
   Row 1: outline icon 17 white + 8px + value (`h2`, white, tabular). Row 2 (6px
   below): label (`tiny`, `textMuted`).
   - `briefcase-outline` **12** Jobs Completed
   - `star-outline` **4.9** Avg. Rating
   - `people-outline` **18** New Clients
5. **Earnings Breakdown** — section header with `See all ›` → `EarningsBreakdown`.
   Rows 14px apart:
   `[category icon 18, category color]  Name (body, white, flex)  $320 (bodyBold,
   white)  [track w:148 h:6 R.full surfaceHigh, fill #FFF]  38% (small, textMuted,
   w:38, right)`
   Seed: Yard Work $320 / 38%, Tutoring $210 / 25%, Moving $180 / 21%, Pets $132 / 16%.
6. **Reviews** — section header with `See all ›` → `Reviews`. Below, a 2-up row, 10px
   gap, both `surface`, `R.lg`, padding 16, equal height:
   - Left (`flex: 4`): `4.9` (`display`, white, tabular), 5 filled `star` Ionicons 15
     in `star` color, `(42 reviews)` (`tiny`, `textMuted`).
   - Right (`flex: 6`): `“Super reliable and did an amazing job. Highly recommend!”`
     (`small`, white, 3 lines max), then a row: 28px avatar image + `Sarah M.`
     (`tiny`, white) over `Homeowner` (`tiny`, `textSubtle`).
7. 24px bottom padding.

---

## 5. Tab bar — `TabBar` (custom, replaces the default bottom-tab bar)

Black background, 1px top `border`, height 56 + bottom safe-area inset. Two items,
centered, equal flex: **Home** (`home` / `home-outline`) and **Analytics**
(`stats-chart` / `stats-chart-outline`). Icon 22 above label (`tiny`), 4px gap. Active
= white, inactive = `textSubtle`. Filled icon when active, outline when not. Pressing
the active tab scrolls that tab to top is **not** required.

---

## 6. Secondary screens (reachable from the two tabs)

All share `ScreenHeader` — a back chevron (`chevron-back` 24, white, 44x44 hit area), a
title (`h2`) and an optional right slot; 8px below the safe area, 20px gutter.

| Screen | Route | Reached from | Contents |
|---|---|---|---|
| All Gigs | `Gigs` | "See all" on Home | Search field, horizontal category filter, sort control (Newest / Closest / Highest Pay), full `GigCard` list, result count, empty state. |
| Gig Detail | `GigDetail` | any `GigCard` | Hero image 200px, title + price, category/tag pills, meta rows (location + distance, posted, schedule type, poster name + rating), description, "What you'll do" bullets, sticky bottom bar: **Apply** (white CTA) + save (bookmark) icon button. Applying sets the gig to `applied` and shows a toast; the CTA then reads "Applied" and is disabled. |
| Post a Service | `PostService` | white CTA / My Services | Three steps on one route with a `1 — 2 — 3` indicator (Category, Details, Preview). **1** a 4×2 grid of category tiles (the Home chip style; the last tile, **More**, files under *Other*). **2** photos first (up to 5, the first is the cover), then title, description, whole-dollar price + Hourly / Fixed, duration (Under 1 hour / 1–2 / 2–4 / 4+ hours), location, availability day toggles. **3** the listing as a customer sees it (Gig Detail's hero, title + price, meta rows), with **Edit** and **Post Service**. Every step's button stays enabled; pressing it with gaps shows the inline errors plus a one-line summary. Back, Edit and the step dots keep everything entered. Signed in to Supabase it saves through `src/api/serviceDraft.ts`; otherwise to the store, and the preview says so. Ends on My Services with a toast. With a `serviceId` it edits that service, opening on step 2. |
| My Services | `MyServices` | Profile / after posting | List of services the user offers with edit + pause/activate; empty state if none. |
| Past Jobs | `PastJobs` | header link | Completed jobs grouped newest-first: title, client, date, payout, rating stars; header summary of total earned + jobs count. |
| Profile | `Profile` | avatar | Avatar + name + `@handle`, trust score card (score 0–100 with progress + level label), verification badges, stat row (jobs, rating, response time), links: My Services, Past Jobs, Saved Gigs, Applications, Switch to Hiring, Settings. |
| Location Picker | `LocationPicker` | "Change" | Search field + list of nearby cities with distance; a radius slider row (1/3/5/10/25 mi) as chips; selecting updates the Home location bar and re-filters gigs by distance. |
| Earnings Breakdown | `EarningsBreakdown` | "See all" | Every category with amount, %, job count and a bar; totals header. |
| Reviews | `Reviews` | "See all" | Rating summary (average, count, 5→1 distribution bars) and the full review list (avatar, name, role, stars, date, body). |
| Applications | `Applications` | Profile | Gigs the user applied to, with status pill (Applied / Accepted / Declined). |
| Saved Gigs | `SavedGigs` | Profile | Saved gigs, unsave from the row, empty state. |

### 6.1 Hire side — `HireHomeScreen` (`HireHome`) + `PostRequest`

Reached from Profile → **Switch to Hiring**. Same design language.
- Header `Hire` / `Get it done today.` + the location bar.
- A white CTA **Post a Request** → `PostRequest` (title, category, budget, when,
  description → creates a request that shows in "Your requests").
- `Your requests` section: request cards with status pill and applicant count.
- `Workers near you`: `WorkerCard` rows — avatar, name, headline, rating + jobs,
  distance, starting price, and a **Hire** button that opens the worker profile.
- Switching back to Earn from the same screen's header.

---

## 7. State + data contract

### 7.1 `src/data/types.ts`
Already written. Do not change the shapes; add types only if a screen truly needs one.

### 7.2 `src/data/mock.ts`
Exports seed data that matches every number in the mock:
`USER`, `CATEGORIES`, `GIGS` (12+, including the 4 above, first four in feed order),
`PAST_JOBS`, `REVIEWS`, `EARNINGS_BY_RANGE` (one `EarningsSummary` per `TimeRange`),
`NEARBY_PLACES`, `WORKERS`, `SERVICES`, `HIRE_REQUESTS`.
Photos use stable Unsplash URLs (`https://images.unsplash.com/photo-...?w=400&q=70`);
every consumer must degrade gracefully when an image fails.

### 7.3 `src/store/AppStore.tsx`
A single React context provider, `AppProvider`, plus `useApp()`.

```ts
type AppState = {
  user: User;
  mode: 'earn' | 'hire';
  location: { label: string; distanceMi: number };   // "Surfside, FL", 3
  radiusMi: number;                                  // default 3
  category: CategoryId;                              // 'all'
  query: string;
  sort: 'newest' | 'closest' | 'highest';
  timeRange: TimeRange;                              // 'month'
  gigs: Gig[];
  savedIds: string[];
  applications: Application[];
  services: Service[];
  requests: HireRequest[];
  pastJobs: PastJob[];
  reviews: Review[];
  toast: string | null;
};

type AppActions = {
  setMode, setCategory, setQuery, setSort, setTimeRange, setLocation, setRadius,
  toggleSave(gigId), applyToGig(gigId, note?), withdrawApplication(gigId),
  postService(draft), updateService(id, patch), toggleServiceActive(id),
  postRequest(draft), showToast(msg), dismissToast,
};

// Derived selectors exported from the same module:
useVisibleGigs()      // category + query + radius filter, then sort
useEarnings()         // EarningsSummary for the active timeRange
useSavedGigs(), useApplications(), useIsSaved(id), useHasApplied(id)
```
State is in-memory with `AsyncStorage` persistence for `savedIds`, `applications`,
`services`, `requests`, `location`, `radiusMi` under the key `teenworks.v1`.
Hydration must never block the first paint and must be wrapped in try/catch — a
storage failure is a no-op, not a crash.

---

## 8. Interaction + platform rules

- **React Native + react-native-web (Expo SDK 51).** Everything must render on web.
- No `shadow*` props — they warn on web; use borders and surface steps instead.
- Never use `gap` on `View` for layout that matters (RN 0.74 web support is fine, but
  prefer explicit margins for row spacing to keep native parity). `gap` is acceptable
  inside small flex rows.
- Use `Pressable` with `({ pressed }) => [...]` styles, `hitSlop` on icon-only
  controls, `accessibilityRole` + `accessibilityLabel` on every control.
- Lists longer than ~15 rows use `FlatList`; short ones use `map` inside `ScrollView`.
- Every `ScrollView`/`FlatList` gets `contentContainerStyle` bottom padding of 32 and
  `showsVerticalScrollIndicator={false}`.
- Safe areas via `useSafeAreaInsets()` — top inset on screen containers, bottom inset
  on the tab bar and sticky action bars.
- Text never renders raw `undefined`; format money with `formatMoney`, distance with
  `formatDistance`, relative time with `timeAgo` (all in `src/utils/format.ts`).
- Toast: a single absolutely-positioned pill above the tab bar, auto-dismiss 2.2s.
- No new dependencies. Icons come from `@expo/vector-icons/Ionicons`, which is already
  installed.
