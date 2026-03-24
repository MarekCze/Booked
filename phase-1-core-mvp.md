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
- [x] **1.1.2** Install and configure Tailwind CSS in `apps/web`
- [x] **1.1.3** Install Supabase client libraries (`@supabase/supabase-js`, `@supabase/ssr`)
- [x] **1.1.4** Install Supabase CLI locally and link to project
- [x] **1.1.5** Create `packages/shared/types.ts` with TypeScript type stubs

### 1.2 Database Schema & Migrations

**Status:** `[x]` Complete
**Dependencies:** 1.1.4
**Blockers:** None

- [x] **1.2.1** Migration: `tenants` table
- [x] **1.2.2** Migration: `specialists` table
- [x] **1.2.3** Migration: `services` table
- [x] **1.2.4** Migration: `slots` table
- [x] **1.2.5** Migration: `bookings` table
- [x] **1.2.6** Migration: `schedule_templates` table
- [x] **1.2.7** Migration: `tenant_members` table
- [x] **1.2.8** All migrations applied to Supabase project via MCP
- [x] **1.2.9** TypeScript types match schema

### 1.3 Row-Level Security Policies

**Status:** `[x]` Complete
**Dependencies:** 1.2.8
**Blockers:** None

- [x] **1.3.1** Enable RLS on all tables
- [x] **1.3.2** `tenants` — public SELECT, admin UPDATE
- [x] **1.3.3** `specialists` — public SELECT (active), admin ALL
- [x] **1.3.4** `services` — public SELECT (active), admin ALL
- [x] **1.3.5** `slots` — public SELECT, admin ALL, RPC-handled updates
- [x] **1.3.6** `bookings` — authenticated SELECT own, admin SELECT/UPDATE
- [x] **1.3.7** `schedule_templates` — admin ALL
- [x] **1.3.8** `tenant_members` — admin ALL, staff SELECT
- [x] **1.3.9** Fixed infinite recursion: created `is_tenant_admin()` / `is_tenant_member()` security definer helper functions

### 1.4 Postgres RPC Functions

**Status:** `[x]` Complete
**Dependencies:** 1.2.8
**Blockers:** None

- [x] **1.4.1** `ensure_slots_exist(p_specialist_id, p_from, p_to)` — JIT slot generation
- [x] **1.4.2** `hold_slots(p_specialist_id, p_starts_at, p_slot_count)` — atomic hold with FOR UPDATE SKIP LOCKED
- [x] **1.4.3** `confirm_booking(...)` — finalise booking from held slots
- [x] **1.4.4** `cancel_booking(p_booking_id)` — cancel and release slots
- [x] **1.4.5** `get_available_start_times(p_specialist_id, p_date, p_slots_needed)` — contiguous slot finder
- [x] **1.4.6** `release_expired_holds()` — cleanup function for pg_cron

### 1.5 Seed Data

**Status:** `[x]` Complete
**Dependencies:** 1.4.6
**Blockers:** None

- [x] **1.5.1** Demo tenant (`demo-barbers`) with branding + website content settings
- [x] **1.5.2** 3 specialists (Mike O'Brien, Sarah Kelly, James Walsh) with portfolio images
- [x] **1.5.3** 6 services (15–120 min, €10–€85)
- [x] **1.5.4** Schedule templates (Mon–Sat, 09:00–17:30, 13:00–13:30 break)
- [x] **1.5.5** 6 sample reviews (mix of specialist-scoped and general)

### 1.6 Subdomain Tenant Resolution Middleware

**Status:** `[x]` Complete
**Dependencies:** 1.1.3, 1.2.1
**Blockers:** None

- [x] **1.6.1** Middleware extracts subdomain, queries tenant by slug, injects headers
- [x] **1.6.2** `lib/tenant.ts` helpers: `getTenant()` / `requireTenant()`
- [x] **1.6.3** Bare domain fallback (marketing page, no crash)
- [x] **1.6.4** Tenant-not-found rewrite to 404 page

---

## Week 2 — Booking UI: Specialists, Services, Calendar

### 2.1 Specialist Scroll Cards

**Status:** `[x]` Complete
**Dependencies:** 1.6.2, 1.3.3
**Blockers:** None

- [x] **2.1.1** Landing page with tenant branding, hero section, "Book Now" CTA
- [x] **2.1.2** `specialist-carousel.tsx` — desktop grid / mobile horizontal scroll with snap
- [x] **2.1.3** Framer Motion entry animations and hover/tap effects
- [x] **2.1.4** "Next available" badge per specialist (today/tomorrow)
- [x] **2.1.5** Single specialist auto-redirect to booking
- [x] **2.1.6** "View Profile" link on each specialist card

### 2.2 Service Picker

**Status:** `[x]` Complete
**Dependencies:** 2.1.2
**Blockers:** None

- [x] **2.2.1** `app/(client)/book/page.tsx` — booking flow page with max-w-3xl container
- [x] **2.2.2** `service-list.tsx` — vertical list with duration/price badges
- [x] **2.2.3** `slots_needed` calculation from service duration / tenant granularity

### 2.3 Appointment Picker (Calendar + Time Slots)

**Status:** `[x]` Complete
**Dependencies:** 2.2.3, 1.4.1, 1.4.5
**Blockers:** None

- [x] **2.3.1** `month-calendar.tsx` — monthly grid (Sun–Sat), prev/next month, selected date dark pill, past dates greyed
- [x] **2.3.2** `appointment-picker.tsx` — side-by-side layout: calendar (2/3 width) + scrollable time slot list (1/3 width)
- [x] **2.3.3** Supabase Realtime subscription on `slots` table (debounced refetch on changes)
- [x] **2.3.4** Selection summary bar: "Your appointment is on [date] at [time]" + Continue button
- [x] **2.3.5** Mobile responsive: calendar stacks above time slots
- [x] **2.3.6** Empty state: "No availability on this date"

### 2.4 Booking Flow Orchestrator

**Status:** `[x]` Complete
**Dependencies:** 2.2, 2.3
**Blockers:** None

- [x] **2.4.1** `booking-flow.tsx` — 3-step state machine (service → datetime → confirm)
- [x] **2.4.2** Step indicator with numbered pills
- [x] **2.4.3** Back navigation with downstream state reset
- [x] **2.4.4** Confirm step: booking summary (specialist, service, date/time, price)

---

## Week 2.5 — Salon Website Template

### 2.5 TenantSettings Extension & Reviews Table

**Status:** `[x]` Complete
**Dependencies:** 1.2.1
**Blockers:** None

- [x] **2.5.1** Extended `TenantSettings` type: homepage, about, gallery, contact, social fields
- [x] **2.5.2** Added `portfolio_images` jsonb column to specialists table
- [x] **2.5.3** Created `reviews` table with RLS (public SELECT approved, admin ALL)
- [x] **2.5.4** Seeded website content, portfolio images, and sample reviews
- [x] **2.5.5** Added `Review` and `PortfolioImage` types to shared package

### 2.6 Navigation & Layout

**Status:** `[x]` Complete
**Dependencies:** 2.5.1
**Blockers:** None

- [x] **2.6.1** `site-nav.tsx` — responsive navbar with hamburger menu, "Book Now" CTA
- [x] **2.6.2** `site-footer.tsx` — social links, copyright, "Powered by ClipBook"
- [x] **2.6.3** Updated `(client)/layout.tsx` with nav + footer

### 2.7 Home Page

**Status:** `[x]` Complete
**Dependencies:** 2.6, 2.1
**Blockers:** None

- [x] **2.7.1** Hero section with gradient/image, title, subtitle, CTA
- [x] **2.7.2** Specialists section (reuses carousel)
- [x] **2.7.3** Services preview (top 6 services with prices)
- [x] **2.7.4** Reviews teaser (latest 3)
- [x] **2.7.5** CTA footer section

### 2.8 Specialist Profile Page

**Status:** `[x]` Complete
**Dependencies:** 2.5
**Blockers:** None

- [x] **2.8.1** `app/(client)/specialists/[id]/page.tsx` — full profile
- [x] **2.8.2** Header with avatar, name, bio, star rating, "Book" CTA
- [x] **2.8.3** Services section (specialist-scoped)
- [x] **2.8.4** Portfolio gallery with lightbox
- [x] **2.8.5** Reviews section (specialist-scoped)

### 2.9 Additional Pages

**Status:** `[x]` Complete
**Dependencies:** 2.5, 2.6
**Blockers:** None

- [x] **2.9.1** `/about` — about text + team section with specialist bios
- [x] **2.9.2** `/gallery` — image grid with lightbox (from `settings.gallery.images`)
- [x] **2.9.3** `/contact` — contact info + opening hours from schedule templates + social links
- [x] **2.9.4** `/reviews` — all approved reviews with average rating

### 2.10 Shared Components

**Status:** `[x]` Complete
**Dependencies:** None
**Blockers:** None

- [x] **2.10.1** `star-rating.tsx` — 1–5 star display
- [x] **2.10.2** `review-card.tsx` — review with stars, author, text, relative date
- [x] **2.10.3** `image-lightbox.tsx` — modal overlay with prev/next/close/keyboard nav

### 2.11 Query & Utility Functions

**Status:** `[x]` Complete
**Dependencies:** 1.1.3
**Blockers:** None

- [x] **2.11.1** `lib/queries.ts` — getSpecialists, getServices, getSpecialist, getNextAvailable, getTenantSettings, getReviews, getAverageRating, getAllServices, getScheduleForDisplay
- [x] **2.11.2** `lib/format.ts` — formatPrice, formatTime, formatDuration, formatDateLabel
- [x] **2.11.3** `lib/tenant-context.ts` — TenantProvider + useTenant() hook
- [x] **2.11.4** `components/providers.tsx` — TenantProvider + Toaster wrapper

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
- [ ] **3.2.3** Create Supabase Edge Function: `supabase/functions/stripe-connect-return/index.ts`
- [ ] **3.2.4** Add environment variables to Supabase: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] **3.2.5** Test onboarding flow end-to-end with Stripe test mode

### 3.3 Stripe Checkout Session

**Status:** `[ ]` Not started
**Dependencies:** 3.1.2, 3.2.5
**Blockers:** Stripe Connect must be working (3.2.5)

- [ ] **3.3.1** Create Supabase Edge Function: `supabase/functions/create-checkout/index.ts`
- [ ] **3.3.2** Redirect client to Stripe Checkout URL after successful hold
- [ ] **3.3.3** Create success page: `app/(client)/book/success/page.tsx`
- [ ] **3.3.4** Create cancel/back page: `app/(client)/book/cancelled/page.tsx`

### 3.4 Stripe Webhook Handler

**Status:** `[ ]` Not started
**Dependencies:** 3.3.1, 1.4.3
**Blockers:** None

- [ ] **3.4.1** Create Supabase Edge Function: `supabase/functions/stripe-webhook/index.ts`
- [ ] **3.4.2** Handle `checkout.session.completed` event
- [ ] **3.4.3** Handle `payment_intent.payment_failed` event
- [ ] **3.4.4** Handle `account.updated` event
- [ ] **3.4.5** Register webhook endpoint in Stripe dashboard
- [ ] **3.4.6** Test full payment flow end-to-end with Stripe test cards

---

## Week 4 — Auth, Guest Booking, Admin Today View, Deployment

### 4.1 Supabase Auth: Phone OTP & Anonymous

**Status:** `[ ]` Not started
**Dependencies:** 1.1.3
**Blockers:** Supabase project must have phone auth provider enabled

- [ ] **4.1.1** Enable phone OTP provider in Supabase dashboard
- [ ] **4.1.2** Create `components/auth-modal.tsx`
- [ ] **4.1.3** Enable anonymous auth in Supabase dashboard
- [ ] **4.1.4** Implement guest booking flow
- [ ] **4.1.5** Implement identity linking (anonymous → phone OTP)
- [ ] **4.1.6** Add Google social login

### 4.2 Admin "Today View"

**Status:** `[ ]` Not started
**Dependencies:** 1.3.6, 1.3.8, 1.2.7
**Blockers:** None

- [ ] **4.2.1** Create `app/(admin)/dashboard/page.tsx`
- [ ] **4.2.2** Create `components/admin/today-bookings.tsx`
- [ ] **4.2.3** Add action buttons: Mark Complete, No Show, Cancel
- [ ] **4.2.4** Add Supabase Realtime subscription on bookings
- [ ] **4.2.5** Add stats bar: total bookings, revenue, next upcoming

### 4.3 Deployment

**Status:** `[ ]` Not started
**Dependencies:** All above tasks
**Blockers:** Domain name registered, DNS access

- [ ] **4.3.1** Deploy Next.js app to Vercel
- [ ] **4.3.2** Configure wildcard subdomain DNS
- [ ] **4.3.3** Configure Supabase production environment
- [ ] **4.3.4** Create first real tenant in production
- [ ] **4.3.5** Smoke test full flow on production
- [ ] **4.3.6** Set up pg_cron job for held-slot expiry cleanup

---

## Phase 1 Summary

| Week | Key Deliverables | Status |
|------|-----------------|--------|
| 1 | Schema, RLS, RPC functions, seed data, middleware | **Complete** |
| 2 | Specialist cards, service picker, appointment picker (monthly calendar + time slots) | **Complete** |
| 2.5 | Full salon website template (home, about, gallery, contact, reviews, specialist profiles) | **Complete** |
| 3 | Slot hold, Stripe Connect, Checkout, webhooks | Not started |
| 4 | Auth (OTP + anonymous + social), admin today view, deploy | Not started |
