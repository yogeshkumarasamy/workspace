> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.6 Order Queue, Kitchen Batch Prep & Fulfillment

* **US-16**: As an Operations Manager or Business Owner, I want a day-specific, multi-column visual order pipeline (Kanban board) with integrated match time slots and distinct status columns, so that I have clear visual distinction across all fulfillment stages (Unaccepted/Confirmed, Accepted, Preparing, In Transit, Delivered) and observe immediate card transitions upon updating order states.
  * **Requirement (Day-Specific Operational Scope)**:
    - Pre-orders are organized and displayed on a strict **per-day basis** (for active weekend days or configured weekday holidays).
    - Top toolbar provides the **Match Date Switcher** (`Today`, `Tomorrow`, `Saturday, 26 Sep [12 Orders]`, `Sunday, 27 Sep [8 Orders]`, `Active Holiday`, or custom calendar date) with order count badges.
    - Selecting a date immediately pivots all columns, prep summaries, and slot queues to that specific operating day.
  * **Requirement (Visually Distinct Stage Columns)**:
    - Dedicated, color-coded visual columns for every stage in the order fulfillment lifecycle:
      1. **`1. New Orders / Not Accepted (Confirmed UPI Paid)`** — Highlighted with an amber/orange attention badge, high-priority unaccepted counter, and prominent **"Accept Order"** action.
      2. **`2. Accepted`** — Blue/Cyan accented column for acknowledged pre-orders queued for match-day preparation.
      3. **`3. Preparing`** — Yellow/Purple accented column for active morning batch cooking and packaging in the kitchen.
      4. **`4. In Transit`** — Indigo accented column for orders dispatched with couriers, displaying live ETA and 3rd-party booking reference.
      5. **`5. Delivered / Completed`** — Green accented column for concluded match deliveries (with auto-complete indicator).
      *(Dedicated tab / collapsible view for `Cancelled / Rainout` exception orders).*
  * **Requirement (Integrated Match Time Slot Grouping & Filtering)**:
    - Within the day-specific board, orders across all columns are integrated with the 3 standardized daytime match slots:
      - **`6:30 AM Slot`** (Early Morning Match)
      - **`10:30 AM Slot`** (Midday Match)
      - **`2:30 PM Slot`** (Afternoon Match)
    - Each order card displays a prominent **Match Time Slot Badge** (e.g., `⏰ 6:30 AM Slot`, `⏰ 10:30 AM Slot`, `⏰ 2:30 PM Slot`).
    - Staff can switch between **"All Slots View"** (displaying all daytime slots across the columns) and **Single Slot Filter Tabs** (`6:30 AM`, `10:30 AM`, `2:30 PM`) for slot-specific kitchen batches and dispatch focus.
  * **Requirement (Real-Time Visual State Transitions & Live Synchronization)**:
    - When staff triggers a state progression (e.g., clicking **"Accept Order"**, **"Start Prep"**, **"Dispatch Courier"**, or **"Mark Delivered"**), the order card smoothly transitions in real-time to the corresponding column with immediate status synchronization to the customer app.
    - **Live Kanban Synchronization Engine**: Console board operates with short-interval background polling (15–30s interval) and provides a prominent manual **"Refresh Board"** action button to guarantee real-time board updates with minimal network overhead on mobile and desktop PWAs.
  * **Requirement (Hierarchy of Operations)**:
    ```
    Active Kitchen Hub ──► Match Date (Active Operating Days / Holidays) ──► Match Slot (6:30 AM / 10:30 AM / 2:30 PM) ──► Fulfillment Columns
    ```
  * **Requirement**: Targeted exclusively for **Leather Ball Cricket Matches** (both `Turf Wicket` and `Matting Wicket` grounds) for MVP.
  * **Requirement (Order Card Visual Anatomy)**:
    - Each Order Card under a date, column, and slot displays:
      - **Match Time Slot Badge** & **Fulfillment Status Pill**
      - **Team Name**
      - **Primary Contact**: Team Manager Name & Mobile Number (with direct WhatsApp / Call action)
      - **Secondary On-Field Contact**: Alternate Contact Name & Mobile Number (designated teammate/player for delivery handoff when the manager is batting/fielding)
      - **Ground & Venue Location**: Venue Name, Specific Pitch/Ground, Address, and Delivery Entrance Gate / Pavilion Drop-off notes
      - **Complete Item & Squad Quantity Breakdown**
      - **Order Total (₹)** and Verified UPI Transaction Reference
      - **Current Fulfillment Status** & Third-Party Delivery Tracking (Booking ID, Driver details)
      - **Contextual Action Button** (*Accept Order*, *Start Prep*, *Dispatch Courier*, *Mark Delivered*, *View Invoice*)

* **US-17**: As an Operations Manager or Business Owner, I want an Aggregated Kitchen Prep Sheet for any selected match date and time slot scoped to my Kitchen Hub, so that kitchen staff can execute batch cooking, procurement, and bottling efficiently for Saturday, Sunday, or upcoming match days.
  * **Requirement**: Consolidated view summing total units required per item across all grounds for the chosen date and match time slot (e.g., *"Saturday 26 Sep — 6:30 AM Slot Summary: 66x Watermelon Juices, 33x Porridges, 22x Boiled Egg Packs across 5 grounds"*).
  * **Requirement (Inclusive Batch Prep Aggregation Rule)**: **All Confirmed (UPI Paid) orders are automatically included in the Aggregated Kitchen Prep Sheet**, regardless of whether staff has clicked "Accept Order", ensuring bulk ingredient procurement and kitchen batch cooking are never under-counted.
  * **Requirement (One-Click Batch Prep Sheet Print / Export View)**:
    - Dedicated **"Print / Export Batch Sheet"** button in the Prep Sheet toolbar.
    - Opens a high-contrast, clean printable modal formatted specifically for physical preparation counters (Item Name, Total Squad Units, Ground-by-Ground Pack Quantities, Kitchen Prep Notes, and timestamp).
    - Supports native browser print (`window.print()`) with print-optimized CSS and one-click **"Copy to Clipboard"** for sharing to kitchen WhatsApp groups.
  * **Requirement (Advance Weekend Planning)**: Staff can switch to Sunday on Friday evening to assess weekend bulk ingredient procurement needs (e.g., total eggs, coconut water crates, fruits needed across the entire weekend).

* **US-18**: As an Operations Manager or Business Owner, I want to manage orders across a granular 5-stage fulfillment lifecycle, so that real-time order states and auto-completion are handled reliably.
  * **Requirement**: Fulfillment state progression:
    1. `Confirmed (UPI Paid)`: Initial verified state upon team pre-order placement.
    2. `Accepted`: Business Owner or Operations Manager clicks **"Accept Order"**, immediately triggering an order accepted notification to the customer app.
    3. `Preparing`: Flipped by staff the morning of the match as kitchen prep begins.
    4. `In Transit`: Dispatched to delivery courier with mandatory Booking ID.
    5. `Completed / Delivered`: Manually marked complete by staff once the match slot concludes.
  * **Requirement (Auto-Completion Rule)**: If an order in `In Transit` is not manually marked `Completed` by staff, the system automatically flips the status to `Completed` after 24 hours (1 day).
  * **Requirement**: Support for `Cancelled / Refunded` exception state with cancellation rationale (e.g., match rainout / severe weather).

* **US-19**: As a Business Owner or Operations Manager, I want to view, print, and share the itemized Invoice Copy for any placed order, so that I can audit billing, tax, squad items, and UPI payment references against accounting records.
  * **Requirement (Printable & Shareable Invoice Receipt Modal)**:
    - Dedicated **"View Invoice"** action on each order card.
    - Opens a formatted, printable invoice receipt modal displaying:
      - **Header**: Innings Break Logo, Invoice Number / Order ID, Match Date & Daytime Slot, and Placement Timestamp.
      - **Customer & Destination Details**: Team Name, Team Manager Name & Mobile, Venue Name, Specific Pitch, and Gate Delivery Notes.
      - **Itemized Squad Breakdown**: Item Name, Unit Quantity, Unit Price (₹), and Line Total (₹).
      - **Billing Summary**: Subtotal (₹), GST Tax Breakdown (if applicable), Applied Team Soft Credit Deduction (if any), and Final Paid Amount (₹).
      - **Payment Verification**: UPI Transaction Reference ID and Payment Gateway timestamp.
    - Provides **"Print Receipt"** action (print-friendly stylesheet) and **"Copy Summary"** action for customer support inquiries.
