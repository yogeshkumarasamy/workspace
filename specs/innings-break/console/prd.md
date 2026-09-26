# PRD: Innings Break Console

> **Status**: Approved  
> **Author**: Product Manager (BMAD)  
> **Date**: 2026-09-22  
> **Scope**: `apps/innings-break-console` (Innings Break Ecosystem)  
> **Target Personas**: `Business Owner` (Super-User) & `Operations Manager` (Console Operations Staff)

---

## 1. Problem Statement

Amateur cricket in Chennai is a weekend-long ritual with dozens of teams competing in 5-to-6 hour match days under severe coastal heat. While **Innings Break** enables **Team Managers** to pre-order bulk refreshments for their squads, the operation requires a unified back-office platform for the **Business Owner** and their deployed **Operations Managers** to:

1. **Manage Chennai's Dynamic Ground Network**: Organize a growing directory of cricket facilities (from multi-pitch complexes to box cricket turfs) with pinpoint GPS coordinates and gate instructions for couriers.
2. **Standardize In-House Sports Nutrition**: Create and curate wholesome, freshly prepared sports nutrition items (juices, cut fruits, boiled eggs, nutritious porridges, energy bites, and team meals) with full nutritional transparency.
3. **Fulfill Match Day Pre-Orders at Scale**: Monitor incoming weekend orders, generate kitchen prep batch sheets, advance order fulfillment statuses, and coordinate on-demand 3rd-party delivery dispatch (Dunzo, Porter) to remote cricket grounds.
4. **Delegate Operations Securely**: Onboard and manage operational staff (**Operations Managers**) with role-based boundaries while keeping administrative controls centralized with the **Business Owner**.

---

## 2. Target Personas

### 2.1 Business Owner (Super-User)
* **Description**: The entrepreneur who owns and oversees the entire Innings Break operation.
* **Goals**: Manage business presences (cities & kitchen hubs), designate the Primary Kitchen Hub and secondary hubs, manage global menu items and dynamic bundles, assign Operations Managers to kitchen hubs, oversee revenue and cross-location orders, and monitor delivery dispatches.
* **Pain Points**: Needs a unified multi-location system that starts with a single primary kitchen today but seamlessly scales to multiple kitchens and managers without schema or workflow rewrites.

### 2.2 Operations Manager (Console Operations Staff)
* **Description**: Operational staff deployed by the Business Owner to run day-to-day kitchen fulfillment and courier dispatches for their assigned Kitchen Hub.
* **Goals**: Operate a location-scoped dashboard (monitoring orders, kitchen batch prep, and courier dispatches strictly for their assigned kitchen), and toggle menu item availability (`In Stock` / `Sold Out`) for their kitchen.
* **Strict Boundary**: Assigned to a specific Kitchen Hub; strictly barred from accessing the **Team Members** management section or business administration controls.

---

## 3. User Stories & Key Requirements

### 3.1 Authentication, Access Control & Staff Onboarding (Whitelisted & Invite-Only)

* **US-01**: As a Business Owner or invited Operations Manager, I want to sign in securely using my pre-authorized mobile number and SMS OTP, so that only verified console personnel can access the application and unauthorized public visitors are strictly blocked.
  * **Requirement (Single Business Owner Bootstrap)**: The system operates with a single Business Owner for MVP whose mobile number is pre-configured/whitelisted during initial setup.
  * **Requirement (Strict Mobile Number Gating & Stranger Lockout)**:
    - Mobile number is the sole unique identifier for console access.
    - Public / uninvited self-registration is strictly disabled.
    - When a user enters their mobile number at the login screen:
      - **Authorized (Business Owner or Invited Operations Manager)**: System dispatches SMS OTP and allows login.
      - **Unauthorized / Stranger**: System halts immediately with an error (*"Access Denied: Your mobile number is not registered or invited. Contact the Business Owner for console access."*), and no OTP is sent.
  * **Requirement**: System routes the verified user to the appropriate Console dashboard upon successful OTP verification (`Business Owner` ➔ Full Console; `Operations Manager` ➔ Kitchen Hub-scoped dashboard).

* **US-02**: As a Business Owner, I want a dedicated Team Members section to invite Operations Managers by their mobile number and assign them to specific Kitchen Hubs, so that staff onboarding is controlled and pre-authorized before they ever access the app.
  * **Requirement**: The Team Members section is visible **exclusively to the Business Owner**.
  * **Requirement**: Business Owner invites a new Operations Manager by entering their **Full Name**, **Mobile Number**, **Email**, and **Assigned Kitchen Hub**.
  * **Requirement (Pre-Authorization & Invite Dispatch)**:
    - Entering the mobile number automatically pre-authorizes and whitelists that number in the backend.
    - Business Owner can share the secure onboarding link via WhatsApp or copy-link.
    - When the Operations Manager opens the link and verifies their mobile number via OTP, their profile is confirmed and automatically bound to their assigned Kitchen Hub.
  * **Requirement**: Displays registered Operations Managers (Name, Mobile, Email, Assigned Kitchen Hub, Date Joined, Status: `Invited` / `Active` / `Suspended`).
  * **Requirement**: Business Owner can re-assign an Operations Manager to a different Kitchen Hub or revoke/suspend access.

* **US-03**: As an Operations Manager, I want my dashboard and navigation to be automatically scoped to my assigned Kitchen Hub and exclude administrative settings, so that I focus entirely on my location's kitchen prep, orders, and delivery logistics.
  * **Requirement**: Navigation excludes Team Members management and business presence configuration.
  * **Requirement**: Order queue, batch prep sheet, and dispatch tabs automatically default and scope to the Operations Manager's assigned Kitchen Hub.

---

### 3.2 Business Presences, Multi-Kitchen Hubs & Delivery Geofencing

* **US-04**: As a Business Owner, I want a dedicated Business Presences tab to configure operating Cities and Kitchen Hubs, so that the platform architecture is structured for scalable multi-kitchen expansion from day one.
  * **Requirement**: Business Presences hierarchy:
    ```
    City (e.g., Chennai)
     └── Kitchen Hubs (e.g., "Chennai Central Kitchen Hub [Primary]", "OMR Cloud Kitchen [Secondary]")
    ```
  * **Requirement**: Kitchen Hub entity fields include:
    - Kitchen Hub Name
    - Operating City (`Chennai` for MVP)
    - Hub Role: `Primary Kitchen` (Exactly 1 active Primary Kitchen in MVP) vs. `Secondary Kitchen`
    - Exact GPS Coordinates (`Latitude`, `Longitude`) & Full Address / Landmark
    - Maximum Delivery Radius in km (e.g., default 10 km)
    - Operating Status: `Active` / `Inactive`
  * **Requirement (MVP Execution)**: MVP launches with 1 Single Primary Kitchen Hub in Chennai, but all data schemas and relationships are multi-kitchen ready.

* **US-05**: As a Business Owner, I want a Location / Kitchen Hub Switcher in the Console, so that I can toggle between specific kitchen dashboards or view consolidated cross-location operations.
  * **Requirement**: Dropdown selector allowing the Business Owner to filter orders, prep sheets, and staff by specific Kitchen Hub.
  * **Requirement (MVP Hub Switcher Behavior)**: In MVP, the switcher displays the single active Primary Hub (`"Chennai Central Kitchen Hub [Primary]"`), while the underlying data schemas and UI switcher component are built ready for seamless multi-kitchen switching in future iterations.

* **US-06**: As a Business Owner, I want the system to enforce Delivery Serviceability Geofencing based on Kitchen Hub coordinates, so that customers can only order for grounds within operational reach.
  * **Requirement (Haversine Geofence Engine)**: System calculates straight-line distance between the active Kitchen Hub decimal GPS coordinates and the destination ground/venue coordinates using the **Haversine formula**:
    - Grounds $\le$ Kitchen Delivery Radius: Marked `Deliverable` in customer app.
    - Grounds $>$ Kitchen Delivery Radius: Marked `Currently Out of Delivery Range` in customer app (ordering disabled).
  * **Requirement (Future Multi-Kitchen Routing Schema)**: In multi-kitchen mode, the system evaluates all active kitchens and routes the order to the closest kitchen hub covering the destination ground.

* **US-07**: As a Business Owner, I want to define the Pre-Order Cutoff Time for the 3 daytime match slots, so that orders close on time for kitchen procurement and batch preparation.
  * **Requirement**: Standardized match time slots in Chennai cricket:
    - **`6:30 AM Slot`** (Morning Match — *In Scope MVP*)
    - **`10:30 AM Slot`** (Midday Match — *In Scope MVP*)
    - **`2:30 PM Slot`** (Afternoon Match — *In Scope MVP*)
    - *`6:00 PM Slot` & `10:00 PM Slot` (Floodlight Evening Matches — Deferred to Future)*
  * **Requirement**: Business Owner configures the pre-order cutoff window (e.g., Friday 8:00 PM for Saturday morning matches, or $X$ hours prior to slot).
  * **Requirement**: Once the cutoff time passes, the customer app locks out new pre-orders for that specific match date and slot.

---

### 3.3 Active Month Calendar View & Operational Schedule Engine

* **US-08**: As a Business Owner, I want full month-level and week-level control over the Active Month Calendar View, and as an Operations Manager, I want to view operational schedules and toggle day-level availability for my Kitchen Hub, so that operational days are visually managed well in advance with clear administrative governance.
  * **Requirement (Interactive Active Month Calendar View)**:
    - 7-column layout (**Monday through Sunday**) rendering the full active month in a responsive calendar grid.
    - Calendar navigation controls: `< Previous Month`, `Current Month`, `Next Month >` available to both `Business Owner` and `Operations Manager`.
    - Day cells display visual status indicators: `🟢 Active Operating Day` (with order count pill if pre-orders exist) vs `⚪ Non-Operational / Closed`.
  * **Requirement (Month-Level Bulk Configuration Controls — Business Owner Exclusive)**:
    - Month header toolbar actions (visible and executable **exclusively by Business Owner**):
      1. **"Apply Month Defaults (All Weekends)"**: Pre-configures all Saturdays and Sundays across the active month with 1 click.
      2. **"Clear Month Schedule"**: Resets unconfirmed future weeks across the month.
  * **Requirement (Week-Level Operation Controls — Business Owner Exclusive)**:
    - Row-level action controls for every Monday-to-Sunday week row (visible and executable **exclusively by Business Owner**):
      1. **"Set Default Weekend (Sat & Sun)"**: Instantly marks Saturday and Sunday as active while keeping weekdays closed.
      2. **"Activate Entire Week"**: Sets all 7 days (Monday–Sunday) as active for continuous tournament operations or multi-day leagues.
      3. **"Deactivate Week"**: Marks all 7 days non-operational for seasonal or maintenance breaks.
  * **Requirement (Day-Level Granular Toggles & Holiday Tagging — Role Scoped)**:
    - Clicking or tapping any individual date cell toggles its operational status between `Active` and `Non-Operational`.
    - `Business Owner`: Toggles day-level status globally across the business.
    - `Operations Manager`: Toggles day-level operating availability specifically for their assigned Kitchen Hub.
    - Allows attaching descriptive event tags or holiday labels (e.g., *"Pongal Holiday Match"*, *"Diwali Special"*, *"Kitchen Maintenance"*).
  * **Requirement (Upcoming Week & Long-Range Advance Planning)**:
    - Staff can navigate to future weeks and months to review and plan operations ahead of time, ensuring long-term match scheduling predictability.

* **US-09**: As a Business Owner or Operations Manager, I want the operational schedule to enforce automated default fallbacks, Sunday post-lunch cutoffs, and strict customer pre-order date gating, so that unconfigured weeks default safely to weekends and Team Managers can only pre-order on verified active operational days.
  * **Requirement (Monday-to-Sunday Business Week Definition)**: The operational business week runs strictly from **Monday (00:00)** through **Sunday (23:59)**.
  * **Requirement (Default Weekend Operating Schedule)**: Every unconfigured upcoming Monday-to-Sunday cycle automatically defaults to **Saturday** and **Sunday** as active business days.
  * **Requirement (Midweek Holiday & Custom Operating Day Activation)**: `Business Owner` (globally) and `Operations Manager` (for their hub) have the option to mark and activate any weekday (`Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`) as an active operating day to support public holidays (e.g., Pongal, Diwali, Republic Day), regional holidays, or special weekday cricket matches.
  * **Requirement (Operational Day Deactivation)**: Staff can toggle off standard weekend days (e.g., for scheduled kitchen deep cleaning, maintenance, or off-season breaks).
  * **Requirement (Advance Scheduling & Sunday Post-Lunch Cutoff)**: Staff can configure and review the upcoming week's operational schedule in advance. The review/configuration cutoff is **Sunday Post-Lunch (2:00 PM / 14:00 IST)** of the preceding week.
  * **Requirement (Automated Default Fallback Engine)**: If no explicit changes or confirmations are submitted by the Sunday 2:00 PM cutoff, the system automatically confirms and locks the default schedule (**Saturday and Sunday**) for the upcoming week with zero operational downtime.
  * **Requirement (Operational Mandate / Thumb Rule)**: Even with automated fallback, it is an operational thumb rule that the Business Owner or Operations Manager actively reviews the Active Month Calendar and marks the days of support for the next week before the cutoff to ensure ingredient procurement and kitchen staffing readiness.
  * **Requirement (Customer App Date Selection Gating)**: The `Innings Break` customer app dynamically restricts match date selection and pre-ordering strictly to the active operating days configured for that week in the Console. Inactive days are greyed out, locked, and disabled for pre-orders.
  * **Requirement (Console Date Switcher Alignment)**: The Console's Match Date Switcher dynamically reflects the active operational days of the week (Saturday, Sunday, and any activated midweek holidays).

---

### 3.4 Areas, Venues & Ground Directory Management

* **US-10**: As a Business Owner, I want a dedicated Areas Management grid with full CRUD capabilities, geolocation coordinates, and optional Google Maps integration, so that I can independently create, view, edit, update, delete, and toggle the active status of delivery and locality areas.
  * **Requirement (Independent Area Creation Form)**:
    - Dedicated **"+ Add Area"** modal / button.
    - Creation form captures strictly:
      1. **Area Name** (*Mandatory* — e.g., *Velachery*, *Mylapore*, *Porur*, *Thoraipakkam*, *OMR*)
      2. **Latitude** (*Mandatory* — Decimal GPS coordinate, e.g. `12.9815`)
      3. **Longitude** (*Mandatory* — Decimal GPS coordinate, e.g. `80.2180`)
      4. **Google Maps Link / URL** (*Optional* — Direct Google Maps pin or place URL for quick verification)
      5. **Initial Status**: Defaults to `Active` (toggleable to `Inactive`).
    - *No unnecessary dependencies or nested mappings required.*
  * **Requirement (Interactive Areas Data Grid & Read View)**:
    - Business Owner views all created Areas in a responsive, searchable, and sortable **Data Grid**.
    - Grid columns display:
      - **Area Name**
      - **Latitude & Longitude** (Decimal GPS coordinates with click-to-copy)
      - **Google Maps Link** (Clickable icon opening Google Maps in a new tab if URL provided)
      - **Status Badge** (`🟢 Active` vs `⚪ Inactive`)
      - **Created & Last Updated Timestamps**
      - **Row Actions**: `Edit`, `Toggle Active/Inactive`, `Delete`.
  * **Requirement (Edit & Update Area)**:
    - Clicking **Edit** opens a pre-populated modal allowing the Business Owner to update Area Name, Latitude, Longitude, and Google Maps URL.
    - Saving changes instantly updates the record and synchronizes across customer locality search services.
  * **Requirement (Area Status Toggle)**:
    - Direct status toggle in each grid row to flip status between `Active` and `Inactive`.
    - `Active`: Area is discoverable and available for backend API spatial proximity lookups and customer ground search.
    - `Inactive`: Area is disabled from locality search, while preserving historical records.
  * **Requirement (Delete Area & Data Integrity Guard)**:
    - Dedicated **Delete** action with a confirmation dialog.
    - **Integrity Guard**: Business Owner is prompted with a confirmation dialog before permanent deletion. Alternatively, the Business Owner can set the Area to `Inactive` to remove it from customer search without deleting records.

* **US-11**: As a Business Owner, I want a dedicated Venue Management CRUD Data Grid with geolocation coordinates, Google Maps URL, media assets (photos and video walkthrough URLs), and venue taxonomy (Standalone vs Multi-Complex), so that I can independently create, view, edit, delete, and toggle venue operations.
  * **Requirement (Independent Venue Creation Form)**:
    - Dedicated **"+ Add Venue"** button / modal (completely independent from Area creation; no forced mapping required).
    - Creation form captures strictly:
      1. **Venue Name** (*Mandatory* — e.g., *Marina Cricket Arena*, *St. Bedes Sports Ground*, *YMCA Nandanam Sports Complex*)
      2. **Venue Type** (*Mandatory*):
         - `Standalone Venue` (single standalone pitch/ground facility)
         - `Multi-Complex Venue` (sports complex housing multiple pitches, grounds, practice nets, or turfs)
      3. **Latitude** (*Mandatory* — Decimal GPS coordinate, e.g. `13.0475`)
      4. **Longitude** (*Mandatory* — Decimal GPS coordinate, e.g. `80.2825`)
      5. **Google Maps Link / URL** (*Optional* — Direct Google Maps pin or place link)
      6. **Media Assets & Meta Details** (*Optional*):
         - **Venue Cover Photo / Photo Gallery** (image uploads)
         - **Video Walkthrough URL** (YouTube / video link for courier and team ground orientation)
         - **Venue Description & Landmark Notes**
      7. **Initial Status**: Defaults to `Active` (toggleable to `Inactive`).
  * **Requirement (Interactive Venue Data Grid & Read View)**:
    - Business Owner views all created Venues in a responsive, searchable, and filterable **Data Grid**.
    - Grid columns display:
      - **Media Thumbnail** (Cover photo thumbnail + video icon if URL exists)
      - **Venue Name**
      - **Venue Type Badge** (`Standalone Venue` vs `Multi-Complex Venue`)
      - **Delivery Serviceability Badge**: Real-time Haversine distance indicator against the active Kitchen Hub (`🟢 Deliverable (7.2 km from Hub)` vs `⚪ Out of Range (14.5 km)`), allowing the Business Owner to instantly verify if a venue is within operational reach.
      - **Latitude & Longitude** (Decimal GPS coordinates with click-to-copy)
      - **Google Maps Link** (Clickable icon opening Google Maps in a new tab if URL provided)
      - **Pitches & Facilities Count** (Count of configured grounds, nets, and turfs)
      - **Status Badge** (`🟢 Active` vs `⚪ Inactive`)
      - **Created & Last Updated Timestamps**
      - **Row Actions**: `View / Manage Grounds`, `Edit Venue`, `Toggle Active/Inactive`, `Delete Venue`.
  * **Requirement (Edit & Update Venue)**:
    - Clicking **Edit** opens a pre-populated modal allowing the Business Owner to update Venue Name, Venue Type, GPS coordinates, Google Maps link, photos, video walkthrough URL, and description.
    - Saving changes immediately synchronizes across ground listings and pre-order catalogs.
  * **Requirement (Venue Status Toggle)**:
    - Direct status toggle on each grid row to flip status between `Active` and `Inactive`.
    - `Active`: Venue is discoverable and available for team match pre-orders.
    - `Inactive`: Venue and all its nested pitches are temporarily hidden from customer discovery while preserving all historical match and order records.
  * **Requirement (Delete Venue & Data Integrity Guard)**:
    - Dedicated **Delete** action with a confirmation dialog.
    - **Integrity Guard**: System blocks deletion if active grounds with unfulfilled or past match orders are mapped to the Venue, requiring the Business Owner to set the Venue to `Inactive` instead. Completely unlinked empty venues can be permanently deleted.

* **US-12**: As a Business Owner, I want to drill down into any created Venue to add, configure, and manage diverse facility types (Leather Ball Grounds with wicket surfaces, Tennis Ball Grounds, and Cricket Practice Nets) with gate delivery notes and pitch coordinates, so that courier dispatchers and squads have exact pitch-level drop-off precision.
  * **Requirement (Venue-to-Ground Drill-Down Flow)**:
    - Clicking on any Venue row in the grid opens the **Venue Facilities & Pitch Management** sub-panel.
    - Dedicated **"+ Add Ground / Facility"** action within the selected Venue.
  * **Requirement (Comprehensive Facility Type Taxonomy — Full Console Cataloging)**:
    - Facility Type selection:
      1. **`Leather Ball Cricket Ground`**
         - **Wicket Surface Taxonomy**: `Leather Turf Wicket` | `Concrete Matting Wicket` | `Astro Turf Wicket` | `Cement Wicket`
      2. **`Tennis Ball Cricket Ground`** (Box cricket turf / tennis ball match ground)
         - **Surface Taxonomy**: `Synthetic Astro Turf` | `Concrete / Rubberized` | `Natural Clay / Sand`
      3. **`Cricket Practice Nets`**
         - **Net Type**: `Turf Practice Net` | `Matting Practice Net` | `Astro Net Cage`
  * **Requirement (MVP Customer Pre-Ordering Scope Enforcement)**:
    - In the Console, the Business Owner has full CRUD management across all three facility types (`Leather Ball`, `Tennis Ball`, `Practice Nets`).
    - In the `Innings Break` customer app, pre-ordering is enabled strictly for **Leather Ball Cricket Grounds** (`Turf Wicket` and `Matting Wicket`). Tennis Ball grounds and Practice Nets are cataloged in the directory with an *"Ordering Disabled for MVP / Leather Ball Matches Only"* status badge.
  * **Requirement (Facility Creation Form Fields)**:
    - Ground / Facility creation captures:
      1. **Ground / Facility Name** (e.g., *Ground #1 (Centre Turf)*, *Ground #2 (South Matting)*, *Practice Net Cage A*, *Box Cricket Turf 1*)
      2. **Facility Category & Surface Taxonomy**
      3. **Delivery Gate & Pavilion Notes** (*Mandatory* — e.g., *"Enter Gate 4 opposite Lighthouse. South pavilion near net 2."*)
      4. **Pitch GPS Coordinates (`Latitude`, `Longitude`)**: Optional specific pitch coordinates. If omitted, automatically inherits the parent Venue's common latitude and longitude.
      5. **Status Toggle**: `Active` / `Inactive` per ground/facility.
  * **Requirement (Facility List & Management Sub-Grid)**:
    - Displays all grounds, nets, and turfs under the parent Venue in a dedicated list with individual status toggles, edit actions, and delete options.

* **US-13**: As a Business Owner, I want full status control across all entities (Areas, Venues, Grounds), so that any facility undergoing maintenance or renovation can be toggled Inactive instantly without deleting historical match orders.

---

### 3.5 Kitchen Menu, Nutrition, Recipes & Dynamic Bundles

* **US-14**: As a Business Owner, I want to create in-house recipe menu items with nutritional facts, and allow kitchen staff to manage availability per Kitchen Hub, so that menu items are centrally standardized while stock is locally controlled.
  * **Requirement**: Menu items created centrally by Business Owner with:
    - Item Name (e.g., *"Cold-Pressed Watermelon Juice"*, *"Boiled Egg Duo with Pepper"*, *"Millet / Ragi Porridge"*, *"Whole-Wheat Sandwich"*)
    - Description & In-House Kitchen Prep Notes
    - Nutritional Profile: Calories (kcal), Protein (g), Carbohydrates (g), Fats (g), Key Minerals/Electrolytes
    - Dietary Tag: `🟢 Veg`, `🔴 Non-Veg`, `🟡 Egg`
    - Category: `Beverages & Hydration`, `Fresh Cut Fruits`, `High Protein Power Snacks`, `Energy Bites`, `Team Meals` (e.g., Porridges, Rice packs)
    - Unit Price (₹ INR)
    - Item Photo (image upload)
  * **Requirement (Kitchen-Level Availability)**: Operations Managers and Business Owner can toggle item availability (`Active / In Stock` vs. `Inactive / Sold Out`) specific to their Kitchen Hub.

* **US-15**: As a Business Owner or Operations Manager, I want to build and publish Dynamic Bundles / Team Packs from available menu items, so that Team Managers can order pre-curated squad combos.
  * **Requirement**: Dynamic Bundle Builder allows selecting any active items, defining item quantities per bundle (e.g., 11x Juices + 11x Porridges + 11x Bananas), setting a bundled package price (₹ INR), uploading a bundle photo, and publishing it directly as an orderable pack.

---

### 3.6 Order Queue, Kitchen Batch Prep & Fulfillment

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

---

### 3.7 Third-Party Delivery Dispatch Coordination

* **US-20**: As an Operations Manager or Business Owner, I want to log mandatory courier booking details when dispatching an individual team order, so that every order is traceable against its delivery partner booking.
  * **Requirement**: Per-team order dispatch model for MVP (individual courier booking per order).
  * **Requirement**: When moving an order to `In Transit`, capture:
    - **Delivery Partner**: `Dunzo` | `Porter` | `Direct Courier` | `Other`
    - **3rd-Party Booking ID / Reference ID** (*Mandatory* — ensures direct audit trail against the courier platform). When `Direct Courier` or in-house delivery is selected, system accepts an internal dispatch reference (e.g., `DIRECT-<TIMESTAMP>` or Driver Contact Number) so validation does not block manual dispatches.
    - Tracking Link / Order Reference URL (optional)
    - Courier Driver Name & Mobile Number (optional)
    - Estimated Time of Arrival (ETA)
  * **Requirement (Future Phase Extension)**: System specification is designed to support **Same-Venue Multi-Order Courier Batching** (combining multiple team orders destined for the same ground complex into a single delivery run to optimize logistics cost).

---

### 3.8 Help, Support & Quality Grievance Management

* **US-21**: As a Business Owner or Operations Manager, I want a dedicated Support & Issues tab in the Console, so that I can investigate and resolve post-delivery quality and service complaints submitted by Team Managers.
  * **Requirement**: Order-specific support requests raised in the customer app appear instantly in the Console's **Support & Issues** tab.
  * **Requirement**: Each Support Ticket displays:
    - **Ticket ID & Timestamp**
    - **Associated Order ID & Match Date/Slot**
    - **Team Name & Team Manager Contact** (Name, Phone Number with Click-to-Call / WhatsApp action)
    - **Ground & Venue Details** (Venue Name, Pitch, Delivery Gate)
    - **Issue Category**: `Food Quality / Spoilage` | `Missing Items` | `Damaged Food / Packaging` | `Delivery Delay` | `Wrong Pavilion / Gate Drop-off` | `Other`
    - **Customer's Description & Notes**
    - **Ticket Status**: `Open` ➔ `In Progress` ➔ `Resolved`
    - **Assigned Kitchen Hub** (scoped to the Operations Manager's kitchen)

* **US-22**: As an Operations Manager or Business Owner, I want to resolve quality grievances by issuing In-App Soft Credits or logging investigation notes, so that customer satisfaction is restored while keeping financial value within the ecosystem.
  * **Requirement**: Staff can manually investigate issues (calling the manager or delivery courier) and execute:
    1. **"Issue In-App Soft Credit"**: Grants a partial credit (e.g., ₹200 for damaged items) directly to the **Team's wallet balance** (associated with the Team entity).
    2. **"Resolve with Notes"**: Closes the ticket with explanatory resolution notes.
  * **Requirement**: Resolving a ticket updates the status and credits immediately in the customer app.

---

### 3.9 In-App Soft Credits & Early Rainout Cancellation Engine

* **US-23**: As a Business Owner or Operations Manager, I want to enforce an automated Match Cancellation Cutoff Window ($\ge 1.5$ hours prior to the match slot time), so that the kitchen is alerted immediately before food preparation begins, completely eliminating wasted ingredients and automatically crediting the Team.
  * **Requirement (Universal 1.5-Hour Automated Cancellation Cutoff)**: Team Managers can initiate an automated Rainout / Match Cancellation in the customer app up to **1.5 hours (90 minutes) before the scheduled match slot**:
    - **`6:30 AM Slot`** ➔ Automated Cancellation Cutoff is **5:00 AM**
    - **`10:30 AM Slot`** ➔ Automated Cancellation Cutoff is **9:00 AM**
    - **`2:30 PM Slot`** ➔ Automated Cancellation Cutoff is **1:00 PM**
  * **Requirement (Automated Halting & Immediate Soft Credit Release)**:
    - Because kitchen preparation begins 1.5 hours before match time, cancellations within the $\ge 1.5\text{h}$ window immediately transition the order to `Cancelled (Rainout)` in real-time, instantly removing it from the active kitchen prep queue.
    - System **automatically and instantly deposits 100% In-App Soft Credit** of the paid order value into the **Team's wallet balance** (associated with the Team entity) with **zero manual intervention or delay**.
    - The cancellation and automated credit issuance are logged in the Console's **Cancelled Orders** tab and notification stream for staff visibility.
  * **Requirement (Late Cancellations $< 1.5\text{h}$ — Manual Support Escalation)**:
    - Cancellations attempted with less than 1.5 hours remaining cannot be auto-cancelled in the customer app (as kitchen preparation and packaging are actively underway).
    - The customer app prompts the Team Manager to submit an urgent ticket to the **Support & Issues** tab.
    - Console staff investigates the case (assessing kitchen status, ingredient usage, or severe unplayable weather) and can manually resolve the ticket with discretionary full or partial soft credit to the Team.

* **US-24**: As a Business Owner or Operations Manager, I want all reimbursements and rainout compensations to be credited as In-App Soft Credits (rather than cash bank transfers), so that capital remains in the business and repeat team orders are incentivized.
  * **Requirement**: **Zero Cash/Bank Reversals**: All approved compensations (automated rainouts, quality grievances, missing items) are credited directly as **In-App Match Credits (₹ INR)** to the **Team's account (associated with the Team entity / Team Profile upon creation)**.
  * **Requirement (Team-Level Wallet Retention)**: Because different Team Managers or squad coordinators may place orders across different matches or seasons, credit balances are tied directly to the Team entity, ensuring funds remain permanently available to the squad regardless of who is managing the order on match day.
  * **Requirement**: Manual soft credit issuance modal (in Support & Issues tab) captures:
    - **Credit Amount (₹ INR)** (100% for verified rainouts; custom partial amount for quality/missing items)
    - **Credit Reason**: `Match Rainout` | `Food Quality Issue` | `Missing Items` | `Delivery Delay` | `Goodwill`
    - **Staff Member Identifier & Timestamp**
  * **Requirement (Customer Next Order Deduction)**: On their next pre-order in `Innings Break`, the Team's soft credit balance is automatically deducted from the cart total, requiring the team to pay only the remaining balance via UPI.

---

## 4. Success Metrics

1. **Kitchen Waste Prevention**: 100% of early morning rainout cancellations submitted before preparation halt kitchen cooking, reducing wasted food to 0%.
2. **Ground Creation Time**: Business Owner can onboard a multi-ground venue with GPS pin and gate instructions in < 2 minutes.
3. **Batch Prep Efficiency**: Kitchen staff can view consolidated preparation totals per match slot in 1 click, reducing order packing errors to 0%.
4. **Delivery Serviceability Accuracy**: 100% of incoming pre-orders originate strictly from grounds within the configured Kitchen Hub delivery radius.
5. **On-Field Handoff Success**: 100% of orders have both Primary (Team Manager) and Secondary (On-Field) contact numbers recorded, ensuring delivery handoff never fails while the squad is on the pitch.
6. **Dispatch Traceability**: 100% of `In Transit` orders have a mandatory 3rd-Party Courier Booking ID recorded.
7. **Soft Credit Retention**: 100% of rainout and grievance compensations are issued as In-App Soft Credits, retaining 100% of order capital within the Innings Break ecosystem.
8. **Multi-Location Scalability**: Operations Managers are scoped 100% to their assigned Kitchen Hub without cross-hub data leakage.
9. **Zero Persona / Role Drift**: 100% enforcement of role boundaries (Operations Managers restricted from Team Members management; unauthorized personas barred).
10. **Operational Calendar & Scheduling Readiness**: 100% of current and upcoming weeks in the Active Month Calendar have operating days locked (either via interactive week/month/day configuration by staff or automated Sunday 2:00 PM fallback), ensuring 0% pre-order scheduling ambiguity.

---

## 5. Scope & Out-of-Scope

### In Scope (MVP)
* Mobile Number + SMS OTP Whitelisted Authentication: Single Business Owner bootstrap + invite-only Operations Managers (strangers / unauthorized mobile numbers strictly blocked).
* Exclusive Team Members management with Operations Manager pre-authorization and assignment to a specific Kitchen Hub.
* Dedicated **Business Presences Tab** (City: Chennai ➔ Kitchen Hubs: Primary Kitchen flag, GPS Coordinates, Address, Delivery Radius).
* Location-scoped Console Dashboard for Operations Managers and Global Kitchen Switcher for Business Owner (displaying the single active Primary Hub in MVP).
* Multi-Kitchen ready database schema and entity models.
* **Interactive Active Month Calendar View & Operations Engine**: Monday-to-Sunday responsive monthly calendar grid in the Console dashboard, multi-level controls (Business Owner exclusive month/week bulk controls; hub-scoped day-level availability), midweek holiday tagging, Sunday 2:00 PM post-lunch scheduling cutoff, and automated fallback locking.
* Centralized Menu Catalog with Kitchen-Level `In Stock / Sold Out` availability controls.
* Configurable Delivery Radius Geofence (e.g., 10 km) with **Haversine straight-line distance calculation** and dynamic ground serviceability filtering.
* 3 Standard Daytime Match Slots: `6:30 AM`, `10:30 AM`, and `2:30 PM` with configurable Pre-Order Cutoff Windows.
* **Multi-Day Match Date Switcher**: Quick pills for `Today`, `Tomorrow`, active operational days (`Saturday`, `Sunday`, configured midweek holidays), and calendar date picker to view and plan pre-orders across different days.
* Targeted exclusively for **Leather Ball Cricket Matches** (`Turf Wicket` & `Matting Wicket` grounds for customer pre-orders; all facility types cataloged in Console).
* Order Cards capturing **Team Name**, **Primary Team Manager Contact**, **Secondary On-Field Teammate Contact**, Venue/Pitch details, and Gate notes.
* 5-Stage Order Lifecycle: `Confirmed` ➔ `Accepted` (with customer notification) ➔ `Preparing` ➔ `In Transit` ➔ `Completed` (+ `Cancelled/Refunded`).
* Auto-completion to `Completed` after 24 hours if not manually closed.
* In-App itemized **Invoice Copy Viewer** and printable/shareable receipt modal for all placed orders.
* Mandatory 3rd-party Delivery Booking ID logging upon dispatch (Dunzo, Porter, Direct Courier internal dispatch format).
* **Early Rainout Cancellation Engine**: Automated order halting for cancellations $\ge 1.5\text{h}$ with instant automated 100% In-App Soft Credit deposit to the **Team's wallet balance**.
* Dedicated **Support & Issues Tab** for managing post-delivery quality grievances and late cancellation escalations.
* **Independent Area Management**: Dedicated CRUD Data Grid (Create, Read, Edit/Update, Delete with confirmation), GPS Decimal Coordinates (`Latitude`, `Longitude`), optional Google Maps link, and instant `Active` / `Inactive` toggle.
* **Independent Venue Management**: Decoupled Venue CRUD Data Grid (Name, Venue Type: Standalone vs Multi-Complex, GPS Coordinates, Google Maps link, Photo Gallery, Video Walkthrough URL, Active/Inactive toggle, and **real-time Delivery Radius Serviceability Badge**).
* **Multi-Facility Ground & Pitch Drill-Down**: Add and configure facilities under any Venue (Leather Ball Turf/Matting grounds, Tennis Ball turfs, Practice Nets, Delivery Gate notes, optional pitch coordinates, and individual status toggles).
* In-House Kitchen Menu with nutritional profiles (Calories, Protein, Carbs, Fats, Electrolytes) and dietary badges (`Veg`, `Non-Veg`, `Egg`).
* 5 Standard Categories: `Beverages & Hydration`, `Fresh Cut Fruits`, `High Protein Power Snacks`, `Energy Bites`, `Team Meals` (including porridges).
* Dynamic Bundle Builder for custom curated team packs.
* **Day-Specific Multi-Column Visual Order Pipeline (Kanban Board)**: Visually distinct status columns (`New/Not Accepted`, `Accepted`, `Preparing`, `In Transit`, `Delivered/Completed`), real-time card transition animations, background polling (15–30s interval) + manual refresh action, and integrated match time slots (`6:30 AM`, `10:30 AM`, `2:30 PM`).
* **Inclusive Aggregated Kitchen Batch Prep Sheet**: Aggregated totals per match date and time slot, automatically including all Confirmed (UPI Paid) orders regardless of acceptance state, with a **One-Click Print / Export View** for kitchen preparation counters.

### Out of Scope (Deferred to Future Phases)
* Public self-registration or open sign-up (Console access is strictly whitelisted: single Business Owner + invite-only Operations Managers).
* Multiple Business Owners (MVP operates with 1 single Business Owner).
* Direct cash/bank account reversals (In-App Soft Credits credited exclusively to Team wallet balance for MVP).
* Multiple active secondary kitchens operating concurrently (MVP operates 1 Primary Kitchen Hub in Chennai).
* Real-time automated dynamic multi-kitchen order routing engine (MVP routes all orders through the Primary Kitchen Hub).
* Floodlight evening match slots (`6:00 PM` and `10:00 PM`).
* Customer pre-order placement for tennis ball cricket grounds and practice nets (cataloged in Console, pre-ordering disabled in customer app for MVP).
* Automated same-venue multi-order courier batching algorithms (deferred to post-MVP).
* Automated direct API dispatch integration with Dunzo/Porter (MVP uses manual booking + console tracking logs).
* Inventory ingredient-level procurement and vendor supply chain ERP.
* Multi-city deployment outside of Chennai.
* Native iOS/Android apps (Responsive Web + PWA is the standard delivery mode).
