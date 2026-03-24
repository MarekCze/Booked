# Phase 3 — Growth Task Tracker

**Goal:** Multi-tenant self-service onboarding, client retention features, operational tools.
**Timeline:** Weeks 8–10
**Deliverable:** Any shop can sign up and go live independently. Clients get booking history, rebooking, and reminders.
**Prerequisites:** Phase 2 complete (admin dashboard, POS app working).

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Complete |
| `[!]`  | Blocked |

---

## Week 8 — Self-Service Tenant Registration

### 8.1 Marketing / Landing Site

**Status:** `[ ]` Not started
**Dependencies:** None
**Blockers:** None

- [ ] **8.1.1** Create `app/(marketing)/page.tsx` — root landing page for `www.clipbook.io` or `clipbook.io`
  - Hero section: value prop, "Get your shop online in 5 minutes" CTA
  - Feature highlights: online booking, NFC payments, real-time calendar
  - "Sign Up Your Shop" button → registration flow
  - Middleware routes: no subdomain or `www` → marketing layout; subdomain present → tenant client layout
- [ ] **8.1.2** Create `app/(marketing)/pricing/page.tsx`
  - Simple pricing: free tier (with platform fee per transaction) vs paid tier (flat monthly, lower/no platform fee)
  - For MVP: single tier with transaction fee only (keep it simple, iterate pricing later)
- [ ] **8.1.3** Create `app/(marketing)/login/page.tsx`
  - For existing shop owners to access their admin dashboard
  - Email + password → authenticate → resolve `tenant_id` from `tenant_members` → redirect to admin

### 8.2 Tenant Registration Flow

**Status:** `[ ]` Not started
**Dependencies:** 8.1.1, Phase 1 schema
**Blockers:** None

- [ ] **8.2.1** Create `app/(marketing)/register/page.tsx` — multi-step registration
  - Step 1: Owner details — name, email, password → `supabase.auth.signUp()`
  - Step 2: Shop details — shop name, slug (auto-generated from name, editable), timezone, currency
  - Step 3: Stripe Connect onboarding (redirect to Stripe, return to step 4)
  - Step 4: Success — "Your shop is live at `<slug>.clipbook.io`" + link to admin dashboard
- [ ] **8.2.2** Implement slug validation
  - Real-time uniqueness check as user types (debounced query against `tenants.slug`)
  - Regex validation: lowercase alphanumeric + hyphens, 3–50 chars, must start/end with alphanumeric
  - Reserved words blocklist: `www`, `app`, `api`, `admin`, `dashboard`, `billing`, `support`, `help`, `status`, `docs`
  - Show green checkmark / red X inline
- [ ] **8.2.3** Create Supabase Edge Function: `supabase/functions/register-tenant/index.ts`
  - Receives: owner `user_id` (from auth), shop name, slug, timezone, currency
  - Transaction: INSERT into `tenants` → INSERT into `tenant_members` (role: admin) → INSERT default `schedule_templates` (Mon–Sat 09:00–17:30)
  - Returns `tenant_id`
  - Validate slug uniqueness inside transaction (race condition safety)
- [ ] **8.2.4** After tenant creation, trigger Stripe Connect onboarding (reuse 3.2.2 Edge Function)
  - If owner skips Stripe: allow, but show "Stripe not connected" warning in admin
  - Online payments disabled until Stripe is connected; shop can still take walk-in bookings
- [ ] **8.2.5** Create welcome email template
  - Sent after successful registration
  - Contains: shop URL, admin dashboard link, getting started checklist (add specialists, add services, set schedule)

### 8.2b Custom Domain Support

**Status:** `[ ]` Not started
**Dependencies:** 8.2.1
**Blockers:** None

- [ ] **8.2b.1** Add `custom_domain` column to `tenants` table (text, nullable, unique)
- [ ] **8.2b.2** Update middleware to resolve tenants by custom domain as fallback
  - If no subdomain match: check `tenants.custom_domain` against full hostname
- [ ] **8.2b.3** Admin setting to configure custom domain
  - Input field in tenant settings, DNS instructions displayed
- [ ] **8.2b.4** Vercel domain configuration per tenant (manual for now, API in Phase 4)
- [ ] **8.2b.5** Pricing tier: subdomain (base fee) vs custom domain (premium)

### 8.3 Onboarding Wizard (First-Run Admin Experience)

**Status:** `[ ]` Not started
**Dependencies:** 8.2.3
**Blockers:** None

- [ ] **8.3.1** Create `components/admin/onboarding-checklist.tsx`
  - Shown on admin dashboard when shop is newly created
  - Checklist items with completion state:
    - [ ] Add your first specialist
    - [ ] Add at least one service
    - [ ] Set your schedule
    - [ ] Connect Stripe (if not done during registration)
    - [ ] Share your booking link
  - Each item links to the relevant admin page
  - Track completion in `tenants.settings.onboarding_complete` — dismiss when all done
- [ ] **8.3.2** Add "Share your booking link" component
  - Display `<slug>.clipbook.io` with copy-to-clipboard button
  - Generate QR code (use `qrcode` npm package, render as SVG)
  - "Share on WhatsApp / Instagram" quick share links (URL encoded message)
- [ ] **8.3.3** Add "Preview your shop" button in admin
  - Opens `<slug>.clipbook.io` in new tab
  - Allows owner to see what clients see before going public

---

## Week 9 — Client Booking History & Retention

### 9.1 Client Account & Booking History

**Status:** `[ ]` Not started
**Dependencies:** Phase 1 auth (4.1), RLS (1.3.6)
**Blockers:** None

- [ ] **9.1.1** Create `app/(client)/account/page.tsx` — client profile page
  - Accessible from header "My Bookings" link (shown when authenticated)
  - Display: name, phone number, linked login method (phone/Google)
  - "Log out" button
- [ ] **9.1.2** Create `components/booking-history.tsx`
  - Query: `select bookings.*, specialists.name, services.name from bookings where client_id = auth.uid() order by starts_at desc`
  - Sections: "Upcoming" (future bookings, status = confirmed) and "Past" (completed, cancelled, no_show)
  - Each row: date/time, specialist, service, status badge, price
- [ ] **9.1.3** Add actions to upcoming bookings:
  - "Cancel" → cancel flow from Phase 2 (7.1.2)
  - "Reschedule" → cancel + pre-filled re-book (same specialist + service, jump to calendar)
- [ ] **9.1.4** Add cross-tenant booking history
  - A client who books at multiple shops sees all bookings grouped by shop
  - RLS policy: `client_id = auth.uid()` already handles this (not scoped to tenant)
  - Display tenant name as section header

### 9.2 "Book Again" Quick Rebooking

**Status:** `[ ]` Not started
**Dependencies:** 9.1.2
**Blockers:** None

- [ ] **9.2.1** Add "Book Again" button to each past booking in history
  - Pre-fill: specialist_id, service_id, tenant slug
  - Navigate to `<slug>.clipbook.io/book?specialist=<id>&service=<id>`
  - Calendar step loads directly (skip specialist + service selection)
- [ ] **9.2.2** Smart rebooking suggestion on tenant landing page
  - If authenticated client visits a tenant they've booked with before:
  - Show "Welcome back! Book again with [specialist name]?" card above specialist carousel
  - Pre-fills last specialist + last service from their history at this tenant

### 9.3 Favourite Specialists

**Status:** `[ ]` Not started
**Dependencies:** 9.1.1
**Blockers:** None

- [ ] **9.3.1** Create `favourites` table
  - Columns: `id`, `client_id` (FK → auth.users), `specialist_id` (FK → specialists), `created_at`
  - Unique constraint on `(client_id, specialist_id)`
  - RLS: authenticated users can SELECT/INSERT/DELETE their own rows
- [ ] **9.3.2** Add heart/favourite toggle to specialist cards
  - Only shown for authenticated users (not guests)
  - Tap → INSERT/DELETE from `favourites` table
  - Filled heart = favourited, outline = not
- [ ] **9.3.3** Sort specialist carousel to show favourites first
  - Query: `select specialists.*, (favourites.id is not null) as is_favourite from specialists left join favourites on ... order by is_favourite desc, display_order`
  - Only applies when client is authenticated

---

## Week 10 — SMS Reminders, No-Show Tracking, Revenue Dashboard

### 10.1 SMS Reminders (Twilio)

**Status:** `[ ]` Not started
**Dependencies:** Phase 2 email notifications (7.3)
**Blockers:** Twilio account, phone number purchased for sending

- [ ] **10.1.1** Set up Twilio account and purchase a sending number
  - Configure for Ireland (+353) and UK (+44) as primary regions
  - Store `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` as Supabase Edge Function secrets
- [ ] **10.1.2** Create Supabase Edge Function: `supabase/functions/send-sms/index.ts`
  - Generic SMS sender: receives `to`, `body`
  - Calls Twilio REST API to send SMS
  - Logs send status
- [ ] **10.1.3** Create booking confirmation SMS
  - Triggered in `stripe-webhook` after successful booking (alongside email if available)
  - Content: "Booking confirmed: [Service] with [Specialist] at [Shop] on [Date] at [Time]. To cancel: [link]"
  - Only sent if `client_phone` is present
- [ ] **10.1.4** Create reminder SMS — 24 hours before appointment
  - pg_cron job runs hourly: query bookings where `starts_at` between `now() + 23h` and `now() + 24h` and `status = 'confirmed'` and `reminder_sent = false`
  - Call `send-sms` Edge Function for each
  - Add `reminder_sent boolean default false` column to `bookings` table (new migration)
  - Content: "Reminder: [Service] with [Specialist] tomorrow at [Time] at [Shop]. Need to change? [link]"
- [ ] **10.1.5** Create reminder SMS — 1 hour before appointment
  - Same pattern as 24h reminder, different time window
  - Add `reminder_1h_sent boolean default false` column
  - Content: "Your appointment with [Specialist] at [Shop] is in 1 hour. See you soon!"
- [ ] **10.1.6** Add SMS opt-out mechanism
  - "STOP" reply handling via Twilio webhook → set a flag on client profile
  - Respect opt-out in all send-sms calls
  - Required for regulatory compliance

### 10.2 No-Show Tracking

**Status:** `[ ]` Not started
**Dependencies:** Phase 1 bookings schema, Phase 2 admin today view (4.2.3)
**Blockers:** None

- [ ] **10.2.1** Add no-show counter to client profile
  - Computed field: `count(*) from bookings where client_id = $1 and status = 'no_show'`
  - Displayed in admin booking detail view: "This client has X no-shows"
- [ ] **10.2.2** Auto-mark no-shows via pg_cron
  - Job runs every 30 minutes: UPDATE bookings SET `status = 'no_show'` WHERE `status = 'confirmed'` AND `ends_at < now() - interval '30 minutes'`
  - Only applies if not manually marked complete or no-show by staff
  - Add `auto_no_show boolean default false` to distinguish auto vs manual
- [ ] **10.2.3** No-show warning in booking flow (future enhancement — flag only for now)
  - If client has 3+ no-shows: show subtle warning to admin in today view
  - Phase 4: configurable policy (block booking after N no-shows, require deposit)

### 10.3 Revenue Dashboard (Admin)

**Status:** `[ ]` Not started
**Dependencies:** Phase 2 admin layout (5.1.1)
**Blockers:** None

- [ ] **10.3.1** Create `app/(admin)/dashboard/revenue/page.tsx` or add revenue tab to dashboard
  - Time period selector: Today, This Week, This Month, Last Month, Custom Range
- [ ] **10.3.2** Key metrics cards:
  - Total revenue (sum of `price_cents` where `payment_status = 'paid'` in period)
  - Total bookings (count in period)
  - Average booking value (revenue / bookings)
  - Cancellation rate (cancelled / total in period)
  - No-show rate (no_show / total in period)
- [ ] **10.3.3** Revenue by specialist breakdown
  - Table: specialist name, booking count, revenue, average value
  - Sorted by revenue descending
- [ ] **10.3.4** Revenue by service breakdown
  - Table: service name, booking count, revenue, average duration
- [ ] **10.3.5** Simple revenue trend chart
  - Daily revenue bar chart for selected period
  - Use a lightweight chart library (recharts if React, or Chart.js via CDN)
  - No complex analytics — keep it to one clear chart
- [ ] **10.3.6** All queries use Supabase aggregate RPCs or views
  - Create Postgres views for common aggregations to keep client queries simple
  - Example: `create view revenue_daily as select tenant_id, starts_at::date as day, sum(price_cents) as revenue, count(*) as bookings from bookings where payment_status = 'paid' group by tenant_id, starts_at::date`

---

## Phase 3 Summary

| Week | Key Deliverables | Task Count |
|------|-----------------|------------|
| 8 | Self-service registration, slug validation, onboarding wizard, sharing tools | 11 |
| 9 | Client booking history, rebooking shortcuts, favourites | 10 |
| 10 | SMS reminders (Twilio), no-show tracking, revenue dashboard | 17 |
| **Total** | | **38** |
