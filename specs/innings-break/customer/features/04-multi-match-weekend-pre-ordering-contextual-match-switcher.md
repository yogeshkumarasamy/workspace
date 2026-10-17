> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.4 Multi-Match Weekend Pre-Ordering & Contextual Match Switcher

* **US-06**: As a Team Manager, when our squad plays multiple matches in a single week (e.g., both Saturday and Sunday, or double-header tournament games), I want an intuitive Contextual Match Switcher on the Menu and Cart screens, so that I can effortlessly toggle between my scheduled games, build separate refreshment orders with isolated squad contexts, and review or checkout both matches seamlessly.
  * **Requirement (Contextual Match Switcher Header Toolbar)**:
    - At the top of the Menu browsing and Cart screens, the app renders a **Scheduled Match Switcher** toolbar displaying tabs/pills for all active scheduled games in the selected week/month:
      - `🏏 Sat 26 Sep • 6:30 AM @ Marina Turf 1 [Cart: 11 items]`
      - `🏏 Sun 27 Sep • 10:30 AM @ St. Bedes Matting [Cart: 13 items]`
      - `+ Schedule Another Game` (Quick shortcut to open the 4-step scheduling modal for another active date).
  * **Requirement (1-Tap Seamless Context Switching)**:
    - Tapping a match tab instantly switches the active ordering context:
      - **Target Match Date & Daytime Slot**
      - **Destination Venue & Pitch** (with gate delivery notes)
      - **Active Kitchen Hub Availability** (dynamic stock check for that date/hub)
      - **Curated Match Squad** (displays the specific player roster curated for that match)
      - **Isolated Cart Payload** (items, player assignments, and squad quantities for that match).
    - Switching tabs preserves all drafted cart selections across both matches without data loss.
  * **Requirement (Multi-Match Partitioned Cart & Unified UPI Checkout)**:
    - The Cart view cleanly groups orders into distinct match sections:
      ```
      ┌─────────────────────────────────────────────────────────────┐
      │ Match 1: Saturday 26 Sep • 6:30 AM @ Marina Ground #1       │
      │ 11x Cold-Pressed Juices + 11x Millet Porridges (Subtotal: ₹880) │
      ├─────────────────────────────────────────────────────────────┤
      │ Match 2: Sunday 27 Sep • 10:30 AM @ St. Bedes Turf          │
      │ 13x Tender Coconuts + 13x Boiled Egg Duos (Subtotal: ₹910)   │
      ├─────────────────────────────────────────────────────────────┤
      │ Combined Total: ₹1,790                                      │
      │ Applied Team Soft Credit: -₹500                             │
      │ Final Payable UPI Amount: ₹1,290                            │
      └─────────────────────────────────────────────────────────────┘
      ```
    - The Team Manager can pay in a single upfront UPI transaction, while the backend generates two independent, traceable Match Order IDs for kitchen prep batches and courier dispatches.
