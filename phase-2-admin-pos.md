# Phase 2 — Admin & POS Task Tracker

**Goal:** Shop owner can self-manage. Walk-ins can pay by NFC.
**Timeline:** Weeks 5–7
**Deliverable:** Self-service admin dashboard + in-shop NFC payments working.
**Prerequisites:** Phase 1 complete (live tenant taking online bookings and payments).

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Complete |
| `[!]`  | Blocked |

---

## Week 5 — Admin Dashboard

### 5.1 Admin Layout & Navigation

**Status:** `[x]` Complete
**Dependencies:** Phase 1 admin route group (4.2.1)
**Blockers:** None

- [x] **5.1.1** Create `app/(admin)/layout.tsx` with sidebar navigation
  - Sidebar links: Dashboard, Revenue, Specialists, Services, Schedule, Settings
  - Mobile: collapsible hamburger menu
  - Top bar: tenant name, role badge (admin/staff), logout button
  - "View Site" external link to tenant subdomain
- [x] **5.1.2** Create admin auth guard as a layout-level server component
  - Query `tenant_members` for `auth.uid()` → if no row, redirect to login
  - Pass `tenant_id` and `role` (admin/staff) into context/provider for child routes
- [x] **5.1.3** Create admin login page `app/(admin)/login/page.tsx`
  - Email + password form using `supabase.auth.signInWithPassword()`
  - Redirect to dashboard on success

### 5.2 Specialist Management (CRUD)

**Status:** `[x]` Complete
**Dependencies:** 5.1.2, Phase 1 RLS (1.3.3)
**Blockers:** None

- [x] **5.2.1** Create `app/(admin)/specialists/page.tsx` — specialist list view
  - Fetch all specialists for tenant (including inactive, unlike client view)
  - Table/list: photo thumbnail, name, active/inactive badge, display order, edit button
  - "Add Specialist" button at top
- [x] **5.2.2** Create `app/(admin)/specialists/edit/[id]/page.tsx` — edit specialist form
  - Fields: name (text), bio (textarea), display order (number), is_active (toggle)
  - Photo upload (see 5.2.3)
  - Save → `supabase.from('specialists').update(...)`, redirect to list
  - Delete button with confirmation modal (only if no future bookings)
- [x] **5.2.3** Implement photo upload to Supabase Storage
  - Create `specialist-photos` storage bucket (public read, authenticated write)
  - On file select: upload to `specialist-photos/{tenant_id}/{specialist_id}.{ext}`
  - Generate public URL, store in `specialists.photo_url`
  - Client-side image resize to 500x500
  - Delete old photo from storage on replacement
- [x] **5.2.4** Create `app/(admin)/specialists/new/page.tsx` — add specialist form
  - Same fields as edit, INSERT into `specialists`
  - Auto-set `display_order` to `max(display_order) + 1` for the tenant
- [x] **5.2.5** Portfolio image management on specialist edit form
  - Upload multiple images to Supabase Storage (resized to 1200x1200)
  - Store URLs in `specialists.portfolio_images` JSONB array
  - Add/remove portfolio images
  - Displayed on specialist profile page (`/specialists/[id]`)
- [x] **5.2.6** Add drag-to-reorder for display_order on the list view
  - Reorder → batch UPDATE `display_order` values

### 5.3 Service Management (CRUD)

**Status:** `[x]` Complete
**Dependencies:** 5.1.2, 5.2.1
**Blockers:** None

- [x] **5.3.1** Create `app/(admin)/services/page.tsx` — service list view
  - Table: name, duration, price, assigned specialist (or "All"), active badge, edit button
  - "Add Service" button
- [x] **5.3.2** Create `app/(admin)/services/[id]/page.tsx` — edit service form
  - Fields: name (text), duration_min (select: 15, 30, 45, 60, 75, 90, 120), price (currency input in cents), specialist assignment (dropdown: "All Specialists" + list of active specialists), is_active (toggle)
  - Save → UPDATE, redirect to list
  - Delete with confirmation (only if no future bookings reference this service)
- [x] **5.3.3** Create `app/(admin)/services/new/page.tsx` — add service form
  - Same fields as edit, INSERT into `services`
- [x] **5.3.4** Add price display formatting helper in `packages/shared`
  - `formatPrice(cents: number, currency: string)` → e.g., "€15.00"
  - Implemented in `packages/shared/format.ts`, re-exported from `apps/web/lib/format.ts`

### 5.4 Schedule Template Editor

**Status:** `[x]` Complete
**Dependencies:** 5.2.1, Phase 1 schema (1.2.6)
**Blockers:** None

- [x] **5.4.1** Create `app/(admin)/schedule/page.tsx` — weekly schedule view
  - Specialist selector at top (button group for switching between specialists)
  - 7-day grid (Mon–Sun) showing configured hours per day
  - Each day cell shows: start time – end time, break period if set
  - "No hours set" placeholder for unconfigured days
- [x] **5.4.2** Create `components/admin/schedule-day-editor.tsx` — day editor modal
  - Opens on clicking a day cell
  - Fields: start_time (time picker), end_time (time picker), break_start (optional), break_end (optional)
  - "Day off" toggle that clears the template for that day
  - Save → UPSERT into `schedule_templates` (on conflict `specialist_id, day_of_week`)
- [x] **5.4.3** Handle slot regeneration on schedule change
  - When a template is updated: delete future `available` slots for affected specialist + day_of_week
  - Reset `specialists.slots_generated_through` to today (force JIT regeneration)
  - Do NOT delete slots with `status = 'booked'` — show warning if schedule change conflicts with existing bookings
- [x] **5.4.4** Add "Copy to all days" shortcut
  - Apply Monday hours to Tue–Sat → batch upsert
  - Common pattern: same hours every working day
- [x] **5.4.5** Add slot granularity setting to tenant settings page
  - Options: 15 min (default), 20 min, 30 min
  - Warning displayed: "Changing this will regenerate all future available slots."
  - Stored in `tenants.settings.slot_granularity_min`

### 5.5 Tenant Settings Page

**Status:** `[x]` Complete
**Dependencies:** 5.1.2
**Blockers:** None

- [x] **5.5.1** Create `app/(admin)/settings/page.tsx`
  - Sections: Shop Details, Stripe, Branding, Website Content
- [x] **5.5.2** Shop details section: name, timezone (dropdown with 31 timezones), currency (dropdown: EUR, GBP, USD)
  - Save → UPDATE `tenants` row
- [x] **5.5.3** Stripe section: show onboarding status (connected / not connected)
  - If not connected: "Connect Stripe" button → triggers onboarding flow from Phase 1 (3.2.2)
  - If connected: show account ID, link to Stripe dashboard
- [x] **5.5.4** Branding section: primary colour picker (with hex input), logo upload to Supabase Storage
  - Store in `tenants.settings.branding` as JSON: `{ primary_color, logo_url }`
  - Applied in client-facing pages via CSS variables
- [x] **5.5.5** Website content management section:
  - [x] Homepage: title, subtitle, hero image upload, CTA text
  - [x] About: description (textarea)
  - [x] Gallery: image uploads (multiple), captions, delete individual images
  - [x] Contact: email, phone, address, map embed URL
  - [x] Social: Instagram, Facebook, TikTok URLs
  - All stored in `tenants.settings` JSONB fields
- [x] **5.5.6** Review management: `app/(admin)/reviews/page.tsx`
  - List all reviews with filter tabs (All / Approved / Pending)
  - Approve/reject toggle per review
  - Delete with confirmation
  - Reviews table created via migration (`20240101000019_reviews_table.sql`), "Reviews" link added to admin sidebar

---

## Week 6 — React Native POS App (Stripe Terminal NFC)

### 6.1 React Native Project Setup

**Status:** `[ ]` Not started
**Dependencies:** None (parallel to admin dashboard)
**Blockers:** Apple Developer account (for Tap to Pay on iPhone entitlement), compatible test device

- [ ] **6.1.1** Initialise Expo project in `apps/pos`
  - `npx create-expo-app apps/pos --template blank-typescript`
  - Configure in Turborepo (`turbo.json` pipeline)
- [ ] **6.1.2** Install and configure Supabase client
  - `@supabase/supabase-js` with `AsyncStorage` adapter for auth persistence
  - Create `lib/supabase.ts` with project URL and anon key
- [ ] **6.1.3** Install Stripe Terminal React Native SDK
  - `@stripe/stripe-terminal-react-native`
  - Follow Stripe's Expo/bare workflow instructions (may require prebuild/eject from Expo Go)
  - Ensure iOS: Tap to Pay entitlement added to provisioning profile
  - Ensure Android: NFC permission in `AndroidManifest.xml`
- [ ] **6.1.4** Create `.env` file with Supabase and Stripe publishable key
- [ ] **6.1.5** Verify SDK initialises without crash on physical device (Tap to Pay requires real device, not simulator)

### 6.2 POS Authentication

**Status:** `[ ]` Not started
**Dependencies:** 6.1.2, Phase 1 tenant_members table
**Blockers:** None

- [ ] **6.2.1** Create `app/login.tsx` — staff login screen
  - Email + password form (same credentials as web admin)
  - Call `supabase.auth.signInWithPassword()`
  - On success: query `tenant_members` to get `tenant_id` and verify staff/admin role
  - Store `tenant_id` in app state
- [ ] **6.2.2** Add auto-login on app restart if session is still valid
  - `supabase.auth.getSession()` on app launch
  - If expired: redirect to login
- [ ] **6.2.3** Add logout button in header/settings

### 6.3 Today's Bookings List

**Status:** `[ ]` Not started
**Dependencies:** 6.2.1
**Blockers:** None

- [ ] **6.3.1** Create `app/bookings.tsx` — main screen after login
  - Query: today's bookings for the tenant, ordered by `starts_at`
  - Group by specialist (collapsible sections)
  - Each row: time, client name, service name, duration, payment status badge (paid/unpaid)
- [ ] **6.3.2** Add pull-to-refresh
  - Re-query bookings on pull gesture
- [ ] **6.3.3** Subscribe to Supabase Realtime on `bookings` table (filter by `tenant_id`, today's date)
  - New bookings (from online) appear automatically
  - Payment status updates reflect in real time
- [ ] **6.3.4** Highlight unpaid bookings with prominent "Collect Payment" button
  - Only show for bookings with `payment_status = 'unpaid'` and `status = 'confirmed'`

### 6.4 Stripe Terminal NFC Payment Collection

**Status:** `[ ]` Not started
**Dependencies:** 6.1.3, 6.3.4, Phase 1 Stripe Connect (3.2.5)
**Blockers:** Physical test device with NFC, Stripe Terminal Tap to Pay enabled on platform account

- [ ] **6.4.1** Create Supabase Edge Function: `supabase/functions/stripe-terminal-token/index.ts`
  - Authenticated request from POS app (Supabase auth JWT in header)
  - Resolve `tenant_id` → fetch `tenants.stripe_account_id`
  - Create Stripe Terminal ConnectionToken scoped to the Connected Account (`Stripe-Account` header)
  - Return `{ secret: connectionToken.secret }`
- [ ] **6.4.2** Create `lib/terminal.ts` — Terminal SDK setup
  - Initialise `StripeTerminalProvider` with `fetchTokenProvider` pointing to the Edge Function
  - Configure for Tap to Pay (local mobile reader, no external hardware)
  - Handle `discoverReaders()` → `connectLocalMobileReader()`
- [ ] **6.4.3** Create Supabase Edge Function: `supabase/functions/create-terminal-payment/index.ts`
  - Receives: `booking_id`, `tenant_id`
  - Fetches booking → validates `payment_status = 'unpaid'`
  - Creates Stripe PaymentIntent:
    - `amount`: booking's `price_cents`
    - `currency`: tenant's currency
    - `payment_method_types: ['card_present']`
    - `capture_method: 'automatic'`
    - `transfer_data.destination`: tenant's `stripe_account_id`
    - `application_fee_amount`: platform fee
  - Returns `{ client_secret: paymentIntent.client_secret }`
- [ ] **6.4.4** Create `app/collect.tsx` — payment collection screen
  - Receives `booking_id` from navigation params
  - Shows booking summary (specialist, service, amount)
  - "Ready to Collect" button:
    1. Calls `create-terminal-payment` Edge Function to get PaymentIntent
    2. Calls `retrievePaymentIntent(clientSecret)` on Terminal SDK
    3. Calls `collectPaymentMethod()` → phone shows NFC "Ready to tap" UI
    4. Customer taps card/phone
    5. Calls `confirmPaymentIntent()` → payment captured
    6. Show success animation, navigate back to bookings list
  - Handle errors: card declined, NFC timeout, network error → show error state with retry
- [ ] **6.4.5** Verify webhook handles Terminal payments:
  - `payment_intent.succeeded` event from Terminal payments should trigger same webhook handler (3.4.2) → updates `bookings.payment_status = 'paid'`
  - The `payment_intent.id` should be stored on the booking row
- [ ] **6.4.6** End-to-end test on physical device:
  - Login → see unpaid booking → tap "Collect Payment" → NFC tap with test card → verify booking shows as paid in both POS app and web admin

### 6.5 POS App Build & Distribution

**Status:** `[ ]` Not started
**Dependencies:** 6.4.6
**Blockers:** Apple Developer account, Google Play Console account

- [ ] **6.5.1** Configure EAS Build for iOS and Android
  - `eas.json` with development and preview profiles
  - Set bundle identifiers: `io.clipbook.pos`
- [ ] **6.5.2** Build and distribute via TestFlight (iOS) and internal testing track (Android)
  - For Phase 2: internal distribution only (pilot shop devices)
  - Full App Store/Play Store submission is Phase 3+
- [ ] **6.5.3** Document device setup guide for shop owners
  - How to install from TestFlight/internal track
  - How to login with staff credentials
  - How to pair device for Tap to Pay (one-time setup)

---

## Week 7 — Polish & Edge Cases

### 7.1 Booking Cancellation Flow

**Status:** `[x]` Complete
**Dependencies:** Phase 1 cancel_booking RPC (1.4.4)
**Blockers:** None

- [x] **7.1.1** Add cancellation to client booking confirmation email/page
  - "Need to cancel?" link on success page linking to `/book/cancel?booking={id}`
  - Cancel link included in booking confirmation email
- [x] **7.1.2** Create `app/(client)/book/cancel/page.tsx`
  - Dedicated cancel page with booking summary and "Are you sure?" confirmation
  - `components/cancel-booking-form.tsx` — fetches booking details, calls `cancel_booking()` RPC
  - If paid: triggers refund via `refund-booking` Edge Function (fire and forget)
  - Also available via client account booking history
- [x] **7.1.3** Create Supabase Edge Function: `supabase/functions/refund-booking/index.ts`
  - Authenticated: validates caller is booking owner or tenant admin
  - Creates Stripe Refund against the stored `payment_intent_id` (on connected account)
  - Updates `bookings.payment_status = 'refunded'`
- [x] **7.1.4** Add cancellation from admin dashboard
  - "Cancel" button on booking row in today view
  - Calls `cancel_booking()` RPC to release slots and set status to `cancelled`

### 7.2 Held-Slot Expiry Cleanup

**Status:** `[x]` Complete
**Dependencies:** Phase 1 deployment (4.3.6)
**Blockers:** None

- [ ] **7.2.1** Verify pg_cron job from 4.3.6 is running correctly
  - Check: `SELECT * FROM cron.job` to confirm schedule
  - Manually insert a held slot with past `held_until`, wait 1 min, verify it flips to `available`
  - **Deferred:** Requires live Supabase instance to verify
- [x] **7.2.2** Add logging/monitoring: `slot_expiry_log` table
  - Migration `20240101000020_slot_expiry_log.sql` creates table + updates `release_expired_holds()` to log count
  - Tracks how many holds expire per run (useful for conversion optimisation)
- [x] **7.2.3** Handle edge case: client completes Stripe payment AFTER hold expires
  - Updated `confirm_booking()` RPC to accept slots in `held` OR `available` status (re-acquires expired holds if still free)
  - If slots were taken by someone else: raises `SLOTS_UNAVAILABLE` error
  - Updated `stripe-webhook` to catch this error and auto-refund the payment via Stripe API

### 7.3 Booking Confirmation Notifications

**Status:** `[x]` Complete (code ready, requires Resend API key to activate)
**Dependencies:** Phase 1 booking flow
**Blockers:** Resend API key required for production

- [x] **7.3.1** Choose and configure email provider
  - Resend selected (generous free tier, good DX, Edge Function compatible)
  - Created `supabase/functions/send-email/index.ts` — generic email sender via Resend API
  - Gracefully skips if `RESEND_API_KEY` not set (no crash)
  - Environment variables: `RESEND_API_KEY`, `EMAIL_FROM`
- [x] **7.3.2** Create email template: booking confirmation
  - Inline HTML template with: service, specialist, date/time, amount
  - Includes cancellation link (`/book/cancel?booking={id}`)
  - Clean, minimal design with tenant branding
- [x] **7.3.3** Send confirmation email from `stripe-webhook` after successful booking
  - Reads `session.customer_details.email` from Stripe Checkout
  - If client has email → fires `send-email` Edge Function (fire and forget)
  - If no email → skips (SMS already sent via `send-sms`)
- [~] **7.3.4** Create email template: booking cancellation
  - Cancel flow infrastructure in place (cancel page + refund function)
  - **Deferred:** Cancellation email template not yet wired up (can be added when send-email is tested)

### 7.4 Rebooking (Quick Rebook)

**Status:** `[x]` Complete
**Dependencies:** Phase 1 booking flow
**Blockers:** None

- [x] **7.4.1** Add "Book Again" button to booking success page
  - Pre-fills specialist and service selection via `/book?specialist={id}&service={id}`
  - Shows specialist name in button: "Book Again with {name}"
  - Falls back to looking up most recent booking for authenticated user if no booking ID in URL
- [x] **7.4.2** Add "Book Again" to client booking history
  - "Book Again" button on completed/cancelled bookings in `components/booking-history.tsx`
  - "Reschedule" button on confirmed (upcoming) bookings
  - Pre-fills specialist + service via query params in booking URL

---

## Phase 2 Summary

| Week | Key Deliverables | Task Count | Completed | Deferred |
|------|-----------------|------------|-----------|----------|
| 5 | Admin CRUD (specialists, services, schedule), settings, branding | 22 | 22 | 0 |
| 6 | RN POS app: auth, bookings list, Stripe Terminal NFC, TestFlight build | 18 | 0 | 18 |
| 7 | Cancellation + refund, hold expiry edge cases, email notifications, rebooking | 13 | 11 | 2 |
| **Total** | | **53** | **33** | **20** |

### Deferred Items (require human action / external accounts)
- **6.1–6.5** Entire React Native POS app (requires Apple Developer account, physical device, Stripe Terminal entitlement)
- **7.2.1** pg_cron job verification (requires live Supabase instance)
- **7.3.4** Cancellation email template (infrastructure in place, can be wired up after Resend is tested)
