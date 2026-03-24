# Phase 2: Admin & POS (Weeks 5–7) Task Tracker

**Goal:** Shop owner can self-manage. Walk-ins can pay by NFC.

---

### Week 5: Admin Dashboard

**Status:** Not Started

*   **Specialist Management (CRUD)**
    *   [ ] **Task:** Create the UI for listing, creating, updating, and deleting specialists.
        *   **Status:** To Do
    *   [ ] **Task:** Implement the form for creating and editing specialist details (name, bio, order).
        *   **Status:** To Do
    *   [ ] **Task:** Implement photo upload functionality using Supabase Storage.
        *   **Status:** To Do
*   **Service Management (CRUD)**
    *   [ ] **Task:** Create the UI for listing, creating, updating, and deleting services.
        *   **Status:** To Do
    *   [ ] **Task:** Implement the form for creating and editing service details (name, duration, price).
        *   **Status:** To Do
*   **Schedule Template Editor**
    *   [ ] **Task:** Create the UI for editing weekly recurring schedules for each specialist.
        *   **Status:** To Do
    *   [ ] **Task:** Implement a form to set start/end times and break times for each day of the week.
        *   **Status:** To Do

---

### Week 6: React Native POS App

**Status:** Not Started

*   **React Native App Setup**
    *   [ ] **Task:** Initialize a new React Native project using Expo.
        *   **Status:** To Do
    *   [ ] **Task:** Set up basic navigation (e.g., login screen, bookings screen).
        *   **Status:** To Do
*   **Stripe Terminal & Tap to Pay**
    *   [ ] **Task:** Install and configure the `@stripe/stripe-terminal-react-native` SDK.
        *   **Status:** To Do
    *   [ ] **Task:** Create a Supabase Edge Function to provide connection tokens to the app.
        *   **Status:** To Do
    *   [ ] **Task:** Implement NFC reader discovery and connection.
        *   **Status:** To Do
*   **Bookings & Payment Flow**
    *   [ ] **Task:** Implement staff login using Supabase email/password auth.
        *   **Status:** To Do
    *   [ ] **Task:** Fetch and display a list of today's bookings.
        *   **Status:** To Do
    *   [ ] **Task:** Implement the "Collect Payment" button and flow.
        *   **Status:** To Do
    *   [ ] **Sub-Task:** Call `collectPaymentMethod()` from the Stripe SDK to initiate the NFC tap.
        *   **Status:** To Do
    *   [ ] **Sub-Task:** Call `confirmPaymentIntent()` to capture the payment after a successful tap.
        *   **Status:** To Do

---

### Week 7: Polish & Edge Cases

**Status:** Not Started

*   **Booking Management Edge Cases**
    *   [ ] **Task:** Implement the logic for booking cancellations (releasing slots).
        *   **Status:** To Do
    *   [ ] **Task:** Implement a rebooking flow for clients.
        *   **Status:** To Do
    *   [ ] **Task:** Create a `pg_cron` job to periodically clean up expired 'held' slots from the database.
        *   **Status:** To Do
*   **Client Confirmations**
    *   [ ] **Task:** Set up basic email confirmations for new bookings (e.g., using Supabase's built-in email functionality or a third-party service).
        *   **Status:** To Do
    *   [ ] **Task:** (Optional) Investigate and set up basic SMS confirmations for new bookings.
        *   **Status:** To Do
