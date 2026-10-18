> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.11 Dedicated Help & Support Screen & Order-Linked Grievance Tracking

* **US-14**: As a Team Manager, if I request a late cancellation or raise a quality/fulfillment grievance, I want a dedicated Help & Support screen to track all my requests with direct relations to the associated orders, so that I can monitor ticket resolutions and review past provider support seamlessly over time.
  * **Requirement (Dedicated Help & Support Screen)**:
    - Accessible via the navigation menu / profile (**"Help & Support"**).
    - Chronologically lists all support inquiries, quality grievances, and late cancellation requests.
    - Each Support Ticket Card displays:
      - **Ticket ID & Submission Timestamp**
      - **Associated Match Order Relation**: Clickable Order ID pill linking directly to the full order invoice (e.g., `🔗 Order #IB-9281 • Sat 26 Sep @ Marina Turf 1`).
      - **Issue Category Badge**: `Match Cancellation Review` | `Food Quality / Spoilage` | `Missing Items` | `Damaged Packaging / Spills` | `Delivery Delay` | `Wrong Pavilion Drop-off` | `Other`.
      - **Customer's Description & Notes**.
      - **Real-Time Ticket Status**: `⚪ Open` ➔ `🟡 In Progress` ➔ `🟢 Resolved`.
      - **Provider Resolution Details**: Staff investigation notes and any associated In-App Soft Credit compensation issued (e.g., `🎉 Resolved: ₹300 Match Credit deposited to Team Wallet`).
  * **Requirement (Order-Specific Grievance Creation Flow)**:
    - From the completed order card in the Orders Page, a **"Report Issue / Request Help"** button opens a pre-populated ticket submission form capturing the Order ID, category, description, and optional photo attachment.
