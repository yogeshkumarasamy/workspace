> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.8 Upfront UPI Payment, Confirmation & Payment Failure Recovery

* **US-11**: As a Team Manager, when I tap "Pay" in the Order Summary, I want to seamlessly complete the transaction via UPI, be routed to a verified Order Confirmation screen with my transaction ID and invoice on success, or be guided through an immediate retry flow on payment failure without losing my cart data.
  * **Requirement (UPI Payment Execution)**:
    - **Strict Mandate**: No COD, no post-delivery payment. Upfront payment is mandatory to confirm batch kitchen procurement.
    - **Mobile UPI Intent Integration**: Single-tap **"Pay ₹[Amount] via UPI"** button launches installed UPI apps (Google Pay, PhonePe, Paytm, BHIM, CRED).
    - **Fallback UPI QR / VPA**: Dynamic QR code and Copy UPI ID option for desktop browser or tablet users.
  * **Requirement (Successful Payment & Order Confirmation Screen)**:
    - Backend validates UPI transaction reference and transitions order status to `Confirmed (UPI Paid)`.
    - Routes the Team Manager to the **Order Confirmation Screen**:
      - **Confirmation Badge**: Clear visual celebration banner (*"Pre-Order Confirmed!"*).
      - **Transaction Verification**: Verified Order ID, UPI Transaction Reference ID, and Payment Timestamp.
      - **Match Logistics Summary**: Target Match Date, Daytime Slot (`6:30 AM` / `10:30 AM` / `2:30 PM`), Ground Venue, Pitch Name, and Gate Delivery Notes.
      - **Itemized Squad Breakdown**: List of dishes, squad quantities, and player assignments.
      - **Actions**: **"View Itemized Invoice"**, **"Share Summary to WhatsApp"**, and **"Go to Orders Page"**.
  * **Requirement (Payment Failure Screen & Zero-Loss Retry Recovery)**:
    - If the payment is declined, cancelled by user, or times out at the bank:
      - Routes the Team Manager to a dedicated **Payment Failed Screen**.
      - Displays clear, user-friendly failure explanation (*"Payment Incomplete: Transaction was declined by your bank or cancelled. No funds were debited."*).
      - Prominent **"Retry Payment"** CTA button: Immediately launches the payment options again with 100% of the drafted order items, player assignments, and delivery contacts intact (zero re-entry frustration).
      - Secondary option: *"Back to Order Summary"* to modify cart or contacts.
