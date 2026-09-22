# PRD: Innings Break Console

> **Status**: In Review  
> **Author**: Product Manager (BMAD)  
> **Date**: 2026-09-21  
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

### 3.1 Authentication, Access Control & Staff Onboarding

* **US-01**: As a Business Owner or Operations Manager, I want to sign up or sign in using my mobile number and OTP, so that I have a secure, passwordless authentication experience.
  * **Requirement**: Mobile number is the sole unique identifier. Verification via SMS OTP.
  * **Requirement**: Sign-up captures Full Name, Role (`Business Owner` | `Operations Manager`), Mobile Number, Email, and City (defaulted to `Chennai`).
  * **Requirement**: System routes the user to the appropriate Console dashboard upon successful OTP verification.

* **US-02**: As a Business Owner, I want to access a dedicated Team Members section to manage Operations Managers and assign them to specific Kitchen Hubs, so that staff responsibilities are scoped to their operating location.
  * **Requirement**: The Team Members section is visible **exclusively to the Business Owner**.
  * **Requirement**: Displays registered Operations Managers (Name, Mobile, Email, Assigned Kitchen Hub, Date Joined, Status).
  * **Requirement**: Business Owner can assign or re-assign an Operations Manager to a specific Kitchen Hub.
  * **Requirement**: Business Owner can generate and share a secure sign-up invite link (pre-tagged with a kitchen hub assignment) via WhatsApp/copy link to onboard new Operations Managers.

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
  * **Requirement**: Dropdown selector allowing the Business Owner to filter orders, prep sheets, and staff by specific Kitchen Hub or view all.

* **US-06**: As a Business Owner, I want the system to enforce Delivery Serviceability Geofencing based on Kitchen Hub coordinates, so that customers can only order for grounds within operational reach.
  * **Requirement**: System calculates distance between the active Kitchen Hub and match grounds:
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

### 3.3 Grounds & Venue Directory Management

* **US-08**: As a Business Owner, I want to create and manage geographical Areas in Chennai, so that grounds can be dynamically grouped and discovered.
  * **Requirement**: Independent Area entity containing Area Name (e.g., *Velachery*, *Thoraipakkam*, *Porur*), City (`Chennai`), Center Coordinates (`Latitude`, `Longitude`), and Status (`Active` / `Inactive`).

* **US-09**: As a Business Owner, I want to create Venues and individual Grounds/Pitches with pinpoint GPS coordinates, so that delivery couriers and team managers have exact location accuracy.
  * **Requirement**: Support for **Single Standalone Grounds** as well as **Multi-Ground Complexes** (parent venue with shared coordinates + multiple child grounds/pitches).
  * **Requirement**: Ground fields include:
    - Official Ground/Pitch Name
    - Optional Colloquial / Legacy Aliases (e.g., *"Old MRF Ground"*)
    - Exact GPS Coordinates (`Latitude`, `Longitude`) via interactive map pin drop or direct coordinate input
    - Auto-resolved Primary Area (calculated from nearest created Area's coordinates)
    - Full Street Address & Landmark
    - Delivery Entrance Gate & Pavilion Drop-Off Notes (e.g., *"Gate 2 near north nets pavilion"*)
    - Ground Caretaker / Coordinator Contact Number (optional)
    - Multi-Photo Gallery upload (optional)
    - YouTube Walkthrough Video URL embed/link (optional)
    - Status toggle (`Active` / `Inactive`)

* **US-10**: As a Business Owner, I want to categorize grounds by their playing format and pitch surface, so that Team Managers can filter facilities matching their game format.
  * **Requirement**: Classification taxonomy:
    1. **Leather Ball Cricket Ground**: Sub-categorized into `Turf Wicket`, `Matting Wicket`, `Cement / Astro Wicket`
    2. **Box Cricket Turf**
    3. **Tennis Ball Cricket Ground**
    4. **Cricket Practice Nets Venue**

* **US-11**: As a Business Owner, I want to toggle an Area, Venue, or Pitch to Inactive, so that it is immediately hidden from customer ordering during maintenance while preserving all historical records in the Console.

---

### 3.4 Kitchen Menu, Nutrition, Recipes & Dynamic Bundles

* **US-12**: As a Business Owner, I want to create in-house recipe menu items with nutritional facts, and allow kitchen staff to manage availability per Kitchen Hub, so that menu items are centrally standardized while stock is locally controlled.
  * **Requirement**: Menu items created centrally by Business Owner with:
    - Item Name (e.g., *"Cold-Pressed Watermelon Juice"*, *"Boiled Egg Duo with Pepper"*, *"Millet / Ragi Porridge"*, *"Whole-Wheat Sandwich"*)
    - Description & In-House Kitchen Prep Notes
    - Nutritional Profile: Calories (kcal), Protein (g), Carbohydrates (g), Fats (g), Key Minerals/Electrolytes
    - Dietary Tag: `🟢 Veg`, `🔴 Non-Veg`, `🟡 Egg`
    - Category: `Beverages & Hydration`, `Fresh Cut Fruits`, `High Protein Power Snacks`, `Energy Bites`, `Team Meals` (e.g., Porridges, Rice packs)
    - Unit Price (₹ INR)
    - Item Photo (image upload)
  * **Requirement (Kitchen-Level Availability)**: Operations Managers and Business Owner can toggle item availability (`Active / In Stock` vs. `Inactive / Sold Out`) specific to their Kitchen Hub.

* **US-13**: As a Business Owner or Operations Manager, I want to build and publish Dynamic Bundles / Team Packs from available menu items, so that Team Managers can order pre-curated squad combos.
  * **Requirement**: Dynamic Bundle Builder allows selecting any active items, defining item quantities per bundle (e.g., 11x Juices + 11x Porridges + 11x Bananas), setting a bundled package price (₹ INR), uploading a bundle photo, and publishing it directly as an orderable pack.

---

### 3.5 Order Queue, Kitchen Batch Prep & Fulfillment

* **US-14**: As a Business Owner or Operations Manager, I want to view all incoming weekend match pre-orders organized by Match Date and Slot Tabs (`6:30 AM`, `10:30 AM`, `2:30 PM`) for my Kitchen Hub, so that I can manage fulfillment efficiently.
  * **Requirement**: Targeted exclusively for **Leather Ball Cricket Matches** (both `Turf Wicket` and `Matting Wicket` grounds) for MVP.
  * **Requirement**: Each Order Card under a slot displays:
    - **Team Name**
    - **Primary Contact**: Team Manager Name & Mobile Number
    - **Secondary On-Field Contact**: Alternate Contact Name & Mobile Number (designated teammate/player for delivery handoff when the manager is batting/fielding)
    - **Ground & Venue Location**: Venue Name, Specific Pitch/Ground, Address, and Delivery Entrance Gate / Pavilion Drop-off notes
    - **Complete Item & Squad Quantity Breakdown**
    - **Order Total (₹)** and Verified UPI Transaction Reference
    - **Current Fulfillment Status** & Third-Party Delivery Tracking

* **US-15**: As an Operations Manager or Business Owner, I want an Aggregated Kitchen Prep Sheet for each match slot scoped to my Kitchen Hub, so that kitchen staff can execute batch cooking and bottling efficiently.
  * **Requirement**: Consolidated view summing total units required per item across all grounds for a selected match time slot (e.g., *"Saturday 6:30 AM Slot Summary: 66x Watermelon Juices, 33x Porridges, 22x Boiled Egg Packs across 5 grounds"*).

* **US-16**: As an Operations Manager or Business Owner, I want to manage orders across a granular 5-stage fulfillment lifecycle, so that real-time order states and auto-completion are handled reliably.
  * **Requirement**: Fulfillment state progression:
    1. `Confirmed (UPI Paid)`: Initial verified state upon team pre-order placement.
    2. `Accepted`: Business Owner or Operations Manager clicks **"Accept Order"**, immediately triggering an order accepted notification to the customer app.
    3. `Preparing`: Flipped by staff the morning of the match as kitchen prep begins.
    4. `In Transit`: Dispatched to delivery courier with mandatory Booking ID.
    5. `Completed / Delivered`: Manually marked complete by staff once the match slot concludes.
  * **Requirement (Auto-Completion Rule)**: If an order in `In Transit` is not manually marked `Completed` by staff, the system automatically flips the status to `Completed` after 24 hours (1 day).
  * **Requirement**: Support for `Cancelled / Refunded` exception state with cancellation rationale (e.g., match rainout / severe weather).

* **US-17**: As a Business Owner or Operations Manager, I want to view the itemized Invoice Copy for any order, so that I can verify order billing, tax, and squad items against accounting records.
  * **Requirement**: Dedicated **"View Invoice"** action on each order card, displaying the invoice copy generated at checkout (Order ID, Team Manager details, ground address, itemized squad breakdown, UPI transaction ID, and timestamp).

---

### 3.6 Third-Party Delivery Dispatch Coordination

* **US-18**: As an Operations Manager or Business Owner, I want to log mandatory courier booking details when dispatching an individual team order, so that every order is traceable against its delivery partner booking.
  * **Requirement**: Per-team order dispatch model for MVP (individual courier booking per order).
  * **Requirement**: When moving an order to `In Transit`, capture:
    - **Delivery Partner**: `Dunzo` | `Porter` | `Direct Courier` | `Other`
    - **3rd-Party Booking ID / Reference ID** (*Mandatory* — ensures direct audit trail against the courier platform)
    - Tracking Link / Order Reference URL (optional)
    - Courier Driver Name & Mobile Number (optional)
    - Estimated Time of Arrival (ETA)
  * **Requirement (Future Phase Extension)**: System specification is designed to support **Same-Venue Multi-Order Courier Batching** (combining multiple team orders destined for the same ground complex into a single delivery run to optimize logistics cost).

---

### 3.7 Help, Support & Quality Grievance Management

* **US-19**: As a Business Owner or Operations Manager, I want a dedicated Support & Issues tab in the Console, so that I can investigate and resolve post-delivery quality and service complaints submitted by Team Managers.
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

* **US-20**: As an Operations Manager or Business Owner, I want to resolve quality grievances by issuing In-App Soft Credits or logging investigation notes, so that customer satisfaction is restored while keeping financial value within the ecosystem.
  * **Requirement**: Staff can manually investigate issues (calling the manager or delivery courier) and execute:
    1. **"Issue In-App Soft Credit"**: Grants a partial credit (e.g., ₹200 for damaged items) directly to the Team Manager's wallet balance.
    2. **"Resolve with Notes"**: Closes the ticket with explanatory resolution notes.
  * **Requirement**: Resolving a ticket updates the status and credits immediately in the customer app.

---

### 3.8 In-App Soft Credits & Early Rainout Cancellation Engine

* **US-21**: As a Business Owner or Operations Manager, I want to enforce a universal Match Cancellation Cutoff Window (at least 1.5 hours prior to the match slot time), so that the kitchen is alerted before food preparation begins, completely eliminating wasted ingredients.
  * **Requirement (Universal 1.5-Hour Cancellation Cutoff)**: Team Managers can initiate an automated Rainout/Match Cancellation in the customer app up to **1.5 hours (90 minutes) before the scheduled match slot**:
    - **`6:30 AM Slot`** ➔ Cancellation Cutoff is **5:00 AM**
    - **`10:30 AM Slot`** ➔ Cancellation Cutoff is **9:00 AM**
    - **`2:30 PM Slot`** ➔ Cancellation Cutoff is **1:00 PM**
  * **Requirement (Kitchen Waste Prevention)**: Because kitchen preparation begins 1.5 hours before the match time, cancellations within the window immediately notify the Console, preventing cooking and packing before work begins.
  * **Requirement**: The order transitions to `Cancelled (Rainout)` and appears in the **Cancelled Orders** tab.
  * **Requirement**: Staff verifies the rainout and approves a **100% In-App Soft Credit** of the order value to the Team Manager's wallet balance.
  * **Requirement (Late Cancellations < 1.5h)**: Cancellations attempted with less than 1.5 hours remaining cannot be auto-cancelled (as cooking is already in progress) and require contacting the Support tab for manual handling.

* **US-22**: As a Business Owner or Operations Manager, I want all reimbursements and rainout compensations to be credited as In-App Soft Credits (rather than cash bank transfers), so that capital remains in the business and repeat team orders are incentivized.
  * **Requirement**: **Zero Cash/Bank Reversals**: All approved compensations (rainouts, quality issues, missing items) are credited directly as **In-App Match Credits (₹ INR)** to the Team Manager's account.
  * **Requirement**: Soft Credit issuance modal captures:
    - **Credit Amount (₹ INR)** (100% for rainouts; custom partial amount for quality/missing items)
    - **Credit Reason**: `Match Rainout` | `Food Quality Issue` | `Missing Items` | `Delivery Delay` | `Goodwill`
    - **Staff Member Identifier & Timestamp**
  * **Requirement (Customer Next Order Deduction)**: On their next pre-order in `Innings Break`, the Team Manager's soft credit balance is automatically deducted from the cart total, requiring them to pay only the remaining balance via UPI.

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

---

## 5. Scope & Out-of-Scope

### In Scope (MVP)
* Mobile Number + SMS OTP Authentication for Business Owner and Operations Managers.
* Exclusive Team Members management with Operations Manager assignment to a specific Kitchen Hub.
* Dedicated **Business Presences Tab** (City: Chennai ➔ Kitchen Hubs: Primary Kitchen flag, GPS Coordinates, Address, Delivery Radius).
* Location-scoped Console Dashboard for Operations Managers and Global Kitchen Switcher for Business Owner.
* Multi-Kitchen ready database schema and entity models.
* Centralized Menu Catalog with Kitchen-Level `In Stock / Sold Out` availability controls.
* Configurable Delivery Radius Geofence (e.g., 10 km) with dynamic ground serviceability filtering.
* 3 Standard Daytime Match Slots: `6:30 AM`, `10:30 AM`, and `2:30 PM` with configurable Pre-Order Cutoff Windows.
* Targeted exclusively for **Leather Ball Cricket Matches** (`Turf Wicket` & `Matting Wicket` grounds).
* Order Cards capturing **Team Name**, **Primary Team Manager Contact**, **Secondary On-Field Teammate Contact**, Venue/Pitch details, and Gate notes.
* 5-Stage Order Lifecycle: `Confirmed` ➔ `Accepted` (with customer notification) ➔ `Preparing` ➔ `In Transit` ➔ `Completed` (+ `Cancelled/Refunded`).
* Auto-completion to `Completed` after 24 hours if not manually closed.
* In-App itemized **Invoice Copy Viewer** for all placed orders.
* Mandatory 3rd-party Delivery Booking ID logging upon dispatch (Dunzo, Porter, Direct).
* **Early Rainout Cancellation Engine**: Instant alert to halt kitchen preparation, saving food waste, with 100% soft credit approval.
* Dedicated **Support & Issues Tab** for managing post-delivery quality and service grievances.
* **In-App Soft Credit System**: Full and partial match credits issued directly to customer wallets, automatically deducted on their next order (zero cash refunds).
* Independent Area management and Multi-Ground Venue hierarchy with auto-resolved Area tagging.
* Ground classification taxonomy (Leather Ball: Turf/Matting/Astro, Box Cricket, Tennis Ball, Practice Nets).
* Pinpoint GPS coordinates (Map pin drop / manual input) with Delivery Entrance Gate & Pavilion drop-off notes.
* Ground media: Photo gallery upload & YouTube Walkthrough URL embed/link.
* Ground Colloquial / Legacy Aliases support.
* In-House Kitchen Menu with nutritional profiles (Calories, Protein, Carbs, Fats, Electrolytes) and dietary badges (`Veg`, `Non-Veg`, `Egg`).
* 5 Standard Categories: `Beverages & Hydration`, `Fresh Cut Fruits`, `High Protein Power Snacks`, `Energy Bites`, `Team Meals` (including porridges).
* Dynamic Bundle Builder for custom curated team packs.
* Slot-grouped Order Queue & Consolidated Kitchen Batch Prep Sheet.

### Out of Scope (Deferred to Future Phases)
* Direct cash/bank account reversals (In-App Soft Credits exclusively used for MVP).
* Multiple active secondary kitchens operating concurrently (MVP operates 1 Primary Kitchen Hub in Chennai).
* Real-time automated dynamic multi-kitchen order routing engine (MVP routes all orders through the Primary Kitchen Hub).
* Floodlight evening match slots (`6:00 PM` and `10:00 PM`).
* Tennis ball cricket and practice nets match pre-order fulfillment.
* Automated same-venue multi-order courier batching algorithms (deferred to post-MVP).
* Automated direct API dispatch integration with Dunzo/Porter (MVP uses manual booking + console tracking logs).
* Inventory ingredient-level procurement and vendor supply chain ERP.
* Multi-city deployment outside of Chennai.
* Native iOS/Android apps (Responsive Web + PWA is the standard delivery mode).
