# Phase 4 — Scale Task Tracker (Backlog)

**Goal:** Platform maturity features for retention, monetisation, and operational depth.
**Timeline:** Post-launch, prioritised by user demand and business impact.
**Deliverable:** Features that differentiate ClipBook from commodity booking tools.
**Prerequisites:** Phase 3 complete (self-service onboarding, SMS, revenue dashboard).

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Complete |
| `[!]`  | Blocked |

---

## 4.1 Multi-Location Per Tenant

**Status:** `[ ]` Not started
**Dependencies:** Entire Phase 1–3 stack
**Blockers:** Requires schema changes — `locations` table, FK from specialists/slots/bookings to location
**Priority:** High — salons with 2+ branches are a common growth case

- [ ] **4.1.1** Design `locations` table
  - Columns: `id`, `tenant_id`, `name`, `address`, `timezone`, `settings` (jsonb for location-specific branding)
  - Each specialist belongs to one or more locations (join table `specialist_locations` or nullable FK)
  - Each slot inherits location from its specialist
- [ ] **4.1.2** Add location selector to client booking flow
  - If tenant has 1 location: skip selector (current behaviour)
  - If tenant has 2+ locations: show location picker as first step before specialist selection
  - URL structure: `<slug>.clipbook.io/location/<location-slug>/book`
- [ ] **4.1.3** Update admin dashboard for multi-location
  - Location switcher in admin sidebar
  - Location CRUD page (name, address, timezone)
  - Specialist assignment to locations
- [ ] **4.1.4** Update all queries to filter by location where applicable
  - Specialists, slots, bookings all scoped to location when location is selected
- [ ] **4.1.5** Update revenue dashboard to support per-location breakdown
- [ ] **4.1.6** Migrate existing tenants: create a default location per tenant, backfill all specialists to it

---

## 4.2 Waitlist for Fully Booked Slots

**Status:** `[ ]` Not started
**Dependencies:** Phase 1 booking flow, Phase 3 SMS (10.1)
**Blockers:** None
**Priority:** Medium — reduces lost bookings when popular specialists are full

- [ ] **4.2.1** Create `waitlist_entries` table
  - Columns: `id`, `tenant_id`, `specialist_id`, `service_id`, `client_id` (nullable), `client_name`, `client_phone`, `preferred_date`, `preferred_time_range` (jsonb: `{ from: "09:00", to: "17:00" }`), `status` (waiting/notified/booked/expired), `created_at`
- [ ] **4.2.2** Add "Join Waitlist" button on fully-booked calendar days
  - Shows when specialist has zero available start times for selected date
  - Collect: client name, phone, preferred time range
- [ ] **4.2.3** Create notification trigger on booking cancellation
  - When a booking is cancelled and slots become available:
  - Query `waitlist_entries` matching specialist + date + time range
  - Send SMS/push: "A slot just opened with [Specialist] on [Date] at [Time]. Book now: [link]"
  - Set `status = 'notified'`, give 15-minute priority window
- [ ] **4.2.4** Expire waitlist entries after the preferred date passes
  - pg_cron job: UPDATE status = 'expired' WHERE preferred_date < current_date AND status = 'waiting'
- [ ] **4.2.5** Show waitlist count to admin per specialist per day
  - Helps admin understand demand for capacity planning

---

## 4.3 Loyalty / Rewards System

**Status:** `[ ]` Not started
**Dependencies:** Phase 3 client accounts (9.1)
**Blockers:** None
**Priority:** Medium — retention driver, common feature request in beauty/barber industry

- [ ] **4.3.1** Design loyalty schema
  - `loyalty_programs` table: `id`, `tenant_id`, `type` (stamp_card / points), `config` (jsonb: stamps_needed, reward_description, points_per_euro), `is_active`
  - `loyalty_cards` table: `id`, `program_id`, `client_id`, `current_stamps` or `current_points`, `created_at`
  - `loyalty_transactions` table: `id`, `card_id`, `booking_id`, `type` (earn/redeem), `amount`, `created_at`
- [ ] **4.3.2** Implement stamp card variant (simplest, most common in barbers)
  - Config: "Every 10th haircut free" → after 9 stamps, next booking is free
  - Auto-stamp on booking completion (`bookings.status = 'completed'`)
  - Admin can manually add/remove stamps
- [ ] **4.3.3** Show loyalty progress to client
  - On tenant landing page (authenticated): "4/10 stamps — 6 more for a free cut!"
  - In booking history: stamp indicator per booking
- [ ] **4.3.4** Apply reward at checkout
  - When client has enough stamps: "Redeem free [service]?" option in booking flow
  - Creates booking with `price_cents = 0`, marks loyalty card as redeemed
  - Skip Stripe Checkout for zero-amount bookings
- [ ] **4.3.5** Admin loyalty dashboard
  - Active loyalty programs, client participation rate, rewards redeemed

---

## 4.4 Google Business Profile Integration (Reserve with Google)

**Status:** `[ ]` Not started
**Dependencies:** Phase 3 self-service registration (8.2)
**Blockers:** Google Reserve with Google partner application (requires approval process)
**Priority:** High — significant discovery channel for local businesses

- [ ] **4.4.1** Research and apply for Reserve with Google / Google Maps booking integration
  - Requires becoming a scheduling partner via Google's Reserve program
  - Application process can take weeks — start early
- [ ] **4.4.2** Implement Reserve with Google API feed
  - Provide availability feed per merchant (tenant) in required format
  - Handle booking creation from Google's API → create booking in ClipBook
  - Handle booking updates/cancellations bidirectionally
- [ ] **4.4.3** Map ClipBook data to Google's merchant/service/availability schema
  - Tenant → Merchant
  - Specialist + Service → Service
  - Available slot ranges → Availability slots
- [ ] **4.4.4** Add "Bookable on Google" badge to admin dashboard once connected
- [ ] **4.4.5** Track bookings sourced from Google vs direct for analytics

---

## 4.5 Calendar Sync

**Status:** `[ ]` Not started
**Dependencies:** Phase 1 bookings
**Blockers:** None
**Priority:** Medium — quality-of-life for both clients and specialists

- [ ] **4.5.1** Generate `.ics` file download for individual bookings
  - Add "Add to Calendar" button on booking confirmation page
  - Generate iCalendar file with: event title ("[Service] at [Shop]"), start/end time, location (shop address), description (specialist name, cancellation link)
  - Universal: works with Google Calendar, Apple Calendar, Outlook
- [ ] **4.5.2** Generate `.ics` subscription feed per specialist (admin/staff)
  - URL: `<slug>.clipbook.io/api/calendar/<specialist-id>.ics` (with auth token)
  - Full iCalendar feed of all future bookings for that specialist
  - Specialist subscribes in their personal calendar app → bookings sync automatically
  - Polling-based: calendar apps re-fetch every 15–60 min
- [ ] **4.5.3** Google Calendar two-way sync for specialists (advanced)
  - OAuth flow: specialist connects their Google Calendar
  - Push ClipBook bookings → Google Calendar events
  - Read Google Calendar busy times → block corresponding ClipBook slots as unavailable
  - Prevents double-booking when specialist has personal appointments
  - Uses Google Calendar API push notifications for near-real-time sync

---

## 4.6 Deposit & Cancellation Fee Policies

**Status:** `[ ]` Not started
**Dependencies:** Phase 2 cancellation flow (7.1), Stripe integration
**Blockers:** None
**Priority:** High — most requested feature by salon owners to combat no-shows

- [ ] **4.6.1** Add cancellation policy config to tenant settings
  - Options: "Free cancellation" (default), "Free cancellation up to X hours before", "Non-refundable deposit"
  - Store in `tenants.settings.cancellation_policy` as JSON
- [ ] **4.6.2** Implement deposit collection at booking time
  - Config: deposit amount (fixed or percentage of service price)
  - Modify Stripe Checkout to charge deposit amount, not full price
  - Remaining balance collected at appointment (via POS or second Checkout)
- [ ] **4.6.3** Implement cancellation fee logic
  - Within free cancellation window: full refund of deposit
  - Outside window: deposit retained (no refund issued)
  - Admin override: can force refund regardless of policy
- [ ] **4.6.4** Display cancellation policy to client during booking
  - Show clearly before "Confirm & Pay": "Free cancellation up to 24 hours before. After that, your €10 deposit is non-refundable."
  - Policy must be visible — no hidden terms
- [ ] **4.6.5** Update cancel booking flow to respect policy
  - Check cancellation window → auto-determine refund amount
  - Show client: "Cancelling now — you will be refunded €X" or "Cancelling now — your deposit of €X will not be refunded"

---

## 4.7 Staff Commission Tracking

**Status:** `[ ]` Not started
**Dependencies:** Phase 3 revenue dashboard (10.3)
**Blockers:** None
**Priority:** Low — useful for larger salons with employed stylists

- [ ] **4.7.1** Add commission config per specialist
  - Columns on `specialists` or separate `commission_rules` table
  - Types: percentage of service price, flat rate per booking, tiered (percentage changes at revenue thresholds)
- [ ] **4.7.2** Calculate commissions on completed bookings
  - Triggered on `bookings.status = 'completed'`
  - Store calculated commission in `booking_commissions` table: `booking_id`, `specialist_id`, `commission_cents`, `rule_applied`
- [ ] **4.7.3** Commission report in admin dashboard
  - Per specialist: total bookings, total revenue, total commission, net to shop
  - Filterable by date range
  - Export to CSV for payroll integration
- [ ] **4.7.4** Specialist self-service view (if given access)
  - Read-only view of own bookings + earned commissions
  - Accessible from POS app or dedicated specialist login on web

---

## Phase 4 Summary

| Feature | Task Count | Priority | Estimated Effort |
|---------|-----------|----------|-----------------|
| Multi-location | 6 | High | 1–2 weeks |
| Waitlist | 5 | Medium | 3–5 days |
| Loyalty / Rewards | 5 | Medium | 1 week |
| Reserve with Google | 5 | High | 2–3 weeks (incl. approval wait) |
| Calendar sync | 3 | Medium | 3–5 days |
| Deposit & cancellation policies | 5 | High | 1 week |
| Staff commission tracking | 4 | Low | 3–5 days |
| **Total** | **33** | | |

---

## Prioritisation Recommendation

Based on business impact and user demand signals from Phase 1–3 pilots:

1. **Deposit & cancellation policies** — Ship first. No-shows are the #1 pain point for salon owners. This directly reduces churn.
2. **Multi-location** — Ship second if any pilot tenant has multiple branches. Otherwise defer.
3. **Reserve with Google** — Start the partner application immediately (long lead time). Build the integration once approved.
4. **Calendar sync (.ics download)** — Quick win, ship alongside deposits. The Google Calendar two-way sync is a separate, larger effort.
5. **Waitlist** — Ship when a tenant reports "my popular stylists are always fully booked."
6. **Loyalty** — Ship when retention metrics suggest clients aren't returning enough.
7. **Staff commissions** — Ship only when explicitly requested by a multi-stylist salon.
