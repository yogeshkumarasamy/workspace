> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.12 Dedicated Team Credits & Wallet Refund Ledger (Order-Linked Financial History)

* **US-15**: As a Team Manager, I want a dedicated Team Credits & Wallet History page displaying a transparent chronological ledger of all soft credit deposits and redemptions linked to their specific orders, so that our team has complete visibility and accounting of our squad's match funds.
  * **Requirement (Dedicated Team Credits / Wallet History Screen)**:
    - Accessible directly by tapping the persistent **Header Wallet Pill (`🪙 ₹[Balance]`)** or via the **Team Profile** tab.
    - **Header Balance Card**: Prominently displays the current net **Available Team Soft Credit Balance (₹ INR)**.
  * **Requirement (Itemized Order-Linked Transaction Ledger)**:
    - Chronological timeline categorizing every credit event with clear order traceability:
      1. **Credit Inflows (Deposits / Refunds)**:
         - **Credit Amount**: Displayed in green (e.g., `+ ₹1,100`).
         - **Credit Reason**: `Match Rainout 100% Auto-Refund` | `Support Ticket Grievance Credit` | `Missing Item Reimbursement` | `Goodwill Credit`.
         - **Linked Order Relation**: Clickable Order ID reference (e.g., `From Order #IB-9281 • Sat 26 Sep @ Marina Turf 1`) opening the original match order invoice.
         - **Deposit Timestamp**.
      2. **Credit Outflows (Redemptions / Deductions)**:
         - **Debit Amount**: Displayed in purple/gray (e.g., `- ₹500`).
         - **Redemption Context**: Applied as automatic discount at checkout.
         - **Linked Placed Order Relation**: Clickable Order ID reference (e.g., `Applied to Order #IB-9420 • Sun 27 Sep @ St. Bedes`) opening the new order receipt.
         - **Deduction Timestamp**.
  * **Requirement (Seamless Zero-Payment / Discounted Checkout Execution)**:
    - On any upcoming pre-order, the available wallet balance is automatically deducted from the cart total:
      - If wallet covers 100% of order: Net payable is ₹0 (1-click confirmation with zero payment gateway prompt).
      - If wallet covers partial: Balance is fully exhausted and manager pays only the remaining difference via UPI.
    - The transaction immediately logs both the credit deduction and the new order reference in the wallet ledger.
