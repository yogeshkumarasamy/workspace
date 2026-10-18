> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.8 Help, Support & Quality Grievance Management

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
