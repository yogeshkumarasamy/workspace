> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# PRD: Innings Break Console — Success Metrics & Scope

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
