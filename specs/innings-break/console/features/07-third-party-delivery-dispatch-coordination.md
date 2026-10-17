> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.7 Third-Party Delivery Dispatch Coordination

* **US-20**: As an Operations Manager or Business Owner, I want to log mandatory courier booking details when dispatching an individual team order, so that every order is traceable against its delivery partner booking.
  * **Requirement**: Per-team order dispatch model for MVP (individual courier booking per order).
  * **Requirement**: When moving an order to `In Transit`, capture:
    - **Delivery Partner**: `Dunzo` | `Porter` | `Direct Courier` | `Other`
    - **3rd-Party Booking ID / Reference ID** (*Mandatory* — ensures direct audit trail against the courier platform). When `Direct Courier` or in-house delivery is selected, system accepts an internal dispatch reference (e.g., `DIRECT-<TIMESTAMP>` or Driver Contact Number) so validation does not block manual dispatches.
    - Tracking Link / Order Reference URL (optional)
    - Courier Driver Name & Mobile Number (optional)
    - Estimated Time of Arrival (ETA)
  * **Requirement (Future Phase Extension)**: System specification is designed to support **Same-Venue Multi-Order Courier Batching** (combining multiple team orders destined for the same ground complex into a single delivery run to optimize logistics cost).
