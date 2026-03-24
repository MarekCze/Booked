# Phase 4: Scale (Backlog) Task Tracker

**Goal:** Address scaling challenges and implement advanced features from the backlog. The tasks here are not tied to specific weeks and can be prioritized as needed.

---

### Feature: Multi-Location Support

**Status:** Not Started

*   [ ] **Task:** Analyze and update the database schema to support multiple locations per tenant.
    *   **Sub-Task:** Decide whether to add a `locations` table or embed locations in the `tenants` table.
    *   **Sub-Task:** Update foreign keys in `specialists`, `bookings`, etc., to reference a location.
*   [ ] **Task:** Update the UI to allow tenants to manage multiple locations.
*   [ ] **Task:** Update the client booking flow to allow selecting a location first.

---

### Feature: Waitlist for Booked Slots

**Status:** Not Started

*   [ ] **Task:** Design the data model for a waitlist (`waitlist_entries` table).
*   [ ] **Task:** Create a UI for clients to join a waitlist for a specific specialist and time.
*   [ ] **Task:** Implement the notification logic to alert clients on the waitlist when a slot becomes available.

---

### Feature: Loyalty & Rewards System

**Status:** Not Started

*   [ ] **Task:** Design a points or rewards system (e.g., "10th haircut is free").
*   [ ] **Task:** Update the schema to track client points or rewards status.
*   [ ] **Task:** Integrate the rewards logic into the booking and payment flow.

---

### Feature: Google Business Profile Integration

**Status:** Not Started

*   [ ] **Task:** Research and integrate with Google's "Reserve with Google" API.
*   [ ] **Task:** Allow bookings to be made directly from a tenant's Google Business Profile.
*   [ ] **Task:** Implement two-way sync to keep availability consistent.

---

### Feature: Calendar Sync (.ics Export)

**Status:** Not Started

*   [ ] **Task:** Implement a feature for clients to export their booking as an `.ics` file.
*   [- ] **Task:** (Advanced) Investigate two-way calendar sync with Google Calendar or Apple Calendar for clients or staff.

---

### Feature: Deposit & Cancellation Fee Policies

**Status:** Not Started

*   [ ] **Task:** Allow tenants to configure deposit requirements for services.
*   [ ] **Task:** Implement logic to charge a deposit via Stripe during booking.
*   [ ] **Task:** Allow tenants to define cancellation policies (e.g., charge a fee if cancelled within 24 hours).
*   [ ] **Task:** Implement the logic to enforce cancellation fees.

---

### Feature: Staff Commission Tracking

**Status:** Not Started

*   [ ] **Task:** Design the data model for tracking staff commissions on services.
*   [ ] **Task:** Create a report in the admin dashboard for tenants to view staff commission earnings.
