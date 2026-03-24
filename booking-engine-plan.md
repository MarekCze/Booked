# ClipBook — Booking Engine for Barbers, Hair & Beauty Salons

## High-Level Architecture & Implementation Plan

---

## 1. Vision & Constraints

**Product:** A minimalist, multi-tenant booking engine where each shop (barber, hair salon, beauty salon) is a tenant. Clients browse specialists via swipeable profile cards, book time slots, and pay — either online or in-person via NFC tap-to-pay on a registered device.

**Guiding principles:**

- Fastest path to a working product that can take real bookings
- Supabase as the entire backend (auth, DB, realtime, edge functions) — no custom server
- Stripe for all payments (Checkout for online, Terminal SDK for in-person NFC)
- One Next.js app serves all tenants via subdomain routing (`joes-barbers.clipbook.io`)
- React Native app is scoped to ONE job: NFC tap-to-pay via Stripe Terminal SDK
- Postgres Row-Level Security (RLS) is the tenancy boundary — no application-level tenant filtering

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  Client Web   │   │  Admin Web   │   │  POS App (RN)    │    │
│  │  (Next.js)    │   │  (Next.js)   │   │  Stripe Terminal │    │
│  │              │   │              │   │  NFC Payments     │    │
│  │  Book / Pay   │   │  Manage shop │   │                  │    │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘    │
│         │                  │                     │              │
└─────────┼──────────────────┼─────────────────────┼──────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                   │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │    Auth     │  │  Postgres  │  │  Realtime   │  │   Edge    │ │
│  │            │  │  + RLS     │  │  (slots)    │  │ Functions │ │
│  │ Phone OTP  │  │            │  │             │  │           │ │
│  │ Social     │  │  Tenancy   │  │  Live avail │  │ Stripe    │ │
│  │ Anonymous  │  │  via RLS   │  │  updates    │  │ webhooks  │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       STRIPE                                    │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │   Connect     │   │   Checkout   │   │    Terminal      │    │
│  │  (per tenant) │   │  (online pay)│   │   (NFC in-app)   │    │
│  └──────────────┘   └──────────────┘   └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

- **Single Next.js app, multi-tenant via subdomain middleware.** `joes-barbers.clipbook.io` resolves the tenant from the subdomain at the edge. No per-tenant deployments.
- **Supabase RLS as the tenancy boundary.** Every table has a `tenant_id` column. RLS policies ensure queries are scoped. The app never filters by tenant in application code.
- **Stripe Connect (Standard).** Each shop onboards via Stripe Connect. Platform takes a percentage. Checkout Sessions for online prepayment; Terminal for walk-in NFC.
- **Supabase Realtime for live slot availability.** When a slot is booked, other clients viewing that specialist's calendar see it disappear in real time.
- **Guest booking via Supabase anonymous auth.** No forced sign-up. Guests get an anonymous session. They can optionally link to phone/social later.

---

## 3. Data Model (Postgres)

The schema is intentionally flat. No deep hierarchies. Six core tables do 90% of the work.

```sql
-- Tenants (shops)
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- subdomain: joes-barbers
  name          text not null,
  timezone      text not null default 'Europe/Dublin',
  currency      text not null default 'EUR',
  stripe_account_id text,                      -- Stripe Connect account
  settings      jsonb default '{}',            -- opening hours, branding, etc.
  created_at    timestamptz default now()
);

-- Specialists (barbers / stylists / beauticians)
create table specialists (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid references tenants(id) not null,
  name                    text not null,
  bio                     text,
  photo_url               text,
  display_order           int default 0,
  is_active               boolean default true,
  slots_generated_through date,    -- JIT watermark: slots exist up to this date
  created_at              timestamptz default now()
);

-- Services offered by each specialist
create table services (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id),  -- null = offered by all
  name          text not null,                     -- "Skin Fade", "Balayage"
  duration_min  int not null,                      -- 30, 60, 90
  price_cents   int not null,
  is_active     boolean default true
);

-- Availability slots (discrete chunks, e.g. 15-min granularity)
-- One row = one atomic time chunk. A 90-min service claims 6 contiguous slots.
create table slots (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id) not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        text not null default 'available',  -- available | held | booked
  booking_id    uuid,                               -- set when claimed by a booking
  held_until    timestamptz,                        -- soft lock expiry
  created_at    timestamptz default now(),
  unique(specialist_id, starts_at)
);

-- Bookings (one booking claims N contiguous slots)
create table bookings (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id) not null,
  service_id    uuid references services(id) not null,
  starts_at     timestamptz not null,              -- denormalized: first slot's starts_at
  ends_at       timestamptz not null,              -- denormalized: last slot's ends_at
  slot_count    int not null,                      -- how many slots this booking spans
  client_id     uuid references auth.users(id),    -- null for pure guest
  client_name   text,                               -- captured even for guests
  client_phone  text,
  status        text not null default 'confirmed',  -- confirmed | completed | cancelled | no_show
  payment_status text default 'unpaid',             -- unpaid | paid | refunded
  stripe_payment_intent_id text,
  price_cents   int not null,
  notes         text,
  created_at    timestamptz default now()
);

-- Foreign key from slots back to bookings (deferred to allow atomic insert)
alter table slots
  add constraint fk_slots_booking
  foreign key (booking_id) references bookings(id) on delete set null;

-- Index for fast "find N contiguous available slots" queries
create index idx_slots_availability
  on slots (specialist_id, starts_at)
  where status = 'available';

-- Schedule templates (weekly recurring availability)
create table schedule_templates (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id) not null,
  day_of_week   int not null,                        -- 0=Mon, 6=Sun
  start_time    time not null,                       -- 09:00
  end_time      time not null,                       -- 17:00
  break_start   time,                                -- 13:00
  break_end     time                                 -- 13:30
);
-- Slot granularity (default 15 min) is stored in tenants.settings.
-- All slots for a tenant use the same granularity. Services consume
-- ceil(duration_min / granularity) contiguous slots.
```

**RLS policy pattern (applied to every table):**

```sql
-- Example: specialists table
alter table specialists enable row level security;

-- Public read for client-facing queries (scoped by tenant)
create policy "Public can view active specialists"
  on specialists for select
  using (is_active = true);

-- Tenant admin write
create policy "Tenant admins can manage specialists"
  on specialists for all
  using (tenant_id = (select tenant_id from tenant_members where user_id = auth.uid()))
  with check (tenant_id = (select tenant_id from tenant_members where user_id = auth.uid()));
```

**Slot generation — JIT (Just-In-Time), not nightly batch:**

Slots are NOT pre-generated for all tenants on a cron. Instead, a Postgres function `ensure_slots_exist(specialist_id, date_range)` is called lazily when a client views a specialist's calendar. It checks whether slots exist for the requested date range, and only generates missing ones from `schedule_templates`. A `slots_generated_through` column on `specialists` tracks how far ahead slots have been materialized, so the function is a no-op on repeat views. This scales to thousands of tenants because work is only done for active bookings, not idle shops.

**Multi-slot bookings (the duration problem):**

Slots are generated at a fixed granularity (default 15 minutes). A 30-min "Skin Fade" claims 2 slots. A 90-min "Full Colour & Cut" claims 6 contiguous slots. The booking flow computes `slots_needed = ceil(service.duration_min / slot_granularity)` and uses a Postgres function to atomically find and hold N contiguous available slots. The booking row stores denormalized `starts_at` / `ends_at` / `slot_count`, while each claimed slot row gets `booking_id` set and `status = 'booked'`. Cancelling a booking sets all its slots back to `available` in one UPDATE.

---

## 4. Booking Flow (Client Web)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Landing  │───▶│  Pick    │───▶│  Pick    │───▶│  Pick    │───▶│ Confirm  │
│  Page     │    │Specialist│    │  Service │    │  Slot    │    │ & Pay    │
│           │    │          │    │          │    │          │    │          │
│  Tenant   │    │ Scroll / │    │ Duration │    │ Calendar │    │ Details  │
│  branding │    │  cards   │    │ + price  │    │ realtime │    │ Checkout │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Step-by-step:**

1. **Client arrives at `joes-barbers.clipbook.io`** — Next.js middleware resolves `slug → tenant_id`, sets it in a cookie/header. Page renders with tenant branding from `tenants.settings`.

2. **Pick a specialist** — A horizontally scrollable grid of profile cards. Each card shows photo, name, short specialty tags, and a "next available" time hint. Tap to select. On mobile, cards are full-width and horizontally swipeable (carousel), but NOT a stacked Tinder-style mechanic — users can see and compare multiple specialists at a glance. If a shop has 2–3 people, this renders as a simple row. If 8+, it scrolls naturally. Data from `specialists` where `tenant_id` matches and `is_active = true`, ordered by `display_order`.

3. **Pick a service** — Filtered by `specialist_id` (or global services where `specialist_id IS NULL`). Simple list with name, duration, price.

4. **Pick a time slot** — A minimal calendar view (7-day strip at top, time slots below). The query calls `ensure_slots_exist()` for the selected date range, then fetches available start times where enough contiguous slots exist for the chosen service duration. For example, a 60-min service only shows start times where 4 consecutive 15-min slots are free. Subscribe to Supabase Realtime on the slots table — availability updates live as others book.

5. **Confirm & pay** — Client enters name + phone (or logs in via phone OTP / social). A Postgres RPC function `hold_slots(specialist_id, starts_at, slot_count)` atomically marks N contiguous slots as `held` with a 5-minute `held_until` TTL, using `FOR UPDATE SKIP LOCKED` inside a single fast transaction (critical for PgBouncer compatibility — no multi-roundtrip transactions). If any slot in the range is unavailable, the function returns an error and no slots are held. On success, a Supabase Edge Function creates a Stripe Checkout Session. On successful payment, webhook fires → Edge Function creates booking row, updates all held slots to `booked` with the `booking_id`.

**Guest flow:** Supabase `signInAnonymously()` gives a session. Booking is created with `client_id = anonymous_user_id` + captured name/phone. If they later sign in with phone OTP, Supabase `linkIdentity()` merges the anonymous user. Their booking history carries over.

---

## 5. Admin Dashboard

Lives at `app.clipbook.io/dashboard` (or the same Next.js app under a `/admin` route group protected by RLS + role check).

**MVP admin features (Phase 1):**

- **Today view** — List of today's bookings, ordered by time, grouped by specialist. Tap to mark complete / no-show.
- **Specialist management** — CRUD specialists: name, photo upload (Supabase Storage), bio, display order.
- **Service management** — CRUD services with name, duration, price, specialist assignment.
- **Schedule templates** — Set weekly recurring hours per specialist. Slot generation runs automatically.
- **Stripe onboarding** — Button that initiates Stripe Connect Standard onboarding. Status indicator.

**Deferred (Phase 2):** Revenue analytics, cancellation policies, deposit requirements, SMS reminders (Twilio), multi-location support.

---

## 6. React Native POS App (Stripe Terminal NFC)

**Scope is deliberately narrow:** This app does ONE thing — allows a registered device in the shop to take NFC tap-to-pay payments against a booking.

```
┌─────────────────────────────────────────────────────┐
│  React Native App                                   │
│                                                     │
│  ┌───────────┐    ┌───────────┐    ┌─────────────┐  │
│  │  Login     │───▶│  Today's  │───▶│  Collect    │  │
│  │  (staff)   │    │  Bookings │    │  Payment    │  │
│  │            │    │           │    │             │  │
│  │  Supabase  │    │  Pull via │    │  Stripe     │  │
│  │  Auth      │    │  Supabase │    │  Terminal   │  │
│  │            │    │           │    │  NFC tap    │  │
│  └───────────┘    └───────────┘    └─────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Implementation details:**

- **`@stripe/stripe-terminal-react-native`** — Official SDK. Handles NFC reader discovery (built-in on supported Android/iOS devices via Tap to Pay).
- **Stripe Terminal with Tap to Pay on iPhone / Android** — No external hardware needed. The shop's own phone/tablet acts as the payment terminal.
- **Connection token** — A Supabase Edge Function acts as the connection token provider (`POST /functions/v1/stripe-terminal-token`). It creates a connection token scoped to the tenant's Stripe Connect account.
- **Payment flow:**
  1. Staff opens app, sees today's bookings (from Supabase query).
  2. Taps a booking → "Collect Payment" button.
  3. App calls `collectPaymentMethod()` → customer taps their card/phone.
  4. App calls `confirmPaymentIntent()` → payment captured.
  5. Webhook updates `bookings.payment_status = 'paid'`.

**What the RN app does NOT do:** It doesn't manage bookings, specialists, services, or schedules. That's all the web admin dashboard.

---

## 7. Stripe Integration Map

```
Stripe Connect (Standard)
├── Platform: clipbook.io
│   └── Takes application_fee_percent on each payment
│
├── Connected Account: Joe's Barbers (tenant A)
│   ├── Checkout Session (online booking prepayment)
│   │   └── payment_intent with transfer_data.destination
│   └── Terminal Payment (walk-in NFC)
│       └── payment_intent created server-side, collected via Terminal SDK
│
└── Connected Account: Salon Belle (tenant B)
    └── ...same pattern
```

**Why Standard for Phase 1, with Express as escape hatch:**

Stripe Connect Standard is the fastest to implement — you redirect the shop owner to Stripe's hosted onboarding, and they get their own full Stripe dashboard. The tradeoff is friction: barbers have to create a full Stripe account, verify identity, and manage their own dashboard. For Phase 1 with a handful of pilot shops you'll be hand-holding anyway, this is fine. Monitor the onboarding completion rate. If it drops below ~70%, migrate to Connect Express in Phase 2 — Express keeps onboarding inside your UI (embedded components) and is much less intimidating, while still offloading PCI and payouts to Stripe.

**Webhook handling (single endpoint):**

- `checkout.session.completed` → update slot status, create/confirm booking
- `payment_intent.succeeded` → update `bookings.payment_status`
- `payment_intent.payment_failed` → release held slot
- `account.updated` → update tenant's Stripe onboarding status

---

## 8. Authentication Strategy

| User type       | Method                          | Supabase mechanism          |
|-----------------|---------------------------------|-----------------------------|
| Walk-in guest   | No auth needed for browsing     | Anonymous auth on booking   |
| Booking client  | Phone OTP (primary)             | `signInWithOtp({ phone })`  |
| Returning client| Phone OTP or social (Google)    | `signInWithOAuth`           |
| Guest → member  | Link identity after booking     | `linkIdentity()`            |
| Shop staff      | Email + password                | Standard Supabase auth      |
| Shop admin      | Email + password + role         | Custom claims via `tenant_members` |

**`tenant_members` table for role-based access:**

```sql
create table tenant_members (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  user_id   uuid references auth.users(id) not null,
  role      text not null default 'staff',  -- admin | staff
  unique(tenant_id, user_id)
);
```

---

## 9. Tech Stack Summary

| Layer              | Technology                        | Rationale                           |
|--------------------|-----------------------------------|-------------------------------------|
| Client web         | Next.js 14+ (App Router)          | SSR for SEO, RSC for speed          |
| Styling            | Tailwind CSS                      | Fast iteration, consistent design   |
| Swipe cards        | Framer Motion                     | Scroll carousel + tap-to-select    |
| Calendar UI        | Custom minimal (no heavy lib)     | 7-day strip + time grid, contiguous-slot-aware |
| Auth               | Supabase Auth                     | Phone OTP, social, anonymous built in |
| Database           | Supabase Postgres + RLS           | Multi-tenancy with zero app-level filtering |
| Realtime           | Supabase Realtime                 | Live slot availability              |
| File storage       | Supabase Storage                  | Specialist photos, tenant logos     |
| Serverless logic   | Supabase Edge Functions (Deno)    | Stripe webhooks, slot generation, token provider |
| Online payments    | Stripe Checkout + Connect         | Hosted checkout = less PCI scope    |
| In-person payments | Stripe Terminal (Tap to Pay)      | No extra hardware                   |
| POS app            | React Native (Expo)               | Single codebase, Stripe Terminal SDK |
| Hosting            | Vercel                            | Zero-config Next.js deployment      |
| Scheduling         | pg_cron (Supabase extension)      | Nightly slot generation             |

---

## 10. Phased Delivery Plan

### Phase 1 — Core MVP (Weeks 1–4)

**Goal: A single tenant can take bookings online and get paid.**

- Week 1: Supabase project setup, schema + RLS, seed data, tenant resolution middleware in Next.js.
- Week 2: Specialist scroll cards, service picker, slot calendar with contiguous-slot-aware availability + Realtime subscription.
- Week 3: Booking confirmation flow, Stripe Connect onboarding, Checkout Session integration, webhook handler.
- Week 4: Phone OTP auth, guest/anonymous booking, admin "today view", deploy to Vercel + custom domain.

**Deliverable:** One live shop taking real bookings and payments.

### Phase 2 — Admin & POS (Weeks 5–7)

**Goal: Shop owner can self-manage. Walk-ins can pay by NFC.**

- Week 5: Admin dashboard — specialist CRUD, service CRUD, schedule template editor, photo uploads.
- Week 6: React Native app — Stripe Terminal integration, Tap to Pay, today's bookings list, collect payment flow.
- Week 7: Polish, edge cases (cancellation, rebooking, held-slot expiry cleanup via pg_cron), basic email/SMS confirmation.

**Deliverable:** Self-service admin + in-shop NFC payments working.

### Phase 3 — Growth (Weeks 8–10)

**Goal: Multi-tenant onboarding, discoverability, retention.**

- Week 8: Self-service tenant registration flow (sign up → pick slug → Stripe onboarding → go live).
- Week 9: Client booking history, rebooking ("book again" shortcut), favorite specialists.
- Week 10: SMS reminders (Twilio), no-show tracking, basic revenue dashboard for shop owners.

### Phase 4 — Scale (Backlog)

- Multi-location per tenant
- Waitlist for fully booked slots
- Loyalty / rewards system
- Google Business Profile integration (reserve with Google)
- Calendar sync (Google Calendar, Apple Calendar .ics export)
- Deposit / cancellation fee policies
- Staff commission tracking

---

## 11. Key Implementation Notes

**Contiguous slot hold — single Postgres RPC, not multi-roundtrip:**

The entire hold operation is a single `SELECT ... FOR UPDATE SKIP LOCKED` inside a Postgres function called via Supabase RPC. This is critical because Supabase Edge Functions connect through PgBouncer (transaction-mode pooling), which doesn't support holding transactions open across multiple statements. The function receives `(specialist_id, starts_at, slot_count)`, locks exactly N contiguous available slots, sets `status = 'held'` and `held_until = now() + interval '5 minutes'`, and returns success/failure. A pg_cron job runs every minute to release expired holds.

```sql
-- Core of the hold_slots RPC function
create or replace function hold_slots(
  p_specialist_id uuid,
  p_starts_at     timestamptz,
  p_slot_count    int
) returns uuid[] as $$
declare
  v_slot_ids uuid[];
begin
  select array_agg(id order by starts_at) into v_slot_ids
  from (
    select id, starts_at
    from slots
    where specialist_id = p_specialist_id
      and starts_at >= p_starts_at
      and status = 'available'
    order by starts_at
    limit p_slot_count
    for update skip locked
  ) s;

  -- Verify we got exactly N and they're contiguous
  if array_length(v_slot_ids, 1) is distinct from p_slot_count then
    raise exception 'Not enough contiguous slots available';
  end if;

  update slots
  set status = 'held', held_until = now() + interval '5 minutes'
  where id = any(v_slot_ids);

  return v_slot_ids;
end;
$$ language plpgsql;
```

**JIT slot generation — lazy, not batch:**

The `ensure_slots_exist()` Postgres function checks `specialists.slots_generated_through` and only inserts new slot rows for dates beyond that watermark. Called automatically when the calendar component fetches availability. For a shop that nobody visits, zero work is done. For an active shop, slots are generated on first view of each new week. A lightweight pg_cron job can optionally pre-generate for tenants with bookings in the last 7 days, but it's not required.

**Subdomain routing:** Next.js middleware reads `request.headers.get('host')`, extracts the subdomain, queries `tenants` by slug, and injects `tenant_id` into a request header or cookie. All downstream data fetching uses this. For local dev, use `joes-barbers.localhost:3000` (works natively in Chrome).

**Specialist selection UX:** Use `framer-motion` for the horizontal scroll carousel with snap points (CSS `scroll-snap-type: x mandatory`). Each card has photo, name, tags, and "next available" badge. Tap selects. On desktop, cards render as a grid. On mobile, they're a swipeable carousel. This is deliberately NOT a stacked card deck — users need to scan and compare, not discover sequentially.

**Calendar simplicity:** Don't use FullCalendar or a heavy scheduling lib. Build a 7-day horizontal date picker (scrollable pills) and a vertical time-slot list below. The slot list is filtered to show only start times where `slot_count` contiguous slots are available (a SQL window function handles this). Available = tappable. Booked = greyed. Held = shows countdown. ~250 lines of React + Tailwind.

**Stripe Terminal registration:** Each device (phone running the RN app) is registered as a Terminal reader via the API. The shop admin pairs it once. The connection token Edge Function returns tokens scoped to that tenant's Stripe Connect account using `Stripe-Account` header.

---

## 12. Repository Structure

```
clipbook/
├── apps/
│   ├── web/                     # Next.js app (client + admin)
│   │   ├── app/
│   │   │   ├── (client)/        # Route group: booking UI
│   │   │   │   ├── page.tsx     # Landing → specialist cards
│   │   │   │   ├── book/
│   │   │   │   │   └── page.tsx # Service → slot → confirm
│   │   │   ├── (admin)/         # Route group: dashboard
│   │   │   │   ├── dashboard/
│   │   │   │   ├── specialists/
│   │   │   │   ├── services/
│   │   │   │   └── schedule/
│   │   │   └── layout.tsx
│   │   ├── middleware.ts         # Subdomain → tenant resolution
│   │   └── lib/
│   │       ├── supabase/
│   │       │   ├── client.ts
│   │       │   ├── server.ts
│   │       │   └── types.ts     # Generated from Supabase CLI
│   │       └── stripe.ts
│   │
│   └── pos/                     # React Native (Expo) POS app
│       ├── app/
│       │   ├── login.tsx
│       │   ├── bookings.tsx
│       │   └── collect.tsx
│       └── lib/
│           ├── supabase.ts
│           └── terminal.ts      # Stripe Terminal setup
│
├── supabase/
│   ├── migrations/              # SQL migrations (schema above)
│   ├── functions/
│   │   ├── stripe-webhook/      # Handles all Stripe events
│   │   ├── stripe-terminal-token/ # Connection token for RN app
│   │   └── create-checkout/     # Creates Stripe Checkout Session
│   └── seed.sql                 # Demo tenant + data
│
├── packages/
│   └── shared/                  # Shared types, constants
│       └── types.ts
│
├── turbo.json                   # Turborepo config
└── package.json
```

**Monorepo with Turborepo** — keeps web, pos, supabase functions, and shared types in one repo with independent builds.

---

## 13. Risk Register

| Risk | Mitigation |
|------|-----------|
| Stripe Terminal Tap to Pay limited device support | Check Stripe's supported device list early. Fallback: Stripe Reader M2 (Bluetooth) |
| Supabase Realtime at scale (many concurrent viewers) | Realtime channels per specialist, not per tenant. Degrade to polling if needed |
| Phone OTP costs at scale | Supabase includes free tier OTP. Monitor usage. Add rate limiting early |
| Slot double-booking race condition | `FOR UPDATE SKIP LOCKED` inside a single Postgres RPC function — no multi-roundtrip transactions through PgBouncer |
| Contiguous slot fragmentation | Released holds may leave gaps. Calendar query uses window functions to only show valid start times |
| Tenant slug squatting | Slug validation + reserved word list. Manual review for early tenants |
| Anonymous user accumulation | pg_cron cleanup of anonymous users with no bookings after 30 days |
| Stripe Connect Standard onboarding friction | Phase 1: Standard (fastest to build). Monitor drop-off rate. Phase 2: evaluate migrating to Express if conversion suffers. Express keeps barbers in your UI for onboarding but still offloads PCI/payouts |
| JIT slot generation latency on first view | `ensure_slots_exist()` generates ~14 days of 15-min slots per specialist in <100ms. Optional pg_cron pre-warm for active tenants |

---

*This plan is designed so that a solo developer (or a pair) can ship Phase 1 in 4 weeks. The architecture doesn't need to change to go from 1 tenant to 1,000 — RLS and Stripe Connect handle the multi-tenancy scaling. The React Native app is deliberately minimal so it doesn't become a second product to maintain.*
