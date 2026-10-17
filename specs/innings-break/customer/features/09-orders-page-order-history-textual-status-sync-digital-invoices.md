> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.9 Orders Page: Order History, Textual Status Sync & Digital Invoices

* **US-12**: As a Team Manager, I want a dedicated Orders Page to view all my active and historical orders, monitor textual fulfillment updates synchronized with the Console, access digital invoices, and manage match actions.
  * **Requirement (Dedicated Orders Page / History View)**:
    - Easily accessible via the primary bottom navigation bar (**"Orders"** tab).
    - Chronologically lists all match orders with distinct tabs: **"Active Orders"** (Upcoming match days) and **"Past Matches"** (Completed / Cancelled history).
  * **Requirement (Order Card Visual Anatomy)**:
    - Each Order Card displays:
      - **Order ID & Booking Timestamp**
      - **Match Date & Daytime Slot Badge** (`⏰ 6:30 AM`, `⏰ 10:30 AM`, `⏰ 2:30 PM`)
      - **Ground Venue & Specific Pitch/Facility** (e.g., *Marina Cricket Arena — Ground #1 Turf*)
      - **Itemized Recipe Summary**: Quantities, bundle names, and assigned player name tags.
      - **Paid Amount (₹)** with UPI Reference ID.
      - **Dual Delivery Contacts**: Primary Manager + Secondary On-Field Teammate phone numbers.
  * **Requirement (Textual Status Updates Synchronized with Console)**:
    - Displays clean, intent-based **Textual Delivery & Fulfillment Status** reflecting real-time progress updated by the Business Owner or Operations Manager in the Console:
      1. `🟢 Confirmed (UPI Paid)` — Pre-order locked for match day.
      2. `🔵 Accepted by Kitchen Hub` — Kitchen hub acknowledged batch prep.
      3. `🟡 Preparing in Kitchen` — Morning batch cooking & packaging active.
      4. `🟣 In Transit` — Dispatched with courier (displays Courier Partner, Driver Phone, 3rd-Party Tracking ID, and ETA).
      5. `🟢 Delivered` — Food safely dropped off at the pavilion/gate.
      6. `🔴 Cancelled (Rainout / Refunded)` — Match called off and soft credits deposited.
    - Status syncs via lightweight background polling (15–30s interval) and a prominent **"Refresh Status"** action. *(Note: Pure textual confirmation reflecting staff updates, without unnecessary heavy GPS map tracking).*
  * **Requirement (Itemized Digital Invoice Modal & WhatsApp Share)**:
    - Each order card provides a **"View Invoice"** button opening an itemized digital receipt with print support and 1-click **"Share to WhatsApp"** for pasting squad refreshment distribution into the team group.
