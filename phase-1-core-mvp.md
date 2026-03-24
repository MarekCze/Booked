# Phase 1 — Core MVP Task Tracker

**Goal:** A single tenant can take bookings online and get paid.
**Timeline:** Weeks 1–4
**Deliverable:** One live shop taking real bookings and payments.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Complete |
| `[!]`  | Blocked |

---

## Week 1 — Foundation: Supabase, Schema, Tenant Resolution

### 1.1 Project Scaffolding

**Status:** `[x]` Complete
**Dependencies:** None
**Blockers:** None

- [x] **1.1.1** Initialise Turborepo monorepo with `apps/web` (Next.js 14+ App Router) and `packages/shared`
  - Run `npx create-turbo@latest`, add Next.js app with App Router, TypeScript strict mode
  - Configure `turbo.json` with `build`, `dev`, `lint` pipelines
  - Add `.nvmrc` pinning Node version
- [x] **1.1.2** Install and configure Tailwind CSS in `apps/web`
  - Tailwind v3+, add `tailwind.config.ts` with theme extensions for brand colours
  - Set up `globals.css` with base layer resets
- [x] **1.1.3** Install Supabase client libraries
  - `@supabase/supabase-js` and `@supabase/ssr` in `apps/web`
  - Create `lib/supabase/client.ts` (browser client) and `lib/supabase/server.ts` (server component / route handler client)
  - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- [x] **1.1.4** Install Supabase CLI locally and link to project
  - `npx supabase init` in repo root → creates `supabase/` directory
  - `npx supabase link --project-ref <ref>` to connect to remote project
- [x] **1.1.5** Create `packages/shared/types.ts` with initial TypeScript type stubs for Tenant, Specialist, Service, Slot, Booking

### 1.2 Database Schema & Migrations

**Status:** `[~]` In progress
**Dependencies:** 1.1.4
**Blockers:** None

- [x] **1.2.1** Write migration: `tenants` table
  - Columns: `id`, `slug` (unique), `name`, `timezone` (default `Europe/Dublin`), `currency` (default `EUR`), `stripe_account_id`, `settings` (jsonb), `created_at`
  - Add unique index on `slug`
- [x] **1.2.2** Write migration: `specialists` table
  - Columns: `id`, `tenant_id` (FK → tenants), `name`, `bio`, `photo_url`, `display_order`, `is_active`, `slots_generated_through` (date, nullable), `created_at`
- [x] **1.2.3** Write migration: `services` table
  - Columns: `id`, `tenant_id` (FK → tenants), `specialist_id` (FK → specialists, nullable for global services), `name`, `duration_min`, `price_cents`, `is_active`
- [x] **1.2.4** Write migration: `slots` table
  - Columns: `id`, `tenant_id` (FK → tenants), `specialist_id` (FK → specialists), `starts_at`, `ends_at`, `status` (default `available`), `booking_id` (nullable), `held_until`, `created_at`
  - Unique constraint on `(specialist_id, starts_at)`
  - Partial index: `idx_slots_availability` on `(specialist_id, starts_at) WHERE status = 'available'`
- [x] **1.2.5** Write migration: `bookings` table
  - Columns: `id`, `tenant_id`, `specialist_id`, `service_id`, `starts_at`, `ends_at`, `slot_count`, `client_id` (FK → auth.users, nullable), `client_name`, `client_phone`, `status`, `payment_status`, `stripe_payment_intent_id`, `price_cents`, `notes`, `created_at`
  - Add deferred FK from `slots.booking_id` → `bookings.id` (ON DELETE SET NULL)
- [x] **1.2.6** Write migration: `schedule_templates` table
  - Columns: `id`, `tenant_id`, `specialist_id`, `day_of_week` (0=Mon..6=Sun), `start_time`, `end_time`, `break_start`, `break_end`
- [x] **1.2.7** Write migration: `tenant_members` table
  - Columns: `id`, `tenant_id` (FK → tenants), `user_id` (FK → auth.users), `role` (default `staff`)
  - Unique constraint on `(tenant_id, user_id)`
- [ ] **1.2.8** Run all migrations against Supabase project, verify with `supabase db diff`
- [ ] **1.2.9** Generate TypeScript types from schema: `npx supabase gen types typescript --linked > lib/supabase/types.ts`

### 1.3 Row-Level Security Policies

**Status:** `[~]` In progress
**Dependencies:** 1.2.8
**Blockers:** None

- [x] **1.3.1** Enable RLS on all tables (`alter table <name> enable row level security`)
- [x] **1.3.2** `tenants` — public SELECT by slug (for subdomain resolution), admin UPDATE for own tenant only
- [x] **1.3.3** `specialists` — public SELECT where `is_active = true`, admin ALL scoped via `tenant_members`
- [x] **1.3.4** `services` — public SELECT where `is_active = true`, admin ALL scoped via `tenant_members`
- [x] **1.3.5** `slots` — public SELECT (read availability), admin ALL scoped via `tenant_members`. Booking-flow UPDATEs handled by RPC functions running as `security definer`
- [x] **1.3.6** `bookings` — authenticated SELECT for own bookings (`client_id = auth.uid()`), admin SELECT/UPDATE scoped via `tenant_members`. INSERT via RPC function (security definer)
- [x] **1.3.7** `schedule_templates` — admin ALL scoped via `tenant_members`, no public access
- [x] **1.3.8** `tenant_members` — admin SELECT/INSERT/DELETE for own tenant, no public access
- [ ] **1.3.9** Test all policies: verify a non-authenticated user can read specialists/services/slots but not bookings; verify cross-tenant isolation

### 1.4 Postgres RPC Functions

**Status:** `[~]` In progress
**Dependencies:** 1.2.8
**Blockers:** None

- [x] **1.4.1** Write `ensure_slots_exist(p_specialist_id uuid, p_from date, p_to date)` function
  - Check `specialists.slots_generated_through` watermark
  - Read `schedule_templates` for the specialist
  - Generate 15-min slot rows for each day in the gap, skipping break periods
  - Update `slots_generated_through` to `p_to`
  - Run as `security definer` so public clients can trigger it
- [x] **1.4.2** Write `hold_slots(p_specialist_id uuid, p_starts_at timestamptz, p_slot_count int)` function
  - Single transaction: SELECT N contiguous available slots with `FOR UPDATE SKIP LOCKED`
  - Verify count matches and slots are truly contiguous (no gaps)
  - SET `status = 'held'`, `held_until = now() + interval '5 minutes'`
  - Return array of slot IDs on success, raise exception on failure
  - Run as `security definer`
- [x] **1.4.3** Write `confirm_booking(p_slot_ids uuid[], p_specialist_id uuid, p_service_id uuid, p_client_id uuid, p_client_name text, p_client_phone text, p_price_cents int)` function
  - Verify all slots are still `held` and belong to the caller (or match the hold)
  - INSERT into `bookings`, UPDATE slots to `status = 'booked'` with `booking_id`
  - Return booking ID
  - Run as `security definer`
- [x] **1.4.4** Write `cancel_booking(p_booking_id uuid)` function
  - Set `bookings.status = 'cancelled'`
  - Set all associated `slots.status = 'available'`, clear `booking_id`
  - Run as `security definer`
- [x] **1.4.5** Write `get_available_start_times(p_specialist_id uuid, p_date date, p_slots_needed int)` function
  - Uses window function to find all start times where N contiguous slots are available
  - Returns array of `timestamptz` values
  - Calls `ensure_slots_exist()` internally before querying
- [ ] **1.4.6** Test all RPCs with raw SQL: hold, confirm, cancel, concurrent hold race conditions

### 1.5 Seed Data

**Status:** `[~]` In progress
**Dependencies:** 1.4.6
**Blockers:** None

- [x] **1.5.1** Create `supabase/seed.sql` with one demo tenant (`slug: demo-barbers`)
- [x] **1.5.2** Seed 3 specialists with names, bios, placeholder photo URLs
- [x] **1.5.3** Seed 5–6 services (mix of 15, 30, 60, 90 min durations, various prices)
- [x] **1.5.4** Seed schedule templates (Mon–Sat, 09:00–17:30, 13:00–13:30 break)
- [x] **1.5.5** Seed one `tenant_members` row linking a test admin user
- [ ] **1.5.6** Verify seed by running `ensure_slots_exist()` for a specialist and confirming slots appear

### 1.6 Subdomain Tenant Resolution Middleware

**Status:** `[~]` In progress
**Dependencies:** 1.1.3, 1.2.1
**Blockers:** None

- [x] **1.6.1** Create `apps/web/middleware.ts`
  - Extract subdomain from `request.headers.get('host')` (handle `slug.clipbook.io` and `slug.localhost:3000`)
  - Query Supabase `tenants` table by `slug` (use service role key in middleware for unauthenticated reads, or rely on public RLS policy)
  - If tenant found: set `x-tenant-id` header and `tenant-slug` cookie on the request
  - If tenant not found: redirect to marketing site or 404 page
  - Skip middleware for `app.clipbook.io` (admin routes) and `www.clipbook.io` (marketing)
- [x] **1.6.2** Create `lib/tenant.ts` helper: `getTenantId()` reads from cookie/header in server components
- [ ] **1.6.3** Test locally with `demo-barbers.localhost:3000` (Chrome supports subdomains on localhost natively)
- [x] **1.6.4** Add tenant-not-found fallback page (`apps/web/app/not-found.tsx`)

---

## Week 2 — Booking UI: Specialists, Services, Calendar

### 2.1 Specialist Scroll Cards

**Status:** `[ ]` Not started
**Dependencies:** 1.6.2, 1.3.3
**Blockers:** None

- [ ] **2.1.1** Create route group `app/(client)/page.tsx` — landing page for tenant
  - Fetch tenant branding from `tenants.settings` using `getTenantId()`
  - Render tenant name, logo placeholder, "Book Now" hero section
- [ ] **2.1.2** Create `components/specialist-carousel.tsx`
  - Fetch specialists: `select * from specialists where tenant_id = $1 and is_active = true order by display_order`
  - Desktop: CSS grid of cards (2–4 columns)
  - Mobile: horizontal scroll with `scroll-snap-type: x mandatory`, each card ~85vw width
  - Each card: photo (with fallback avatar), name, short bio excerpt, specialty tags
  - Tap/click card → sets selected specialist in URL search params or state
- [ ] **2.1.3** Install `framer-motion` for entry animations and subtle hover/tap effects on cards
  - Staggered fade-in on load, scale on hover/tap
  - NOT a stacked swipe deck — horizontal scroll with snap
- [ ] **2.1.4** Add "next available" badge to each specialist card
  - Query: first available slot per specialist for today/tomorrow
  - Display as "Next: Today 2:30 PM" or "Next: Tomorrow 10:00 AM"
- [ ] **2.1.5** Handle edge case: tenant has only 1 specialist → auto-select, skip carousel

### 2.2 Service Picker

**Status:** `[ ]` Not started
**Dependencies:** 2.1.2
**Blockers:** None

- [ ] **2.2.1** Create `app/(client)/book/page.tsx` — booking flow page
  - Read selected specialist from search params
  - Multi-step flow within single page (state machine or step counter)
- [ ] **2.2.2** Create `components/service-list.tsx`
  - Fetch: `select * from services where tenant_id = $1 and (specialist_id = $2 or specialist_id is null) and is_active = true`
  - Render as vertical list: service name, duration badge (e.g., "30 min"), price (e.g., "€15.00")
  - Tap to select → advance to slot picker step
- [ ] **2.2.3** Calculate `slots_needed` from selected service: `Math.ceil(service.duration_min / tenant_granularity)`
  - Read granularity from `tenants.settings` (default 15)
  - Pass `slots_needed` to calendar component

### 2.3 Slot Calendar with Realtime

**Status:** `[ ]` Not started
**Dependencies:** 2.2.3, 1.4.1, 1.4.5
**Blockers:** None

- [ ] **2.3.1** Create `components/date-strip.tsx`
  - Horizontal scrollable row of date pills: today + next 13 days
  - Each pill shows day name + date number (e.g., "Mon 14")
  - Tap to select date, active pill highlighted
  - CSS `scroll-snap-type: x mandatory` for snap scrolling
- [ ] **2.3.2** Create `components/time-slot-grid.tsx`
  - On date select: call `ensure_slots_exist()` RPC for that specialist + date range
  - Then call `get_available_start_times()` RPC with `specialist_id`, `date`, `slots_needed`
  - Render available start times as tappable buttons in a vertical list or grid
  - Unavailable times: greyed out, not rendered (keep it clean)
  - Show time in tenant's timezone (read from `tenants.timezone`)
- [ ] **2.3.3** Subscribe to Supabase Realtime on `slots` table
  - Channel filter: `specialist_id=eq.{id}` and `starts_at` within displayed date range
  - On `UPDATE` event (status changed): re-query available start times
  - Slots disappear in real time as other users book them
- [ ] **2.3.4** Handle edge case: no available slots for selected date → show "No availability" message with suggestion to try another day
- [ ] **2.3.5** Handle edge case: selected slot becomes unavailable between display and tap → show toast "Slot just taken, please pick another"

---

## Week 3 — Booking Confirmation, Stripe Connect, Payments

### 3.1 Slot Hold & Confirmation Flow

**Status:** `[ ]` Not started
**Dependencies:** 2.3.2, 1.4.2
**Blockers:** None

- [ ] **3.1.1** Create `components/booking-confirmation.tsx`
  - Shows summary: specialist name, service name, date/time, duration, price
  - Form fields: client name (text), client phone (tel input with Irish +353 default)
  - "Confirm & Pay" button
- [ ] **3.1.2** On "Confirm & Pay" click:
  - Call `hold_slots()` RPC with specialist_id, starts_at, slot_count
  - If success: proceed to Stripe Checkout
  - If failure (slots taken): show error toast, re-query available times
- [ ] **3.1.3** Add 5-minute countdown timer visible to user after successful hold
  - Display "Slot reserved for 4:32" countdown
  - On expiry: show "Reservation expired" message, prompt to re-select

### 3.2 Stripe Connect Onboarding (Tenant Setup)

**Status:** `[ ]` Not started
**Dependencies:** 1.2.1
**Blockers:** Stripe account required (platform account)

- [ ] **3.2.1** Create Stripe platform account, enable Connect Standard
- [ ] **3.2.2** Create Supabase Edge Function: `supabase/functions/stripe-connect-onboard/index.ts`
  - Receives `tenant_id` from authenticated admin request
  - Creates Stripe Account (`type: 'standard'`) via Stripe API
  - Stores `stripe_account_id` on `tenants` row
  - Creates Account Link (onboarding URL) and returns it to client
- [ ] **3.2.3** Create Supabase Edge Function: `supabase/functions/stripe-connect-return/index.ts`
  - Handles return from Stripe onboarding
  - Checks `account.charges_enabled` and `account.payouts_enabled`
  - Updates `tenants.settings` with onboarding status
- [ ] **3.2.4** Add environment variables to Supabase: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] **3.2.5** Test onboarding flow end-to-end with Stripe test mode

### 3.3 Stripe Checkout Session

**Status:** `[ ]` Not started
**Dependencies:** 3.1.2, 3.2.5
**Blockers:** Stripe Connect must be working (3.2.5)

- [ ] **3.3.1** Create Supabase Edge Function: `supabase/functions/create-checkout/index.ts`
  - Receives: `booking_slot_ids[]`, `service_id`, `tenant_id`, `client_name`, `client_phone`
  - Validates held slots still belong to this session
  - Creates Stripe Checkout Session:
    - `mode: 'payment'`
    - `line_items`: one item with service name and price
    - `payment_intent_data.transfer_data.destination`: tenant's `stripe_account_id`
    - `payment_intent_data.application_fee_amount`: platform fee (percentage of price)
    - `success_url` and `cancel_url` with booking context
  - Returns Checkout Session URL
- [ ] **3.3.2** Redirect client to Stripe Checkout URL after successful hold
- [ ] **3.3.3** Create success page: `app/(client)/book/success/page.tsx`
  - Reads `session_id` from URL params
  - Displays booking confirmation with details
  - "Add to calendar" link (simple `.ics` download — deferred to Phase 3 if tight on time)
- [ ] **3.3.4** Create cancel/back page: `app/(client)/book/cancelled/page.tsx`
  - Releases held slots (or let TTL expire)
  - "Try again" link back to calendar

### 3.4 Stripe Webhook Handler

**Status:** `[ ]` Not started
**Dependencies:** 3.3.1, 1.4.3
**Blockers:** None

- [ ] **3.4.1** Create Supabase Edge Function: `supabase/functions/stripe-webhook/index.ts`
  - Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
  - Use `Stripe-Account` header to identify Connect account → resolve `tenant_id`
- [ ] **3.4.2** Handle `checkout.session.completed` event:
  - Extract `slot_ids`, `service_id`, client details from session metadata
  - Call `confirm_booking()` RPC to finalise booking and slot status
  - Set `bookings.payment_status = 'paid'` and store `payment_intent_id`
- [ ] **3.4.3** Handle `payment_intent.payment_failed` event:
  - Release held slots (`status = 'available'`, clear `booking_id`)
- [ ] **3.4.4** Handle `account.updated` event:
  - Update `tenants.settings` with current onboarding/charges_enabled status
- [ ] **3.4.5** Register webhook endpoint in Stripe dashboard (or via CLI for test mode)
  - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`
- [ ] **3.4.6** Test full payment flow end-to-end with Stripe test cards

---

## Week 4 — Auth, Guest Booking, Admin Today View, Deployment

### 4.1 Supabase Auth: Phone OTP & Anonymous

**Status:** `[ ]` Not started
**Dependencies:** 1.1.3
**Blockers:** Supabase project must have phone auth provider enabled (Twilio or built-in)

- [ ] **4.1.1** Enable phone OTP provider in Supabase dashboard
  - Configure SMS provider (Supabase built-in for dev, Twilio for production)
  - Set OTP expiry, rate limits
- [ ] **4.1.2** Create `components/auth-modal.tsx`
  - Phone input with country code selector (default +353 Ireland)
  - "Send code" button → calls `supabase.auth.signInWithOtp({ phone })`
  - OTP input (6 digits) → calls `supabase.auth.verifyOtp({ phone, token })`
  - Success: close modal, continue booking flow
- [ ] **4.1.3** Enable anonymous auth in Supabase dashboard
- [ ] **4.1.4** Implement guest booking flow:
  - If user not authenticated when confirming booking → call `supabase.auth.signInAnonymously()`
  - Capture `client_name` and `client_phone` in booking form regardless
  - After booking: show prompt "Want to save your bookings? Verify your phone number"
- [ ] **4.1.5** Implement identity linking:
  - After anonymous user verifies phone → call `supabase.auth.linkIdentity()` to merge
  - Previous bookings (linked via `client_id`) carry over
- [ ] **4.1.6** Add Google social login as secondary option (Supabase OAuth provider)
  - Configure Google OAuth credentials in Supabase dashboard
  - Add "Continue with Google" button to auth modal

### 4.2 Admin "Today View"

**Status:** `[ ]` Not started
**Dependencies:** 1.3.6, 1.3.8, 1.2.7
**Blockers:** None

- [ ] **4.2.1** Create route group `app/(admin)/dashboard/page.tsx`
  - Protected route: check `tenant_members` for `auth.uid()` with role `admin` or `staff`
  - Redirect to login if not authenticated or not a member
- [ ] **4.2.2** Create `components/admin/today-bookings.tsx`
  - Query: `select bookings.*, specialists.name as specialist_name, services.name as service_name from bookings join specialists... where bookings.tenant_id = $1 and bookings.starts_at::date = current_date order by bookings.starts_at`
  - Group by specialist in collapsible sections
  - Each booking row: time, client name, service, duration, payment status badge
- [ ] **4.2.3** Add action buttons per booking:
  - "Mark Complete" → update `bookings.status = 'completed'`
  - "No Show" → update `bookings.status = 'no_show'`
  - "Cancel" → call `cancel_booking()` RPC
- [ ] **4.2.4** Add Supabase Realtime subscription on `bookings` table for live updates (new bookings appear without refresh)
- [ ] **4.2.5** Add simple stats bar at top: total bookings today, revenue today (sum of `price_cents` where `payment_status = 'paid'`), next upcoming booking

### 4.3 Deployment

**Status:** `[ ]` Not started
**Dependencies:** All above tasks
**Blockers:** Domain name registered, DNS access

- [ ] **4.3.1** Deploy Next.js app to Vercel
  - Connect GitHub repo, set `apps/web` as root directory
  - Add environment variables: Supabase URL, anon key, Stripe keys
- [ ] **4.3.2** Configure wildcard subdomain DNS
  - Add `*.clipbook.io` CNAME pointing to Vercel
  - Add wildcard domain in Vercel project settings
- [ ] **4.3.3** Configure Supabase production environment
  - Verify all migrations applied
  - Set production Stripe webhook URL
  - Enable phone auth with production SMS provider
- [ ] **4.3.4** Create first real tenant in production
  - Insert tenant row, create `tenant_members` entry for shop owner
  - Guide shop owner through Stripe Connect onboarding
- [ ] **4.3.5** Smoke test full flow on production:
  - Visit `<slug>.clipbook.io` → select specialist → pick service → pick slot → hold → pay → confirm
  - Verify booking appears in admin today view
  - Verify Stripe payment received in connected account
- [ ] **4.3.6** Set up pg_cron job for held-slot expiry cleanup
  - `SELECT cron.schedule('release-expired-holds', '* * * * *', 'UPDATE slots SET status = ''available'', held_until = NULL WHERE status = ''held'' AND held_until < now()');`

---

## Phase 1 Summary

| Week | Key Deliverables | Task Count |
|------|-----------------|------------|
| 1 | Schema, RLS, RPC functions, seed data, middleware | 30 |
| 2 | Specialist cards, service picker, realtime calendar | 13 |
| 3 | Slot hold, Stripe Connect, Checkout, webhooks | 17 |
| 4 | Auth (OTP + anonymous + social), admin today view, deploy | 18 |
| **Total** | | **78** |
