> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.2 Business Presences, Multi-Kitchen Hubs & Delivery Geofencing

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
