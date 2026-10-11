# TeenWorks: backend gaps and launch blockers

The mounted app runs on the in-memory `AppStore`, persisted to device storage
(`teenworks.v1`). The Supabase layer (`src/api/*`, `supabase/`) exists but is not
mounted, and the repo has no project credentials. Hire-side writes already go
through `src/services/marketplace.ts`. Replace its function bodies with Supabase
calls and the screens need no changes.

## Critical: fix before any real user data goes in

1. **Every profile is publicly readable.** `schema.sql` defines
   `"... ON public.profiles FOR SELECT USING (true)"`. That exposes `phone`,
   `location_lat`, `location_lng` and `full_name` of every user, including minors, to
   anyone holding the anon key. Restrict SELECT to the owner. Publish a
   `public_profiles` view that holds display fields only (first name + last
   initial, avatar, city, rating, verification flags).
2. **Open needs expose the street address.** The `service_requests` SELECT policy
   returns `address`, `location_lat` and `location_lng` for every `open` request to
   any user. Move the exact address to a separate table that only the hired
   worker (`bookings.status = 'accepted'`) and the client can read. Store a
   rounded or city-level location for discovery.
3. **No age or guardian model.** `profiles` has a `parent_approved` boolean but no
   date of birth, no guardian link and no consent record. The legal risk map
   (Critical items) depends on these existing.

## Missing tables and columns for the Hire flows now in the UI

| UI feature | Needed in the backend |
|---|---|
| Book a service (date, slot, hours) | `bookings.scheduled_date`, `slot`, `hours`, `total`, `area`. Make `request_id` nullable, or create a request per direct booking as `createDirectBookingForService` does today. |
| Status `requested / confirmed / completed / cancelled / declined` | Map to the existing `pending / accepted / completed / cancelled / rejected` enum. |
| Worker accepts or declines | Provider-side screens plus a status transition RPC. Not built: the Earn side has no inbox for incoming bookings yet. |
| Applicants on a need | Applications or offers table (`bookings` rows with `status='pending'` per provider already fit). |
| Reviews on bookings | `reviews` exists; wire `reviewBooking`. |
| Report and block | New `reports` (reporter, target, reason, details, status, reviewer) and `blocks` tables, plus a moderation queue. Reports are currently stored **on the device only**. |
| Service listings | `provider_services` exists; seed `LISTINGS` mirrors it. |
| Payments | None. The UI says so ("nothing is charged"). Needs a processor that supports minors only through a guardian account. See the legal map, section 4. |
| Messaging | The `messages` table exists. There's no UI in the mounted app. If you add it, it needs filtering, guardian visibility for under-18 users and retention rules. |

## Smaller gaps

- `mode` is not persisted. The app always opens on Earn, which is the default the design specifies.
- Images: no upload for needs (would need storage, moderation and EXIF/location stripping).
- Analytics numbers come from `EARNINGS_BY_RANGE` seed data.
