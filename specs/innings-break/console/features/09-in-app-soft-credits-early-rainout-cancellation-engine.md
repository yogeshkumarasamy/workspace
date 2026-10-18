> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.9 In-App Soft Credits & Early Rainout Cancellation Engine

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
