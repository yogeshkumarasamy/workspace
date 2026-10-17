> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# PRD: Innings Break Customer App (Team Manager App) — Success Metrics & Scope

## 4. Success Metrics

1. **Pre-Order Completion Speed**: Team Manager can select ground, choose a squad bundle, and complete UPI checkout in $< 90\text{ seconds}$.
2. **Squad Polling Response Rate**: $> 80\%$ of curated squad members complete their refreshment choices via WhatsApp link within 3 hours of poll dispatch.
3. **Rainout Refund Latency**: 100% of automated rainout cancellations ($\ge 1.5\text{h}$) deposit soft credits into the Team Wallet in $< 1\text{ second}$.
4. **Delivery Handoff Success Rate**: $> 99\%$ successful delivery handoffs without courier disruption to active cricket play (enabled by mandatory Gate Notes & Secondary On-Field Contact).
5. **Geofencing Precision**: 100% of placed orders are strictly within the deliverable radius of the active Kitchen Hub.
6. **Wallet Re-engagement**: $> 85\%$ of issued soft credits are redeemed on the squad's subsequent match pre-order.
7. **Zero Persona / Role Drift**: 100% compliance with Canonical Personas (no player login screens, no captain misnomers, no third-party courier portals).

---

## 5. Scope & Out-of-Scope

### In Scope (MVP)
* Responsive Web & PWA architecture (mobile-first for Team Managers, installable to Home Screen).
* Mobile Number + SMS OTP Authentication: First-time sign-up captures Team Manager Name, Team Name, Mandatory CricHeroes Team Profile Link, Optional Captain Profile Link, and verified Mobile Number; subsequent logins use strictly Mobile Number + SMS OTP.
* Team Entity-bound **In-App Soft Credit Wallet** (`TeamWallet`).
* **Per-Week Team Manager Delegation & Tokenized Magic URL**: Time-bound logistics delegation from Primary Team Manager to a registered squad member for specific operating weeks via secure WhatsApp/SMS link, with full operational parity, prominent role header badges, and instant revocation control.
* Post-Auth Landing: **Interactive Monthly Calendar View** with active week focus, weekend match selection (`Saturday` / `Sunday`), active midweek holiday game scheduling, and future weeks/months advance booking.
* Operating Schedule Synchronization & Console Pre-Order Gating: Pre-orders dynamically restricted strictly to active operational days configured in the Console; non-operational days locked and non-selectable.
* **4-Step Match Quick Scheduling Flow**:
  1. **Date Confirmation** (pre-selected from active week calendar).
  2. **Smart Hierarchical Ground Search**: Unified search across **Area**, **Venue**, and **Ground**; instant resolution for `Standalone Venues` (1 ground) vs drill-down picker for `Multi-Complex Venues` (multiple pitches); default 20 km proximity radius search for Area queries.
  3. **3 Standard Daytime Match Slots** (`6:30 AM`, `10:30 AM`, `2:30 PM`) with automated pre-order cutoff locking.
  4. **Optional Match Squad Curation**: Selection of playing XI / squad from team member roster (with Player Name and verified Mobile Number) for itemized player-mapped invoices and WhatsApp polling.
* Real-time match schedule badge reflection on the Monthly Calendar View upon completion.
* Nested Pitch Facility selection for **Leather Ball Cricket Grounds** (`Turf Wicket` & `Matting Wicket`) with Haversine Delivery Radius geofence verification (`Deliverable` vs `Out of Range`) and mandatory Gate & Pavilion drop-off notes.
* **Multi-Match Weekend Pre-Ordering & Contextual Match Switcher**: Seamless 1-tap switching between scheduled Saturday, Sunday, or midweek holiday games on the Menu and Cart screens with isolated match contexts (date, ground, squad, cart payload) and partitioned multi-match checkout.
* In-House Sports Nutrition Menu browsing across 5 categories with nutritional facts (Calories, Protein, Carbs, Electrolytes) and dietary flags (`Veg`, `Non-Veg`, `Egg`).
* **Dual Ordering Modes**: Blind Bulk squad ordering vs **Per-Item Player Assignment** via squad checkbox multi-select UI (supporting 1-tap `Select All` and auto-syncing item quantities to checked players).
* **Squad Menu Polling & WhatsApp Link Preference Collection**: Triggering personalized, zero-login lightweight web polling links per squad member via WhatsApp from the Menus page; live response tracker with 1-tap reminder triggers and 1-tap auto-sync to draft cart.
* **Domestic Cricket Squad Sizing**: Multiplier shortcuts for `+1`, `+11 (Traditional XI)`, `+13 (XI + 2 Super Subs)`, and `+15 (Squad + Reserves)`.
* Pre-curated Dynamic Bundles / Team Packs with full squad assignment.
* Dual Delivery Contact capture (Primary Team Manager + Secondary On-Field Teammate).
* Automatic Team Soft Credit deduction against cart total at checkout.
* Upfront UPI Payment integration (UPI Intent for mobile apps + Dynamic QR / VPA).
* Real-Time 5-Stage Live Order Tracker (`Confirmed` ➔ `Accepted` ➔ `Preparing` ➔ `In Transit` ➔ `Delivered`) with polling sync and manual refresh.
* Itemized Digital Invoice Receipt viewer with 1-click **"Share to WhatsApp"** summary.
* Universal 1.5-Hour Early Rainout Cancellation Engine with instant automated 100% Team Soft Credit refund.
* **Dedicated Help & Support Screen**: Order-linked ticket tracking for quality grievances, late cancellations, and delivery inquiries with real-time status and provider resolution history.
* **Dedicated Team Credits & Wallet Refund Ledger**: Chronological transaction history tracking credit inflows (rainouts, compensations) and outflows (redemptions) with clickable order relations and persistent balance visibility.

### Out of Scope (Deferred to Future Phases)
* Individual player ordering accounts or player-facing sub-accounts (players only access lightweight, zero-login web polling links).
* Cash on Delivery (COD) or post-match credit billing (Strictly UPI upfront + Soft Credits).
* Customer pre-orders for Tennis Ball cricket grounds and Practice Net cages (cataloged for directory awareness, but ordering disabled for MVP).
* Floodlight evening match slots (`6:00 PM` and `10:00 PM`).
* Direct payment gateway card/netbanking integrations with processing fee overhead (UPI-only for MVP).
* Native iOS / Android binary app store releases (PWA covers mobile-first installability).
* Multi-city expansion outside Chennai (Chennai-only for MVP).
