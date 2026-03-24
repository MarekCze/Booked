# Phase 1: Core MVP (Weeks 1–4) Task Tracker

**Goal:** A single tenant can take bookings online and get paid.

---

### Week 1: Supabase & Foundation

**Status:** Not Started

*   **Supabase Project Setup**
    *   [ ] **Task:** Create a new Supabase project.
        *   **Status:** To Do
    *   [ ] **Task:** Configure project settings (e.g., region, password).
        *   **Status:** To Do
    *   [ ] **Task:** Store API keys and URLs securely.
        *   **Status:** To Do
*   **Database Schema & RLS**
    *   [ ] **Task:** Implement `tenants` table schema.
        *   **Status:** To Do
    *   [ ] **Task:** Implement `specialists` table schema.
        *   **Status:** To Do
    *   [ ] **Task:** Implement `services` table schema.
        *   **Status:** To Do
    *   [ ] **Task:** Implement `slots` table schema.
        *   **Status:** To Do
    *   [ ] **Task:** Implement `bookings` table schema.
        *   **Status:** To Do
    *   [ ] **Task:** Implement `schedule_templates` table schema.
        *   **Status:** To Do
    *   [ ] **Task:** Implement `tenant_members` table schema.
        *   **Status:** To Do
    *   [ ] **Task:** Apply Row-Level Security (RLS) policies for all tables.
        *   **Status:** To Do
*   **Seed Data**
    *   [ ] **Task:** Create a `seed.sql` file.
        *   **Status:** To Do
    *   [ ] **Task:** Add a demo tenant to the seed data.
        *   **Status:** To Do
    *   [ ] **Task:** Add demo specialists to the seed data.
        *   **Status:** To Do
    *   [ ] **Task:** Add demo services to the seed data.
        *   **Status:** To Do
*   **Next.js Tenant Resolution**
    *   [ ] **Task:** Set up a new Next.js project with the App Router.
        *   **Status:** To Do
    *   [ ] **Task:** Create middleware to resolve tenant from the subdomain.
        *   **Status:** To Do
    *   [ ] **Task:** Store tenant ID in a cookie or header for downstream requests.
        *   **Status:** To Do

---

### Week 2: Client Booking UI

**Status:** Not Started

*   **Specialist Selection**
    *   [ ] **Task:** Create UI for a horizontally scrollable grid of specialist profile cards.
        *   **Status:** To Do
    *   [ ] **Task:** Fetch and display specialist data (photo, name, tags).
        *   **Status:** To Do
    *   [ ] **Task:** Implement swipeable card carousel for mobile view.
        *   **Status:** To Do
*   **Service Selection**
    *   [ ] **Task:** Create UI for the service list.
        *   **Status:** To Do
    *   [ ] **Task:** Filter services based on the selected specialist.
        *   **Status:** To Do
    *   [ ] **Task:** Display service name, duration, and price.
        *   **Status:** To Do
*   **Slot Calendar & Availability**
    *   [ ] **Task:** Create the calendar UI (7-day strip and time slots grid).
        *   **Status:** To Do
    *   [ ] **Task:** Implement the `ensure_slots_exist()` Postgres function for JIT slot generation.
        *   **Status:** To Do
    *   [ ] **Task:** Fetch and display available slots from the database.
        *   **Status:** To Do
    *   [ ] **Task:** Implement logic to only show start times with enough contiguous slots for the selected service.
        *   **Status:** To Do
*   **Real-time Updates**
    *   [ ] **Task:** Subscribe to the `slots` table using Supabase Realtime.
        *   **Status:** To Do
    *   [ ] **Task:** Update the slot availability in the UI in real-time as other users book.
        *   **Status:** To Do

---

### Week 3: Payments & Confirmation

**Status:** Not Started

*   **Booking Confirmation Flow**
    *   [ ] **Task:** Create the UI for the booking confirmation and details entry step.
        *   **Status:** To Do
    *   [ ] **Task:** Implement the `hold_slots()` Postgres RPC function to atomically hold contiguous slots.
        *   **Status:** To Do
    *   [ ] **Task:** Handle success and error cases when attempting to hold slots.
        *   **Status:** To Do
*   **Stripe Connect Onboarding**
    *   [ ] **Task:** Add a button in the (future) admin UI to initiate Stripe Connect Standard onboarding.
        *   **Status:** To Do
    *   [ ] **Task:** Create a UI element to indicate the tenant's Stripe onboarding status.
        *   **Status:** To Do
*   **Stripe Checkout Integration**
    *   [ ] **Task:** Create a Supabase Edge Function to create a Stripe Checkout Session for a booking.
        *   **Status:** To Do
    *   [ ] **Task:** Redirect the user to the Stripe Checkout page on the frontend.
        *   **Status:** To Do
*   **Stripe Webhook Handler**
    *   [ ] **Task:** Create a single Supabase Edge Function to handle all incoming Stripe webhooks.
        *   **Status:** To Do
    *   [ ] **Sub-Task:** Implement logic for `checkout.session.completed` to create the booking.
        *   **Status:** To Do
    *   [ ] **Sub-Task:** Implement logic for `payment_intent.succeeded` to update booking payment status.
        *   **Status:** To Do
    *   [ ] **Sub-Task:** Implement logic for `payment_intent.payment_failed` to release held slots.
        *   **Status:** To Do
    *   [ ] **Sub-Task:** Implement logic for `account.updated` to track tenant onboarding status.
        *   **Status:** To Do

---

### Week 4: Auth, Admin & Deployment

**Status:** Not Started

*   **Client Authentication**
    *   [ ] **Task:** Implement a phone number input field for authentication.
        *   **Status:** To Do
    *   [ ] **Task:** Integrate with Supabase Auth `signInWithOtp`.
        *   **Status:** To Do
*   **Guest & Anonymous Booking**
    *   [ ] **Task:** Implement a form for guest details (name, phone) if the user is not logged in.
        *   **Status:** To Do
    *   [ ] **Task:** Use Supabase anonymous auth to create a temporary session for guests.
        *   **Status:** To Do
    *   [ ] **Task:** Implement the `linkIdentity()` flow to merge an anonymous user's bookings if they sign up later.
        *   **Status:** To Do
*   **Admin "Today View"**
    *   [ ] **Task:** Create the UI for the "Today View" which lists all of today's bookings.
        *   **Status:** To Do
    *   [ ] **Task:** Group the bookings by specialist for clarity.
        *   **Status:** To Do
    *   [ ] **Task:** Implement functionality to mark bookings as 'complete' or 'no-show'.
        *   **Status:** To Do
*   **Deployment**
    *   [ ] **Task:** Deploy the Next.js application to Vercel.
        *   **Status:** To Do
    *   [ ] **Task:** Configure custom domains and environment variables in Vercel.
        *   **Status:** To Do
