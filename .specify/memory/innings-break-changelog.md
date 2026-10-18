# Innings Break Decision Log (Changelog)

> **Purpose**: Append-only log of product discussions and decisions for the Innings Break ecosystem, moved verbatim from the former §6 "Brain Dump & Evolution Notes" of [innings-break.md](file:///.specify/memory/innings-break.md). Sessions 1–26 are that original log. Session 27 onward are new entries.  
> **How to use**: Never edit or reorder past sessions. Add each new session **at the bottom** as `### Session N — YYYY-MM-DD: Title`. When a decision settles, reflect it in the stable [overview](file:///.specify/memory/innings-break.md), the [personas](file:///.specify/memory/innings-break-personas.md), or the relevant feature file under the [Console PRD](file:///specs/innings-break/console/prd.md) / [Customer PRD](file:///specs/innings-break/customer/prd.md). Later sessions supersede earlier ones where they conflict.

---

*Raw notes and decision log from ongoing discussions. Features will be carved out into `specs/innings-break/` as they mature.*

### Session 1 — 2026-09-20: Core Concept & Foundations
* **Problem framed**: Chennai domestic cricket, weekends, remote grounds, no refreshments, 5–6 hour match days.
* **Core blocker identified**: Team coordination, not logistics. Swiggy/Zomato exist but don't solve team-level ordering.
* **Business model decided**: Team = minimum order unit. No individual orders. Bulk delivery absorbs cost. Margin built into item pricing.
* **Payment decided**: Upfront UPI-only. No payment = no order. Zero-cost UPI integration preferred.
* **Personas locked in**: Team Manager (Innings Break), Player (passive/WhatsApp), Business Owner (Innings Break Console), Delivery (third-party).
* **Ground management scoped**: Independent Area and Venue/Facility management. Business Owner manages in Console. Team Manager selects in Innings Break (with API handling proximity mapping).
* **App names finalized**: Innings Break, Innings Break Console, Innings Break API.

### Session 2 — 2026-09-21: Platform Delivery & PWA Strategy
* **Form factor**: Responsive websites for both **Innings Break** and **Innings Break Console**, accessible via URL on mobile, tablet, and desktop browsers.
* **PWA capability**: Both apps are Progressive Web Apps (PWA) allowing users (Team Managers, Business Owner, and Operations Managers) to install / add to home screen for instant native-like access without App Store friction.
* **Native mobile apps**: Explicitly out of scope for the first iteration. Responsive Web + PWA is the primary consumption mode.

### Session 3 — 2026-09-21: Console Roles & Authentication
* **Console Personas Refined**: Formalized two roles within `Innings Break Console`: `Business Owner` (Super-User, manages Team Members and settings) and `Operations Manager` (Operations staff, executes order prep and delivery dispatch).
* **Auth Model**: Mobile Number as unique identifier + OTP verification. Sign-up captures Name, Role, Mobile, Email, and Location (defaulted to `Chennai`).
* **Team Onboarding**: Business Owner can share invite links to onboard new Operations Managers directly from the Console's Team Members section.

### Session 4 — 2026-09-21: Ground Logistics, Kitchen Bundles & Daytime Match Slots
* **Ground Classification**: Leather Ball (Turf, Matting, Cement/Astro), Box Cricket, Tennis Ball, Practice Nets. Multi-ground venues vs Standalone grounds with exact GPS pin drop + auto-resolved Area tagging.
* **Menu & Bundles**: In-house sports nutrition (porridges, juices, cut fruits, boiled eggs), dietary flags (`Veg`, `Non-Veg`, `Egg`), and Dynamic Bundle Builder for squad packs.
* **Kitchen Hub & Delivery Radius**: Central kitchen hub with configurable delivery radius geofence (e.g., 10 km) dynamically gating serviceability.
* **Match Time Slots**: Standard 3 daytime slots (`6:30 AM`, `10:30 AM`, `2:30 PM`) targeted for MVP leather ball cricket; floodlight evening slots (`6:00 PM`, `10:00 PM`) deferred.
* **Order Delivery Contacts**: Order cards capture both Primary (Team Manager) and Secondary (On-Field Teammate) contacts to guarantee delivery handoff while the squad is on the pitch.

### Session 5 — 2026-09-21: 5-Stage Order Lifecycle, Courier Audit Trail & Invoicing
* **Granular 5-Stage Lifecycle**: `Confirmed` ➔ `Accepted` (notifies customer app) ➔ `Preparing` (morning prep) ➔ `In Transit` (with mandatory 3rd-party Booking ID) ➔ `Completed` (manually marked post-match, or auto-completed after 24 hours).
* **Delivery Audit Trail**: Mandatory 3rd-Party Booking ID / Reference ID logging upon dispatch.
* **Invoicing**: In-app itemized Invoice Copy viewer for auditing tax, squad quantities, and UPI transaction references.

### Session 6 — 2026-09-21: Business Presences & Multi-Kitchen Hub Scalability
* **Multi-Kitchen Hub Hierarchy**: Dedicated Business Presences tab (City: Chennai ➔ Kitchen Hubs: Primary vs Secondary, GPS coordinates, Delivery Radius geofence).
* **Location-Scoped Dashboards**: Operations Managers assigned to specific Kitchen Hubs with automatically scoped order queues, kitchen prep sheets, and delivery dispatches. Business Owner gets a global kitchen switcher.
* **Kitchen-Level Menu Availability**: Menu items & bundles created centrally by Business Owner; stock/availability (`In Stock` / `Sold Out`) managed at the kitchen hub level.
* **MVP vs Future Scale**: MVP launches with 1 Primary Kitchen in Chennai; data schemas and entity relationships are built multi-kitchen ready from day one.

### Session 7 — 2026-09-21: In-App Soft Credits & Early Rainout Cancellation Engine
* **Universal 1.5-Hour Cancellation Cutoff**: Team Managers can initiate rainout cancellations up to 1.5 hours (90 minutes) prior to match slot time (5:00 AM for 6:30 AM slot, 9:00 AM for 10:30 AM slot, 1:00 PM for 2:30 PM slot), immediately halting kitchen prep. The system automatically deposits a 100% In-App Soft Credit to the **Team's wallet balance** (associated with the Team entity) with zero delay. Cancellations < 1.5h require manual review via the Support tab.
* **In-App Soft Credits Model**: Zero cash/bank refunds. All rainouts, quality grievances, and missing item compensations are issued as In-App Match Credits (₹) directly into the Team's wallet, automatically deducted on their next order.
* **Support & Quality Grievances Tab**: Dedicated console tab for staff to manually investigate and resolve post-delivery quality complaints and issue soft credits.

### Session 8 — 2026-09-22: Weekend Multi-Day Match Date Switcher
* **Weekend Multi-Day Switcher**: Pre-orders are received for both Saturday and Sunday (and future match dates). Both Business Owner and Operations Manager require an intuitive Match Date Switcher (`Today`, `Tomorrow`, `Saturday`, `Sunday`, calendar date picker) with order count badges.
* **Operational Hierarchy**: `Kitchen Hub ➔ Match Date (Saturday/Sunday) ➔ Match Daytime Slot (6:30 AM, 10:30 AM, 2:30 PM)`.
* **Advance Procurement**: Staff can review Sunday prep sheets on Friday/Saturday to forecast bulk raw ingredient requirements (eggs, fruits, coconut crates) for the entire weekend.

### Session 9 — 2026-09-26: Decoupled Area & Independent Venue/Ground Architecture
* **Independent Area Management**: Dedicated CRUD Data Grid for Business Owner to create, view, edit/update, and delete areas (with deletion guard against active venues/orders). Form captures Area Name, Decimal GPS Coordinates (`Latitude`, `Longitude`), optional Google Maps link, and immediate `Active` / `Inactive` status toggle.
* **Independent Venue Management**: Decoupled Venue CRUD Data Grid capturing Venue Name, Venue Type (`Standalone Venue` vs `Multi-Complex Venue`), Decimal GPS Coordinates (`Latitude`, `Longitude`), optional Google Maps link, Media Assets (Cover Photo gallery, YouTube Video Walkthrough URL), Landmark description, and `Active` / `Inactive` status toggle.
* **Multi-Facility Ground / Pitch Drill-Down**: Business Owner can click into any Venue to add and manage nested facilities: Leather Ball Grounds (Turf, Matting, Astro, Cement wickets), Tennis Ball Grounds (Astro, Rubberized, Clay), and Cricket Practice Nets (Turf, Matting, Astro cages), complete with mandatory Gate delivery notes, optional pitch coordinates, and individual status toggles.

### Session 10 — 2026-09-26: Active Month Calendar View & Operational Schedule Engine
* **Interactive Active Month Calendar View**: Responsive 7-column (Monday to Sunday) monthly calendar grid embedded in the Console dashboard.
* **Multi-Level Governance**: Business Owner has exclusive authority over month-level bulk setup ("Apply Month Defaults", "Clear Month Schedule") and week-level controls ("Set Default Weekend", "Activate Entire Week", "Deactivate Week"). Operations Managers can view schedules and toggle day-level availability for their assigned Hub.
* **Advance Long-Range Planning**: Enables planning operations for the current week, upcoming weeks, and future months.
* **Sunday Post-Lunch Cutoff & Automated Fallback**: Cutoff for customizing the upcoming week is Sunday 2:00 PM (14:00 IST). Unconfigured weeks default safely to standard Saturday & Sunday.
* **Customer Pre-Order Gating**: Team Managers in `Innings Break` can view and pre-order exclusively for days marked active in the Console calendar. Inactive days are disabled.

### Session 11 — 2026-09-26: Day-Specific Multi-Column Visual Order Pipeline (Kanban Board)
* **Visual Status Pipeline**: Order fulfillment in the Console is organized into visually distinct color-coded columns: `New Orders / Unaccepted (Confirmed UPI Paid)`, `Accepted`, `Preparing`, `In Transit`, and `Delivered / Completed` (+ `Cancelled / Rainout`).
* **Day-Specific Focus**: Board is scoped strictly per match day (for active weekend days or configured weekday holidays).
* **Integrated Match Time Slots**: The 3 standard daytime match slots (`6:30 AM`, `10:30 AM`, `2:30 PM`) are visually clubbed and badged on each card, with slot filter tabs (`All Slots`, `6:30 AM`, `10:30 AM`, `2:30 PM`) for slot-focused kitchen batches.
* **Real-Time Visual State Transitions**: Updating order statuses instantly transitions cards into their new respective columns with live customer app sync.

### Session 12 — 2026-09-26: Location Architecture Decoupling & API-Level Resolution
* **Complete Entity Decoupling in Console**: City, Area, and Venue are completely decoupled in `Innings Break Console`. No manual foreign-key mappings or dropdown associations exist in the console UI. Venues do **NOT** have an Area dropdown.
* **Independent Entity Management**:
  - `Areas`: Independent locality directory with GPS coordinates and optional Google Maps links.
  - `Venues`: Independent sports complex entities (Standalone vs Multi-Complex) with GPS coordinates, cover photo, video walkthrough URL, and nested Pitch Facilities (Leather Turf/Matting, Tennis, Nets).
* **Backend API Spatial Binding**: Spatial association, proximity search, area clustering, and delivery geofencing are calculated automatically by backend API services for the `Innings Break` customer app and Team Manager experience. Zero manual mapping overhead in the Console.

### Session 13 — 2026-09-26: Whitelisted Authentication & Stranger Lockout
* **Single Business Owner Bootstrap**: 1 single Business Owner operates the platform in MVP, with their mobile number pre-seeded/whitelisted.
* **Invite-Only Operations Managers**: Operations Managers are pre-authorized when the Business Owner inputs their mobile number in the Team Members tab and generates an invite link with kitchen hub binding.
* **Strict Stranger / Public Sign-Up Lockout**: Public/open registration is strictly disabled. Any unrecognized mobile number entering the login screen is immediately blocked (*"Access Denied: Mobile number not authorized"*), and no SMS OTP is dispatched.

### Session 14 — 2026-09-26: Operational Mechanics & MVP Edge-Case Decisions
* **Haversine Geofence Calculation**: Distance between Kitchen Hub and ground coordinates is calculated via straight-line Haversine formula for fast, zero-cost API geofencing.
* **Venue Delivery Serviceability Badge**: Venue Data Grid displays real-time distance and delivery status (`🟢 Deliverable (7.2 km)` vs `⚪ Out of Range (14.5 km)`) relative to the active Kitchen Hub.
* **Full Facility Cataloging vs Leather Ball Ordering Scope**: Console supports full CRUD across Leather Ball, Tennis Ball, and Practice Nets; customer app pre-ordering is enabled strictly for Leather Ball cricket grounds in MVP.
* **Inclusive Kitchen Prep Sheet & One-Click Print View**: All Confirmed (UPI Paid) orders are automatically aggregated into the Batch Prep Sheet, regardless of whether staff clicked "Accept Order", with a dedicated printable/exportable modal for physical kitchen preparation counters.
* **Printable & Shareable Invoice Receipt Modal**: Order cards provide an itemized invoice receipt modal displaying squad items, taxes, wallet credit deductions, and UPI reference IDs with print/copy support.
* **Direct Dispatch Format**: When `Direct Courier` is chosen, internal dispatch references (e.g. `DIRECT-<TIMESTAMP>` / Driver Phone) satisfy mandatory booking audit requirements without blocking delivery handoff.
* **Team-Level Wallet Entity**: In-App Soft Credits are associated directly with the **Team entity / Team Profile** created on onboarding, ensuring credits remain with the squad even if Team Managers rotate across seasons.
* **Kanban Background Polling**: Responsive Web and PWA sync order status via 15–30s interval background polling combined with a manual refresh button.

### Session 15 — 2026-09-26: Customer App (Team Manager App) PRD Scaffolding
* **Mobile-First PWA Customer App**: `apps/innings-break` scoped exclusively for the `Team Manager` to pre-order fresh in-house sports nutrition for the playing XI.
* **Dual Contacts Enforcement**: Primary (Team Manager) + Secondary (On-Field Teammate) contacts captured to guarantee delivery handoff without disrupting match play.
* **Team-Level Wallet Entity**: In-App Soft Credit wallet bound directly to the Team Entity, auto-applied to checkout subtotals.
* **Universal 1.5-Hour Rainout Cancellation Engine**: 1-tap automated self-service cancellation with 100% instant soft credit deposit to team wallet for cancellations >= 1.5h prior to match slot.
* **Active Day Gating & Daytime Match Slots**: Dynamic pre-order gating linked to active days configured in Console calendar; standardized across `6:30 AM`, `10:30 AM`, and `2:30 PM` slots.
* **5-Stage Real-Time Visual Tracker**: Live fulfillment tracking (`Confirmed` ➔ `Accepted` ➔ `Preparing` ➔ `In Transit` ➔ `Delivered`) with polling sync and digital invoice sharing to WhatsApp.

### Session 16 — 2026-09-27: CricHeroes Team Onboarding & Mobile OTP Authentication
* **CricHeroes-Backed Squad Onboarding**: First-time sign-up captures:
  1. Team Manager Full Name (Mandatory)
  2. Mobile Number (Mandatory, verified via SMS OTP)
  3. Team Name (Mandatory)
  4. CricHeroes Team Profile Link (Mandatory — verifies team legitimacy, fixtures, roster)
  5. CricHeroes Captain Profile Link (Optional — links match-day captain profile)
* **Mobile OTP Authentication Layer**: Subsequent sign-ins require strictly Mobile Number + SMS OTP (zero password friction, zero redundant re-entry).

### Session 17 — 2026-09-27: Monthly Calendar Landing & Strict Console Schedule Gating
* **Default Post-Auth Landing Screen**: Team Manager lands directly on the **Interactive Monthly Calendar View** with the active week highlighted for immediate 1-tap weekend match pre-ordering (`Saturday` / `Sunday`).
* **Active Midweek Holiday Matches**: If the active week has an operational holiday game configured/activated in the Console (e.g. Pongal, Republic Day, special tournaments), it is prominently badged and open for scheduling.
* **Advance Multi-Week Scheduling**: Team Managers can navigate forward to future weeks/months to schedule upcoming match fixtures in advance.
* **Strict Console Pre-Order Gating**: All date scheduling is 100% gated by the operational status set in the Console (non-operational days are locked/disabled with an explanatory tooltip). Unconfigured upcoming weeks safely fallback to Saturday & Sunday per Console automated fallback logic.

### Session 18 — 2026-09-27: 4-Step Quick Match Scheduling & Hierarchical Ground Search
* **4-Step Sequential Scheduling Modal**:
  1. **Field 1: Date Confirmation**: Pre-selected from the active week calendar with active operating badge.
  2. **Field 2: Unified Hierarchical Ground Search**:
     - Searches across **Area ➔ Venue ➔ Ground** hierarchy.
     - `Standalone Venue` (1 ground): Instantly loads/selects single ground details without extra clicks.
     - `Multi-Complex Venue` (multiple grounds): Expands to show all nested grounds/pitches for manager selection.
     - `Area Query`: Resolves all closest grounds within a default **20 km** proximity radius.
     - Displays live Haversine delivery serviceability (`🟢 Deliverable` vs `⚪ Out of Range`) and pre-populates gate instructions.
  3. **Field 3: Match Daytime Slots**: Standard 3 daytime slots (`6:30 AM`, `10:30 AM`, `2:30 PM`) with pre-order cutoff enforcement.
  4. **Field 4: Optional Team Squad Curation**: Optional selection of playing XI / squad from the team member roster (from CricHeroes/onboarding) for itemized player-mapped invoices. Can be skipped for bulk squad ordering.
* **Immediate Calendar Reflection**: Completed match schedule immediately reflects as an active scheduled badge on the Monthly Calendar View.

### Session 19 — 2026-09-27: Per-Item Player Assignment & 13-Player Domestic Super Subs
* **Dual Ordering Modes**:
  - **Blind Bulk Ordering**: Standard quantity steppers & squad multipliers for uniform team orders.
  - **Per-Item Player Assignment**: Expandable drawer under each recipe card rendering squad member checkboxes (`Select All` + individual players).
* **Checkbox Multi-Select UI & Auto-Sync**: Checking player boxes automatically synchronizes the item quantity to the count of selected players and binds player names to line items in the order schema.
* **Domestic Cricket Squad Sizing (Up to 13 Players)**: Accommodates Chennai weekend cricket rules permitting **2 Super Subs (Impact players)**, allowing 13-player match squads (`+1`, `+11`, `+13`, `+15`).
* **Itemized Player Breakdown on Invoices**: Digital invoice copy and WhatsApp share summaries display item-by-item player assignment lists (e.g. *"Watermelon Juice x 4 [Dinesh, Rahul, Karthik, Yogesh]"*), completely resolving on-ground distribution confusion.

### Session 20 — 2026-09-27: Multi-Match Weekend Pre-Ordering & Contextual Switcher
* **Weekend Multi-Game Scenario**: Supports teams playing multiple games in a single week (Saturday & Sunday, or double-header tournament fixtures).
* **Contextual Match Switcher Toolbar**: Renders match tabs on Menu and Cart screens (`🏏 Sat 26 Sep • 6:30 AM @ Marina Turf 1` vs `🏏 Sun 27 Sep • 10:30 AM @ St. Bedes Matting`), enabling 1-tap seamless switching.
* **Isolated Match Contexts**: Switching tabs immediately pivots date, time slot, venue/pitch, kitchen stock availability, curated match squad, and cart payload without data collision.
* **Partitioned Cart & Single UPI Checkout**: Cart groups line items cleanly by scheduled match, applies team soft credits across the combined total, and executes a single UPI transaction that generates independent match order IDs for kitchen prep sheets and dispatches.

### Session 21 — 2026-09-27: Consolidated Order Summary & Dual Delivery Contacts
* **Consolidated Order Summary Page**: Review full order logistics (match date, slot, venue/pitch, gate instructions) and itemized squad dish breakdowns with assigned player badges.
* **In-Cart Quantity Adjustments**: `+` / `-` controls directly on line items to increase, decrease, or remove dishes from the cart.
* **Seamless Back-to-Menu Navigation**: Prominent action to return to the sports menu to add additional items while preserving 100% of drafted selections and player assignments.
* **Mandatory Dual Delivery Contacts**: Captures Primary Contact (Team Manager) and Secondary Contact (On-Field Teammate / Reserve / Scorekeeper) to ensure delivery handoff never fails while the squad is actively on the pitch.

### Session 22 — 2026-09-27: Payment Failure Recovery, Orders Page & Rainout Wallet Engine
* **Payment Flow & Failure Recovery**: Hitting "Pay" executes UPI transaction; successful payment routes to Order Confirmation with verified Order ID, UPI Reference, and invoice. Payment failures route to a Payment Failed screen with a 1-tap "Retry Payment" CTA preserving 100% of drafted cart data.
* **Orders Page & Textual Status Sync**: Dedicated Orders Page listing active and past match orders. Order cards display intent-based textual fulfillment updates synchronized with Console staff actions (`Confirmed` ➔ `Accepted` ➔ `Preparing` ➔ `In Transit` ➔ `Delivered`) via lightweight polling.
* **Persistent Team Wallet Visibility**: Wallet balance (`🪙 ₹[Amount]`) is permanently visible across the app header and profile tab.
* **Self-Service Rainout Cancellation**: Team Manager can trigger 1-tap cancellation before the 1.5-hour cutoff, instantly depositing 100% soft credit into the team wallet, which automatically deducts from the cart on subsequent match orders.

### Session 23 — 2026-09-27: Dedicated Help & Support Screen & Team Credits / Wallet Refund Ledger
* **Dedicated Help & Support Screen**:
  - Contextually linked to specific match orders (`ORD-XXXXX`).
  - Allows Team Managers to log match-day issues, cancellations, or delivery feedback with category tagging (`Rainout / Weather Abandonment`, `Delayed Delivery`, `Missing / Incomplete Item`, `Food Quality / Temperature`, `Other Inquiry`).
  - Real-time resolution timeline with resolution state badges (`Open`, `In Review`, `Resolved`, `Refund Credited`).
  - Persistent long-term audit trail of all past grievances and support resolutions.
* **Dedicated Team Credits & Wallet Refund Ledger Screen**:
  - Transparent, chronological ledger of all soft credit deposits (rainouts, weather cancellations, customer support compensations) and debit redemptions (applied towards match orders).
  - Every transaction is contextually linked to its source and destination `Order ID` (e.g., `+₹1,650 [Credited for Rainout ORD-2026-0927-01]`, `-₹500 [Redeemed on Match Order ORD-2026-1004-02]`).
  - Displays running total balance (`🪙 Available Team Balance: ₹[Amount]`) matching the app header and instant checkout deduction.

### Session 24 — 2026-09-27: Squad Menu Polling & WhatsApp Link Preference Collection
* **Squad Contact Perfection**: Match squad curation ensures each curated player has their **Player Name** and a verified **10-Digit Mobile Contact Number (+91 format)**.
* **1-Tap WhatsApp Menu Polling from Menus Page**: If the Team Manager wants the squad's opinion on refreshments before placing the order, the manager triggers the "Poll Squad / Share Menu via WhatsApp" action on the Menus page.
* **Personalized Zero-Login Web Polling Links**: Generates a secure, tokenized web link per squad member (`https://inningsbreak.app/poll/{matchId}/{playerToken}`). Players tap the link from WhatsApp on their phones without creating an account or downloading an app, review the match menu for that day, select their refreshments, and submit.
* **Live Manager Dashboard & C-Day Reminders**: The Team Manager's app renders a real-time response tracker (`9 of 13 responded`) showing individual player choices (`🟢 Submitted` vs `⚪ Pending`). On cutoff days ("C-Days"), the manager can send 1-tap WhatsApp reminders to pending teammates.
* **1-Tap Auto-Sync & Import to Cart**: Aggregates all submitted player selections directly into the draft cart with per-item player assignments. The Team Manager reviews, adjusts buffer items if needed, and completes the pre-order with upfront UPI payment.

### Session 25 — 2026-09-27: Dual-Location Team Member Onboarding & Ad-Hoc Squad Management
* **One-Time Initial CricHeroes Seed**: Team member roster is populated once upon signup via the mandatory CricHeroes Team Profile link. Recurring background sync is deliberately avoided to prevent API instability and inadvertent roster overrides.
* **Dual-Location Ad-Hoc Player Addition**:
  1. **Place 1: Dedicated Team Members Management Section** (under Team Profile / Account tab):
     - View, search, and manage persistent squad roster.
     - `+ Add Team Member` action capturing Player Name, 10-Digit Mobile Number (+91), optional CricHeroes individual profile link, and playing role.
     - Edit contact numbers or archive inactive squad members.
  2. **Place 2: Contextual Match Scheduling Flow (Step 4: Squad Curation)**:
     - When curating the match squad for an upcoming fixture, Team Manager can tap `+ Add Player` directly within the modal.
     - Captures Player Name + Mobile Number and instantly checks the player into the current match squad while automatically saving them to the persistent team roster for future fixtures, WhatsApp polling, and secondary delivery contacts.

### Session 26 — 2026-09-27: Per-Week Team Manager Delegation & Tokenized Magic URL
* **Primary Team Manager vs Delegated Match-Week Manager**:
  - `Primary Team Manager`: Permanent team creator and account owner; holds permanent roster control, soft credit wallet management, and delegation authority.
  - `Delegated Match-Week Manager`: Registered team member assigned by the Primary Manager to run logistics for a specific operating week via a secure tokenized Magic Delegation URL (`https://inningsbreak.app/delegate/...`).
* **Secure WhatsApp / SMS Delegation Link**: Generates a time-bound URL dispatched via WhatsApp. Delegate opens link, validates pre-registered mobile number via SMS OTP, and receives an active session scoped strictly for that match week.
* **Full Operational Parity with Safety Guardrails**: Delegated Manager can schedule grounds, poll squad, customize menu/player mappings, and execute UPI payments (utilizing Team Wallet soft credits). Cannot transfer team ownership or revoke the Primary Manager.
* **Prominent UI Header Role Status & Instant Revocation**:
  - UI displays header pill: `👑 Delegated Manager (Week of 26 Sep) • Primary Manager: Yogesh Kumar`.
  - Primary Manager can revoke delegation access with 1 tap at any time from the Team Members section or Calendar.

### Session 27 — 2026-10-17: Backend runtime — Workers, shared D1, cron hub
* **Status**: Direction approved for T17 (issue #83). The spec text in [innings-break.md](file:///.specify/memory/innings-break.md) §3 and the [runtime spec](file:///specs/innings-break/runtime.md) is pending review. This session does not authorize API handlers, migrations, or deploys.
* **Supersedes** the Session 1 runtime: one Node.js + Express app at `apps/innings-break-api`. That directory is not created.
* **Two API Workers**, Hono on Cloudflare Workers, directories under `apps/` per AGENTS.md:
  - `ib-customer-api-<env>` at `apps/innings-break-customer-api` — authorized persona `Team Manager`.
  - `ib-console-api-<env>` at `apps/innings-break-console-api` — authorized personas `Business Owner` and `Operations Manager`.
* **One D1 database per environment**, shared by both Workers: `ib-dev`, `ib-staging`, `ib-prod`. A preview uses its own `ib-pr-<N>` and never the environment database.
* **Cron hub** at `apps/cron-hub`: one `cron-hub-<env>` Worker per environment, each with a single `* * * * *` trigger (3 triggers; Workers Free cap is 5). It calls the console API over a service binding. Hourly auto-complete runs when the UTC minute is 0. The Sunday upcoming-week lock runs at 14:00 IST (Sunday 08:30 UTC), because IST is UTC+5:30 and that instant is not minute 0. No cron on either API Worker or on preview. A yt-scheduler binding is not added; option A is still open (issue #88).
* **Sessions**: WebCrypto (`crypto.getRandomValues`, `crypto.subtle`). Node.js `crypto` is not used. Console sessions and customer sessions stay separate.
