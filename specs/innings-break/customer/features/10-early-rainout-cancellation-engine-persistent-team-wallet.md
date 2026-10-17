> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.10 Early Rainout Cancellation Engine ($\ge 1.5\text{h}$) & Persistent Team Wallet

* **US-13**: As a Team Manager, I want permanent visibility of our Team Wallet balance across the app, and the ability to cancel an order before the cutoff window if morning rain washes out our game, so that 100% of our order value is refunded as in-app soft credits and automatically redeemed on our next match order.
  * **Requirement (Persistent Team Wallet Visibility Across the App)**:
    - The **Team Soft Credit Wallet Balance (₹ INR)** is permanently visible to the Team Manager at all times:
      - **Top Header Bar**: Persistent wallet pill/badge (e.g., `🪙 ₹500 Team Credit`) visible on Calendar, Menu, Orders, and Profile screens.
      - **Team Profile Tab**: Detailed wallet ledger showing credit deposits (rainouts/grievances), redemptions, and timestamps.
  * **Requirement (Universal 1.5-Hour Automated Rainout Cancellation Cutoff)**:
    - In accordance with the system-wide cancellation engine ([specs/innings-break/console/features/09-in-app-soft-credits-early-rainout-cancellation-engine.md](file:///specs/innings-break/console/features/09-in-app-soft-credits-early-rainout-cancellation-engine.md) US-23):
      - **`6:30 AM Slot`** ➔ Automated Rainout Cutoff is **5:00 AM** (90 mins prior).
      - **`10:30 AM Slot`** ➔ Automated Rainout Cutoff is **9:00 AM** (90 mins prior).
      - **`2:30 PM Slot`** ➔ Automated Rainout Cutoff is **1:00 PM** (90 mins prior).
  * **Requirement (Self-Service 1-Tap Cancellation & Instant 100% Wallet Deposit)**:
    - On the active Order Card in the Orders page, a **"Cancel Order (Rainout / Match Called Off)"** button is available prior to the 1.5-hour cutoff.
    - Hitting cancel:
      - Halts kitchen batch preparation immediately in the Console.
      - Transitions order status to `Cancelled (Rainout)`.
      - **Instantly deposits 100% of the paid order value into the Team's Soft Credit Wallet (`TeamWallet`) with zero delay and zero manual intervention**.
      - Header wallet pill and profile wallet balance immediately update in real-time.
  * **Requirement (Automatic Deduction on Subsequent Orders)**:
    - On the squad's subsequent pre-order, the accumulated wallet balance is **automatically applied to the cart total at checkout**:
      - If wallet covers 100%: Order confirms with 1 click without prompting for UPI payment.
      - If wallet covers partial: Deducts full balance and prompts only for the net difference via UPI.
  * **Requirement (Late Cancellations $< 1.5\text{h}$ Manual Escalation)**:
    - Cancellations attempted with $< 1.5$ hours remaining (kitchen cooking already active) disable 1-tap cancellation and route the manager to submit an urgent support grievance ticket for staff review.
