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

**Status:** `[x]` Complete
**Dependencies:** None
**Blockers:** None

- [x] **8.1.1** Create marketing landing page for `clipbook.io`
  - Hero section: value prop, "Get your shop online in 5 minutes" CTA
  - Feature highlights: online booking, NFC payments, real-time calendar, team profiles, SMS reminders, revenue dashboard
  - "Sign Up Your Shop" button → registration flow
  - Middleware routes: no subdomain or `www` → marketing layout; subdomain present → tenant client layout
  - **Note:** Implemented as `components/marketing-home.tsx` rendered from `(client)/page.tsx` when no tenant context (avoids Next.js route group conflicts)
- [x] **8.1.2** Create `app/(client)/pricing/page.tsx`
  - Simple pricing: single Starter tier with 5% transaction fee (no monthly charges)
  - Feature checklist with all included features
- [x] **8.1.3** Create `app/(client)/owner-login/page.tsx`
  - For existing shop owners to access their admin dashboard
  - Email + password → authenticate → resolve `tenant_id` from `tenant_members` → redirect to tenant subdomain admin
  - **Note:** Named `owner-login` to avoid route conflict with admin `/login`

### 8.2 Tenant Registration Flow

**Status:** `[x]` Complete
**Dependencies:** 8.1.1, Phase 1 schema
**Blockers:** None

- [x] **8.2.1** Create `app/(client)/register/page.tsx` — multi-step registration
  - Step 1: Owner details — name, email, password → `supabase.auth.signUp()`
  - Step 2: Shop details — shop name, slug (auto-generated from name, editable), timezone, currency
  - Step 3: Stripe Connect onboarding (redirect to Stripe, or skip)
  - Step 4: Success — "Your shop is live at `<slug>.clipbook.io`" + link to admin dashboard + preview link
- [x] **8.2.2** Implement slug validation
  - Real-time uniqueness check as user types (debounced 400ms query against `tenants.slug`)
  - Regex validation: lowercase alphanumeric + hyphens, 3–50 chars, must start/end with alphanumeric
  - Reserved words blocklist: `www`, `app`, `api`, `admin`, `dashboard`, `billing`, `support`, `help`, `status`, `docs`, `mail`, `ftp`, `register`, `login`, `signup`, `signin`
  - Show green "Available!" / red "Already taken." inline
- [x] **8.2.3** Create Supabase Edge Function: `supabase/functions/register-tenant/index.ts`
  - Receives: owner `user_id` (from auth), shop name, slug, timezone, currency
  - INSERT into `tenants` → INSERT into `tenant_members` (role: admin)
  - Returns `tenant_id` and `slug`
  - Validates slug uniqueness inside function (race condition safety via unique constraint)
  - Cleans up tenant if member creation fails
- [x] **8.2.4** After tenant creation, trigger Stripe Connect onboarding (reuses `stripe-connect-onboard` Edge Function)
  - If owner skips Stripe: allowed, proceeds to success step
  - Online payments disabled until Stripe is connected; shop can still take walk-in bookings
- [ ] **8.2.5** Create welcome email template
  - Sent after successful registration
  - Contains: shop URL, admin dashboard link, getting started checklist (add specialists, add services, set schedule)
  - **Deferred:** Requires email provider setup (Resend/SendGrid)

### 8.2b Custom Domain Support

**Status:** `[~]` Partially complete
**Dependencies:** 8.2.1
**Blockers:** None

- [x] **8.2b.1** Add `custom_domain` column to `tenants` table (text, nullable, unique)
- [x] **8.2b.2** Update middleware to resolve tenants by custom domain as fallback
  - If no subdomain match: check `tenants.custom_domain` against full hostname
- [ ] **8.2b.3** Admin setting to configure custom domain
  - Input field in tenant settings, DNS instructions displayed
  - **Deferred:** Requires UI addition to settings form
- [ ] **8.2b.4** Vercel domain configuration per tenant (manual for now, API in Phase 4)
- [ ] **8.2b.5** Pricing tier: subdomain (base fee) vs custom domain (premium)

### 8.3 Onboarding Wizard (First-Run Admin Experience)

**Status:** `[x]` Complete
**Dependencies:** 8.2.3
**Blockers:** None

- [x] **8.3.1** Create `components/admin/onboarding-checklist.tsx`
  - Shown on admin dashboard when shop is newly created (`onboarding_complete` not set in settings)
  - Checklist items with completion state:
    - [x] Add your first specialist
    - [x] Add at least one service
    - [x] Set your schedule
    - [x] Connect Stripe (if not done during registration)
    - [x] Share your booking link
  - Each item links to the relevant admin page
  - Progress bar showing completion percentage
  - Track completion in `tenants.settings.onboarding_complete` — dismiss when all done
- [x] **8.3.2** Add "Share your booking link" component
  - Display `<slug>.clipbook.io` with copy-to-clipboard button
  - QR code placeholder (SVG; install `qrcode` npm package for production)
  - "Share on WhatsApp" quick share link (URL encoded message)
  - "Share on Instagram" link
- [x] **8.3.3** Add "Preview your shop" button
  - Success step in registration opens `<slug>.clipbook.io` in new tab
  - Dashboard link also available from success step

---

## Week 9 — Client Booking History & Retention

### 9.1 Client Account & Booking History

**Status:** `[x]` Complete
**Dependencies:** Phase 1 auth (4.1), RLS (1.3.6)
**Blockers:** None

- [x] **9.1.1** Create `app/(client)/account/page.tsx` — client profile page
  - Accessible from header "My Bookings" link (shown when authenticated, not anonymous)
  - Display: name, phone number, linked login method (provider)
  - "Log Out" button
- [x] **9.1.2** Create `components/booking-history.tsx`
  - Query: bookings with joined specialists, services, tenants where `client_id = auth.uid()` ordered by `starts_at desc`
  - Sections: "Upcoming" (future bookings, status = confirmed) and "Past" (completed, cancelled, no_show)
  - Each row: date/time, specialist, service, status badge (color-coded), price
- [x] **9.1.3** Add actions to upcoming bookings:
  - "Cancel" → calls `cancel_booking` RPC with confirmation dialog
  - "Reschedule" → navigates to booking flow pre-filled with same specialist + service
- [x] **9.1.4** Add cross-tenant booking history
  - A client who books at multiple shops sees all bookings grouped by shop
  - RLS policy: `client_id = auth.uid()` (added in migration, not scoped to tenant)
  - Display tenant name as section header when multiple tenants

### 9.2 "Book Again" Quick Rebooking

**Status:** `[x]` Complete
**Dependencies:** 9.1.2
**Blockers:** None

- [x] **9.2.1** Add "Book Again" button to each past booking in history
  - Pre-fill: specialist_id, service_id, tenant slug
  - Navigate to `<slug>.clipbook.io/book?specialist=<id>&service=<id>`
  - Shown for completed and cancelled bookings
- [x] **9.2.2** Smart rebooking suggestion on tenant landing page
  - `components/welcome-back-card.tsx` — checks if authenticated client has prior bookings at this tenant
  - Show "Welcome back! Book again with [specialist name]?" card above specialist carousel
  - Pre-fills last specialist + last service from their history at this tenant
  - "Browse all" fallback link

### 9.3 Favourite Specialists

**Status:** `[x]` Complete (core features)
**Dependencies:** 9.1.1
**Blockers:** None

- [x] **9.3.1** Create `favourites` table
  - Columns: `id`, `client_id` (FK → auth.users), `specialist_id` (FK → specialists), `created_at`
  - Unique constraint on `(client_id, specialist_id)`
  - RLS: authenticated users can SELECT/INSERT/DELETE their own rows (3 policies)
  - CASCADE delete on both foreign keys
- [x] **9.3.2** Add heart/favourite toggle to specialist cards
  - `components/favourite-button.tsx` — only shown for authenticated users (not guests)
  - Tap → INSERT/DELETE from `favourites` table
  - Filled red heart = favourited, outline gray = not
  - Positioned top-right on specialist card with backdrop blur
- [ ] **9.3.3** Sort specialist carousel to show favourites first
  - Query: `select specialists.*, (favourites.id is not null) as is_favourite from specialists left join favourites on ... order by is_favourite desc, display_order`
  - Only applies when client is authenticated
  - **Deferred:** Requires modifying the server-side specialist query to join with favourites

---

## Week 10 — SMS Reminders, No-Show Tracking, Revenue Dashboard

### 10.1 SMS Reminders (Twilio)

**Status:** `[x]` Complete (code ready, requires Twilio secrets to activate)
**Dependencies:** Phase 2 email notifications (7.3)
**Blockers:** Twilio account, phone number purchased for sending

- [ ] **10.1.1** Set up Twilio account and purchase a sending number
  - Configure for Ireland (+353) and UK (+44) as primary regions
  - Store `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` as Supabase Edge Function secrets
  - **Blocked:** Requires Twilio account setup (operational task, not code)
- [x] **10.1.2** Create Supabase Edge Function: `supabase/functions/send-sms/index.ts`
  - Generic SMS sender: receives `to`, `body`
  - Calls Twilio REST API to send SMS
  - Returns success/failure with Twilio SID
- [x] **10.1.3** Create booking confirmation SMS
  - Triggered in `stripe-webhook` after successful booking (fire and forget)
  - Content: "Booking confirmed: [Service] with [Specialist] at [Shop] on [Date] at [Time]. To manage: [link]"
  - Only sent if `client_phone` is present
- [x] **10.1.4** Create reminder SMS — 24 hours before appointment
  - `supabase/functions/send-reminders/index.ts` handles both 24h and 1h reminders
  - Query: bookings where `starts_at` between `now() + 23h` and `now() + 24h` and `status = 'confirmed'` and `reminder_sent = false`
  - Calls `send-sms` Edge Function for each
  - `reminder_sent boolean default false` column added to `bookings` table
  - Content: "Reminder: [Service] with [Specialist] tomorrow at [Time] at [Shop]. Need to change? [link]"
- [x] **10.1.5** Create reminder SMS — 1 hour before appointment
  - Same function, different time window (50-70 min before)
  - `reminder_1h_sent boolean default false` column added
  - Content: "Your appointment with [Specialist] at [Shop] is in 1 hour. See you soon!"
- [ ] **10.1.6** Add SMS opt-out mechanism
  - "STOP" reply handling via Twilio webhook → set a flag on client profile
  - Respect opt-out in all send-sms calls
  - Required for regulatory compliance
  - **Deferred:** Requires Twilio webhook endpoint + client profile table

### 10.2 No-Show Tracking

**Status:** `[x]` Complete
**Dependencies:** Phase 1 bookings schema, Phase 2 admin today view (4.2.3)
**Blockers:** None

- [x] **10.2.1** Add no-show counter to client profile
  - Computed at render time: `count(*) from bookings where client_id = $1 and status = 'no_show'`
  - Displayed in admin today view as warning badge: "X no-shows" (amber, with warning icon)
  - Only shown when client has 3+ no-shows
- [x] **10.2.2** Auto-mark no-shows via pg_cron
  - `auto_mark_no_shows()` function: UPDATE bookings SET `status = 'no_show'` WHERE `status = 'confirmed'` AND `ends_at < now() - interval '30 minutes'`
  - Sets `auto_no_show = true` to distinguish auto vs manual
  - pg_cron job scheduled every 30 minutes
- [x] **10.2.3** No-show warning in booking flow (flag only for now)
  - If client has 3+ no-shows: show subtle warning badge in admin today view
  - Phase 4: configurable policy (block booking after N no-shows, require deposit)

### 10.3 Revenue Dashboard (Admin)

**Status:** `[x]` Complete
**Dependencies:** Phase 2 admin layout (5.1.1)
**Blockers:** None

- [x] **10.3.1** Create `app/(admin)/dashboard/revenue/page.tsx`
  - Time period selector: Today, This Week, This Month, Last Month
  - Added "Revenue" link to admin sidebar navigation with chart icon
- [x] **10.3.2** Key metrics cards:
  - Total revenue (sum of `price_cents` where `payment_status = 'paid'` in period)
  - Total bookings (count in period)
  - Average booking value (revenue / paid bookings)
  - Cancellation rate (cancelled / total in period)
  - No-show rate (no_show / total in period)
- [x] **10.3.3** Revenue by specialist breakdown
  - Table: specialist name, booking count, revenue, average value
  - Sorted by revenue descending
  - Uses `revenue_by_specialist` Postgres view
- [x] **10.3.4** Revenue by service breakdown
  - Table: service name, duration, booking count, revenue
  - Sorted by revenue descending
  - Uses `revenue_by_service` Postgres view
- [x] **10.3.5** Simple revenue trend chart
  - Daily revenue bar chart for selected period (pure CSS/Tailwind, no external chart library)
  - Hover tooltips showing revenue amount + booking count per day
  - Responsive bar widths
- [x] **10.3.6** All queries use Supabase views
  - `revenue_daily`: tenant_id, day, revenue_cents, booking_count
  - `revenue_by_specialist`: tenant_id, specialist_id, specialist_name, booking_count, revenue_cents, avg_value_cents
  - `revenue_by_service`: tenant_id, service_id, service_name, duration_min, booking_count, revenue_cents

---

## Phase 3 Summary

| Week | Key Deliverables | Task Count | Completed | Deferred |
|------|-----------------|------------|-----------|----------|
| 8 | Self-service registration, slug validation, onboarding wizard, sharing tools | 16 | 12 | 4 |
| 9 | Client booking history, rebooking shortcuts, favourites | 10 | 9 | 1 |
| 10 | SMS reminders (Twilio), no-show tracking, revenue dashboard | 17 | 14 | 3 |
| **Total** | | **43** | **35** | **8** |

### Deferred Items (Phase 4 or follow-up)
- **8.2.5** Welcome email template (requires email provider)
- **8.2b.3–5** Custom domain admin UI, Vercel API integration, pricing tiers
- **9.3.3** Sort specialist carousel by favourites (server query change)
- **10.1.1** Twilio account setup (operational)
- **10.1.6** SMS opt-out mechanism (regulatory compliance)
