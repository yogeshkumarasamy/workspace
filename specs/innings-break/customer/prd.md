# PRD: Innings Break Customer App (Team Manager App)

> **Status**: Draft (Initial Scaffolding for Review & Iteration)  
> **Author**: Product Manager (BMAD / SDD)  
> **Date**: 2026-09-26  
> **Scope**: `apps/innings-break` (Innings Break Customer Application)  
> **Target Persona**: `Team Manager` (Logistics Coordinator for Cricket Squads)  
> **Canonical Persona Reference**: [.specify/memory/innings-break-personas.md](file:///.specify/memory/innings-break-personas.md)  
> **System Memory Reference**: [.specify/memory/innings-break.md](file:///.specify/memory/innings-break.md)  
> **Back-Office Specification**: [specs/innings-break/console/prd.md](file:///specs/innings-break/console/prd.md)

---

## 1. Problem Statement

Every weekend across Chennai, dozens of amateur cricket teams compete in serious, 20-to-25 over leather-ball cricket matches. These matches span **5 to 6 hours** under severe coastal heat and humidity:
* **The Match Day Reality**: 20–40 min commute + First Innings (80–120 min) + **Innings Break (20–30 min)** + Second Innings (80–120 min) + Return commute.
* **The Amenities Desert**: Most cricket grounds are located in remote peripheral areas (e.g., outskirts of OMR, ECR, Porur, Vandalur, Red Hills) with zero access to fresh water, nutritious food, or hygienic sports hydration.
* **The Coordination Bottleneck**: Existing food delivery apps (Swiggy, Zomato) are designed for individual or household deliveries. In a fluid cricket squad where player rosters change weekly, individual ordering results in 60–80% delivery fee markups per item, fragmented ordering, and 8 out of 11 players skipping nutrition altogether.
* **The Health & Performance Crisis**: Amateur cricketers play intensive physical sport for 6 hours with empty stomachs and severe dehydration, leading to cramping, heat exhaustion, and poor athletic performance.

### The Solution: Innings Break Customer App
**Innings Break** is a dedicated mobile-first Progressive Web Application (PWA) built specifically for the **Team Manager**. It enables consolidated pre-ordering of fresh, in-house sports nutrition (cold-pressed juices, coconut water, boiled eggs, high-protein energy snacks, fresh fruit bowls, and wholesome porridges) delivered directly to the designated cricket pitch gate before the team takes the field or enters the innings break.

---

## 2. Target Personas & Persona Boundaries

### 2.1 Team Manager (Primary Persona)
* **Description**: The dedicated, trusted logistics coordinator for the cricket squad (could be the captain, vice-captain, team organizer, or assigned squad manager).
* **Why "Team Manager" (Not "Captain")**: In weekend amateur cricket, playing captains rotate, miss matches due to personal commitments, or focus entirely on on-field strategy. The team requires a designated logistics manager who handles supplies, finances, and squad coordination regardless of who captains on the day.
* **Goals**:
  1. Easily locate and select the match ground/venue from Chennai's directory.
  2. Collect player preferences via the team's WhatsApp group and place a single consolidated pre-order for the squad.
  3. Seamlessly pay upfront via UPI.
  4. Automatically apply Team In-App Soft Credits from previous rainouts or compensations.
  5. Provide secondary on-field contact info so delivery couriers never interrupt live play.
  6. Track real-time order prep and courier dispatch status on match morning.
  7. Cancel matches seamlessly if early morning coastal rain washes out the pitch, receiving instant 100% soft credit into the team wallet.
* **Pain Points**:
  - Hates collecting money piecemeal or paying exorbitant individual delivery fees.
  - Frustrated when delivery drivers call during the middle of an over or get lost at sprawling multi-ground complexes.
  - Worries about losing money if rain washes out the match.

### 2.2 Passive Actors (Strict Zero App Access)
* **Player**: Shares food/drink preferences in the squad's WhatsApp group. Consumes the refreshments at the ground. Has **zero app access** (no player logins, no player ordering screens).
* **Delivery Partner**: External 3rd-party courier (Dunzo, Porter, or Direct Courier). Coordinates drop-off via phone/gate notes. Has **zero app interface**.

---

## 3. User Stories & Key Requirements

### 3.1 Authentication, Team Profile & CricHeroes Team Onboarding

* **US-01**: As a Team Manager, I want to sign up with verified squad details (Team Name, CricHeroes Team link, optional Captain profile) or log in subsequently using strictly my Mobile Number and SMS OTP, so that onboarding validates our cricket team's integrity while subsequent logins remain instantaneous.
  * **Requirement (Mobile OTP Authentication Layer)**:
    - **Primary Identifier**: Mobile number (+91 Indian format) is the sole credential.
    - **SMS OTP Verification**: 4/6-digit SMS OTP verification with auto-read and 30-second resend timer to verify mobile integrity.
    - **Subsequent Sign-Ins**: For registered Team Managers, sign-in requires **strictly Mobile Number + SMS OTP** (zero password friction, zero redundant data re-entry).
    - Persistent session across mobile browsers and installed PWA.
  * **Requirement (First-Time Team Manager Sign-Up & Integrity Data Model)**:
    - When a new Team Manager signs up for the first time, the onboarding flow captures:
      1. **Team Manager Full Name** (*Mandatory* — Name of the manager coordinating logistics).
      2. **Mobile Number** (*Mandatory* — Verified via SMS OTP).
      3. **Team Name** (*Mandatory* — e.g., *"Chennai Strikers CC"*, *"Velachery Smashers"*).
      4. **CricHeroes Team Profile Link / URL** (*Mandatory* — Direct URL to the squad's public CricHeroes team page to verify team legitimacy, match fixtures, and squad roster).
      5. **CricHeroes Captain Individual Profile Link / URL** (*Optional* — Direct URL to the match-day playing captain's CricHeroes player profile).
  * **Requirement (Team-Level Entity & Soft Credit Wallet)**:
    - A dedicated **Team Entity** is instantiated upon sign-up completion containing the Team Name, CricHeroes Team Link, and Captain Link.
    - An **In-App Soft Credit Wallet** (`TeamWallet`) is bound directly to the Team Entity (rather than just the individual manager's user record).
    - If a squad rotates Team Managers across seasons, the team entity and wallet balance remain securely intact for the squad.

* **US-02**: As a Team Manager, I want to manage our Team Profile, maintain our Team Roster (via initial one-time CricHeroes seed and manual ad-hoc member additions), configure delivery contacts, and monitor our Team Soft Credit balance and order history, so that our squad logistics and player roster remain up-to-date.
  * **Requirement (Dedicated Team Profile & Account Tab)**:
    - Displays:
      - Team Name & CricHeroes Team Profile Link (clickable external badge).
      - CricHeroes Captain Profile Link (if configured).
      - Current **Team Soft Credit Wallet Balance** (₹ INR).
      - Primary Team Manager Details (Name & Mobile Number).
      - Secondary / Alternate On-Field Contacts (Pre-configurable defaults for delivery drop-off).
      - Past Match Order History with itemized invoice copies and UPI references.
  * **Requirement (Team Roster & Members Management Section — Place 1)**:
    - **Initial Roster Population**: One-time initial seed/import of team members from the CricHeroes Team Profile link provided at signup. *(Note: System does not run recurring background sync with CricHeroes to prevent API friction or accidental overwrites).*
    - **Manual Ad-Hoc Member Management**:
      - A dedicated **"Team Members / Squad Roster"** management section under the Team Profile tab.
      - Prominent **"+ Add Team Member"** button allowing the Team Manager to manually register new players (e.g., permanent squad additions, new club recruits).
      - Member Form captures:
        1. **Player Full Name** (*Mandatory*)
        2. **10-Digit Mobile Contact Number (+91 format)** (*Mandatory* — required for WhatsApp polling & delivery contact)
        3. **CricHeroes Individual Player Profile Link** (*Optional*)
        4. **Playing Role / Tag** (*Optional* — e.g., *Batter*, *Bowler*, *All-Rounder*, *Wicketkeeper*).
      - Ability to edit contact numbers or archive inactive players.

* **US-03**: As a Primary Team Manager, I want to delegate full match-week logistics management to a registered team member on a per-week basis via a secure tokenized URL and revoke it at any time, so that a co-manager can handle ground scheduling, squad polling, ordering, and payment when I am unavailable while maintaining clear role distinction.
  * **Requirement (Per-Week Delegation Assignment Flow)**:
    - In the **Team Members** management section or from the **Active Week Calendar View**, the Primary Team Manager can tap **"Delegate Match Week Management"**.
    - Manager selects:
      1. **Target Team Member**: Picked from the registered squad roster (ensures Name + verified Mobile Number exist).
      2. **Operating Match Week**: Target week selection (e.g., *Week of 26 Sep – 27 Sep 2026* or *Current Active Week*).
    - App generates a secure, time-bound **Magic Delegation URL**:
      $$\text{Delegation Link} = \text{https://inningsbreak.app/delegate/}\{\text{teamId}\}/\{\text{delegationToken}\}$$
    - **1-Tap WhatsApp / SMS Dispatch**: Pre-formats a direct invite message to the delegate's registered mobile number:
      > *"🏏 Hey [Delegate Name]! [Primary Manager Name] has delegated logistics management for [Team Name] for the week of [Week Dates]. Access the match-week manager portal here: [Delegation Link]"*
  * **Requirement (Delegated Manager Authentication & Validation)**:
    - When the delegate opens the link on their mobile device:
      - App resolves the token, identifies the pre-registered Team Member record, and validates their mobile number via SMS OTP.
      - Instantiates an active session scoped strictly as **Delegated Match-Week Manager** for the assigned match week(s).
  * **Requirement (Delegated Manager Permissions & Scope of Access)**:
    - For their assigned match week, the Delegated Match-Week Manager holds full operational parity:
      - Complete 4-Step Match Quick Scheduling & Ground Hierarchy Search.
      - Match Squad Curation & Inline Guest Player Addition.
      - Trigger WhatsApp Squad Menu Polling links and send C-day reminders.
      - Customize sports nutrition menu items & Per-Item Player Assignments.
      - Configure dual delivery contacts and execute UPI payments (utilizing the Team Soft Credit Wallet).
      - Track textual fulfillment updates and coordinate courier drop-off.
    - **Strict Security Boundaries**:
      - Delegated Manager *cannot* transfer permanent team ownership, edit the Primary Team Manager's profile, or revoke the Primary Manager.
      - Access automatically expires once the delegated match week concludes.
  * **Requirement (Clear UI Role Distinction & Status Badges)**:
    - When accessed by a Delegated Manager, the app renders a prominent top persistent header banner:
      `👑 Delegated Manager (Week of 26 Sep) • Primary Manager: [Primary Manager Name]`
    - Primary Manager's dashboard displays active delegations with an instant **"Revoke Access"** button to cancel delegation on demand.

---

### 3.2 Post-Login Landing: Monthly Calendar View, Active Week Selection & Schedule Gating

* **US-04**: As a Team Manager, upon successful sign-up or login, I want to land directly on an Interactive Monthly Calendar View with the current active operating week pre-selected, so that I can immediately schedule my squad's upcoming weekend game, schedule active midweek holiday matches, or plan future upcoming weeks in advance—strictly governed by the Console app's operational availability.
  * **Requirement (Default Post-Auth Landing Screen)**:
    - Immediately upon completing sign-up or logging in via OTP, the Team Manager lands on the **Interactive Monthly Calendar View** as the primary home screen.
    - Top header provides month navigation (`< Previous Month`, `Current Month`, `Next Month >`).
    - The calendar renders a responsive 7-column layout (**Monday through Sunday**) with the **Current Active Week** prominently highlighted in an active focus card/row for instant 1-tap scheduling.
  * **Requirement (Active Week Quick Scheduling & Weekend Focus)**:
    - By default, the active operating week highlights the upcoming **Saturday** and **Sunday** match days with active badges and pre-order indicators.
    - Team Manager can tap either Saturday or Sunday to open the **Match Scheduling Modal / Page**.
  * **Requirement (Midweek Holiday Match Scheduling)**:
    - If the active week qualifies for a midweek holiday game (e.g., *Pongal*, *Republic Day*, *Diwali*, *May Day*, or special league tournament dates configured and activated in the Console):
      - The holiday date is prominently badged (e.g., `🎉 Pongal Match Special — Open for Pre-Orders`).
      - Team Manager can select and schedule team refreshments for the holiday game exactly like a weekend match.
  * **Requirement (Future Upcoming Weeks & Advance Month Scheduling)**:
    - Team Managers can scroll or navigate to future weeks within the active month or jump to upcoming months.
    - Allows advance match scheduling and refreshment booking for upcoming tournament leagues or multi-week fixtures.
  * **Requirement (Strict Console Availability Gating & Stranger Day Lockout)**:
    - **Absolute System Constraint**: Pre-order scheduling is strictly and dynamically gated by the operational status configured in the **Innings Break Console** ([specs/innings-break/console/prd.md](file:///specs/innings-break/console/prd.md) US-08 / US-09).
    - **Active Operational Days** (`🟢 Active` in Console): Enabled, selectable, and interactive.
    - **Non-Operational / Closed Days** (`⚪ Closed` in Console): Visually greyed out, locked, and non-clickable. Tapping displays a clear tooltip/toast (*"Kitchen Hub closed on this date. Pre-orders not accepted."*).
    - **Automated Fallback Synchronization**: Future unconfigured weeks automatically reflect the standard Saturday & Sunday availability established by the Console's Sunday 2:00 PM automated fallback engine.
  * **Requirement (Real-Time Calendar Reflection of Scheduled Matches)**:
    - Upon completing match scheduling, the date cell on the Monthly Calendar View immediately updates with a distinct visual indicator/pill (e.g., `🏏 Scheduled: vs Velachery CC @ Marina Turf 1 [6:30 AM]`), allowing the Team Manager to visually track all upcoming scheduled match fixtures.

---

### 3.3 Match Scheduling Flow: Hierarchical Ground Search, Slots & Optional Squad Curation

* **US-05**: As a Team Manager, when scheduling a match for an active date, I want a streamlined 4-step scheduling interface (Date Selection ➔ Hierarchical Ground Search ➔ Match Daytime Slot ➔ Optional Team Squad Curation), so that I can configure my match logistics and venue precision in under 60 seconds.

  * **Step 1: Date Confirmation (Field 1)**:
    - The match date is pre-populated based on the selected date from the calendar.
    - Visual badge indicates operating status (`Active Weekend` / `Active Midweek Holiday`).

  * **Step 2: Unified Hierarchical Ground & Venue Search (Field 2)**:
    - A single smart search bar allowing the Team Manager to search across the **Area ➔ Venue ➔ Ground** hierarchy:
      1. **Direct Venue Match**:
         - **`Standalone Venue`** (Venue with a single pitch): Instantly selects and loads that ground's details with zero extra clicks.
         - **`Multi-Complex Venue`** (Venue housing multiple pitches/turfs): Automatically expands and presents all nested grounds inside (e.g., *Ground #1 Centre Turf*, *Ground #2 South Matting*) for the Team Manager to pick the specific playing ground.
      2. **Area / Locality Match**:
         - When searching an area name (e.g., *Velachery*, *OMR*, *Porur*), the system returns all closest grounds in proximity within **20 km** by default, allowing the manager to pick the venue and pitch.
      3. **Direct Ground Name Match**:
         - Searching specific ground keywords instantly resolves to the matching pitch and its parent venue.
    - **Delivery Serviceability Indicator**: Live Haversine distance indicator against the active Kitchen Hub (`🟢 Deliverable (7.2 km)` vs `⚪ Out of Range (> 10 km)`).
    - **Leather Ball Ground Scope**: Pre-ordering is active strictly for **Leather Ball Cricket Grounds** (`Turf Wicket` and `Matting Wicket`). Tennis ball grounds or practice nets show an informational tag (*"Leather Ball Match Orders Only for MVP"*).
    - **Delivery Gate Instructions**: Pre-loads default gate instructions from the Console with an input field for optional custom notes (e.g., *"Pavilion tent on 3rd man boundary"*).

  * **Step 3: Match Daytime Slot Selection (Field 3)**:
    - Team Manager selects from the 3 standardized daytime match slots:
      - **`6:30 AM Slot`** (Early Morning Match — Refreshments delivered for match start / innings break).
      - **`10:30 AM Slot`** (Midday Match — Post-match recovery meals & cold-pressed electrolytes).
      - **`2:30 PM Slot`** (Afternoon Match — Pre-match hydration & evening energy packs).
    - Strictly enforces pre-order cutoff windows (locks slot once cutoff passes).

  * **Step 4: Optional Team Squad Selection & Ad-Hoc Player Addition (Field 4 — Place 2)**:
    - Team Manager is presented with an optional step: **"Curate Team Squad for this Match?"**:
      - **Purpose**: Enables itemized player-mapped order breakdown on the invoice, WhatsApp squad sharing, and personalized WhatsApp squad menu polling.
      - **Roster Selection**: Presents a searchable checklist of all existing team members from the persistent Team Roster. Manager checks off the playing XI / squad members for this specific match date.
      - **Contextual Inline Ad-Hoc Player Addition ("+ Add New / Guest Player")**:
        - If the squad has recruited a guest player or a new teammate on loan for this weekend's game who is not yet in the roster:
        - Manager taps **"+ Add Player"** directly inside the squad curation drawer/modal (without exiting or losing scheduling progress).
        - Prompts for **Player Full Name** (*Mandatory*) and **10-Digit Mobile Number (+91)** (*Mandatory*).
        - Automatically checks the player into the current match squad AND persists them into the main Team Roster for future match selection and management.
      - **If Skipped / Opted Out**: Manager bypasses individual player tagging and proceeds directly to consolidated squad ordering.
    - Clicking **"Confirm Schedule & Browse Menu"** completes the scheduling step, immediately tags the date on the calendar, and transitions to the Sports Nutrition Menu.


### 3.4 Multi-Match Weekend Pre-Ordering & Contextual Match Switcher

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

---

### 3.5 Menu Browsing, In-House Sports Nutrition & Per-Item Player Assignment

* **US-07**: As a Team Manager, I want to browse freshly prepared in-house sports nutrition items with nutritional facts and dietary tags, so that I can choose wholesome refreshments tailored for my players.
  * **Requirement (In-House Sports Nutrition Catalog)**:
    - Organized across 5 standardized categories:
      1. **Beverages & Hydration**: Cold-Pressed Juices (Watermelon, Pomegranate, Orange), Tender Coconut Water, Lemon-Mint Electrolyte Coolers.
      2. **Fresh Cut Fruit Bowls**: Hydrating seasonal fruits (Papaya, Watermelon, Pineapple, Muskmelon).
      3. **High Protein Power Snacks**: Boiled Egg Duos with crushed pepper, Sprouts & Peanut chaat, Paneer protein cubes.
      4. **Energy Bites & Fuel**: Dates & nut energy balls, Roasted chana, Banana bundles.
      5. **Team Meals & Porridges**: Fresh Millet / Ragi porridge (Koozh), Curd Rice with pomegranate, Whole-Wheat veggie rolls.
  * **Requirement (Nutritional Breakdown & Dietary Badges)**:
    - Each item card displays:
      - High-resolution photo and item name.
      - Dietary Flag: `🟢 Veg`, `🔴 Non-Veg`, `🟡 Egg`.
      - Nutritional Badges: Calories (kcal), Protein (g), Carbohydrates (g), Electrolytes.
      - Kitchen Prep Notes: 100% freshly prepared in-house; zero refined sugars.
      - Unit Price (₹ INR).
      - Kitchen Hub Stock Badge (`In Stock` vs `Sold Out`).

* **US-08**: As a Team Manager, I want the flexibility to either place a blind bulk squad order or assign specific players from our match squad to individual recipes via a multi-select checkbox interface (supporting 11 players up to 13 players with domestic Super Subs), so that choosy player preferences are tracked effortlessly and there is zero post-match confusion over who ordered what at the ground.
  * **Requirement (Dual Ordering Modes: Blind Bulk vs Per-Item Player Assignment)**:
    - **Mode A: Blind Bulk Ordering**:
      - For managers placing a uniform squad order (e.g., 11 juices and 11 porridges for everyone).
      - Manager uses standard quantity steppers (`+` / `-`) or Smart Squad Multiplier buttons.
    - **Mode B: Per-Item Player Assignment (Granular Squad Mapping)**:
      - For squads with specific individual player dietary preferences (e.g., 4 players want Watermelon Juice, 3 want Ragi Porridge, 4 want Boiled Eggs, 2 want Tender Coconut).
      - Underneath each menu recipe card, an expandable **"Assign Squad Members"** drawer/panel displays all curated players from the match squad with individual checkboxes.
  * **Requirement (Checkbox Multi-Select UI & Auto-Quantity Synchronization)**:
    - Displays:
      - **"Select All Squad"** master checkbox (1-tap selects all curated players).
      - **Individual Player Checkbox List** (displays player names from the curated squad).
    - Tapping checkboxes instantly updates the item's order quantity to match the exact number of checked players:
      $$\text{Item Quantity} = \text{Count of Checked Players}$$
    - Selected player names are attached to the line item in the order schema (e.g., `item_id: "watermelon-juice", assigned_players: ["Dinesh", "Rahul", "Karthik", "Yogesh"]`).
  * **Requirement (Domestic Cricket Squad Sizing — Up to 13 Players with 2 Super Subs)**:
    - While traditional cricket is 11 players, Chennai domestic cricket leagues routinely permit **2 Super Subs (Impact players / tactical substitutes)**, allowing squads of **up to 13 players** (or up to 15 with full bench reserves).
    - Quick Squad Multiplier shortcuts:
      - **`+1`** (Individual unit)
      - **`+11 (Traditional XI)`** (Full Playing 11)
      - **`+13 (XI + 2 Super Subs)`** (Standard domestic cricket match squad)
      - **`+15 (Squad + Reserves)`** (Complete touring squad)
    - Dynamic Bundles (Team Packs) can also be assigned across the full 11 or 13-player squad with 1 tap.
  * **Requirement (Itemized Squad Accountability on Digital Invoice & WhatsApp Share)**:
    - All assigned player mappings are permanently recorded on the placed order.
    - The digital invoice copy and the **"Share to WhatsApp"** text explicitly itemize player assignments per dish (e.g., *"Cold-Pressed Watermelon Juice x 4 [Dinesh, Rahul, Karthik, Yogesh]"*), completely eliminating manager guesswork during on-ground distribution.

---

### 3.6 Squad Menu Polling & WhatsApp Link Preference Collection (Pre-Order Squad Collaboration)

* **US-09**: As a Team Manager, after scheduling an upcoming game with our match squad, if I am unsure about menu preferences and want the squad's opinion before placing the order, I want an option from the Menus page to trigger personalized WhatsApp polling links to each squad member's verified contact number, so that each player can review the available match-day menu on a lightweight web page, submit their desired refreshments, notify me of their selections, and allow me to review, ensure completion, and lock our team pre-order.
  * **Requirement (Triggering Squad Polling from Menus Page)**:
    - On the Sports Nutrition Menus page for any scheduled match, a dedicated action is available: **"📱 Poll Squad / Share Menu via WhatsApp"**.
    - **Prerequisite Validation**: The app verifies that each player in the curated match squad has a valid **Player Name** and a valid **10-digit Mobile Contact Number (+91 format)**. If any contact is missing or invalid, an inline prompt highlights the missing fields for the manager to complete.
  * **Requirement (Personalized Player Web Polling Links & Secure Tokens)**:
    - The system generates a unique, personalized lightweight web polling link for each curated squad member:
      $$\text{Polling Link} = \text{https://inningsbreak.app/poll/}\{\text{matchScheduleId}\}/\{\text{playerToken}\}$$
    - Offers two sharing modes:
      1. **Individual WhatsApp Direct Share / SMS Dispatch**: 1-tap triggers WhatsApp message per player pre-formatted with their personalized link:
         > *"🏏 Hey [Player Name]! Select your refreshments for our upcoming match on [Match Date] @ [Ground Venue] ([Time Slot]): [Personalized Link]. Please submit your choice before [Cutoff Time] so I can lock our team pre-order! — [Manager Name]"*
      2. **Squad Group WhatsApp Broadcast Link**: A unified squad poll link for posting directly in the team's WhatsApp group where squad members click and select their name to submit their choices.
  * **Requirement (Lightweight Player Polling Web Experience — Zero Login, Zero App Install)**:
    - When a player taps their link on mobile:
      - Renders an ultra-fast, responsive web interface (zero account creation, zero login, zero app install).
      - Displays the match header (Date, Daytime Slot, Ground Venue, Pitch Name, Team Name).
      - Displays the live sports nutrition menu available for that match date and kitchen hub across all categories (Beverages, Fruit Bowls, Protein Snacks, Energy Bites, Team Meals).
      - Player selects their desired items & quantities.
      - Player taps **"Submit My Match Refreshment Choice"**.
      - Renders a clean confirmation screen (*"Thanks [Player Name]! Your refreshment choice has been sent to [Team Manager Name] for team ordering."*).
  * **Requirement (Real-Time Squad Polling Dashboard & Manager Notifications)**:
    - On the Team Manager's Menus page and match dashboard, an interactive **Squad Poll Tracker** panel renders live response metrics:
      - Progress Pill: *"📊 9 of 13 players have submitted preferences"*.
      - Real-Time Player Status List:
        - `🟢 Dinesh Kumar: Cold-Pressed Watermelon Juice x 1, Boiled Egg Duo x 1 [Submitted 08:30 PM]`
        - `🟢 Rahul S: Tender Coconut Water x 1, High Protein Ragi Porridge x 1 [Submitted 08:42 PM]`
        - `⚪ Ashwin R: Pending Selection [📱 Send WhatsApp Reminder]`
      - **Managerial Follow-Up on Cutoff Days ("C-Days")**: The Team Manager can tap 1-click **"Send WhatsApp Reminder"** to prompt pending teammates before the kitchen pre-order cutoff.
  * **Requirement (1-Tap Auto-Sync & Import to Order Draft)**:
    - Once the squad selections are collected (or at any time before cutoff):
      - Team Manager taps **"Import Squad Selections into Cart"**.
      - The system automatically aggregates all player selections into the menu order, binding each player's name directly to their respective dish line items (Per-Item Player Assignment).
      - Team Manager can make final managerial adjustments (e.g., adding extra electrolyte coolers or coconut water for reserves), review the consolidated cart, configure delivery contacts, and execute upfront UPI payment.

---

### 3.7 Consolidated Order Summary, Cart Adjustments & Dual Delivery Contacts

* **US-10**: As a Team Manager, upon completing my menu selections, I want to navigate to a Consolidated Order Summary (Cart) page to review all selected items, manually adjust quantities, seamlessly return to the menu to add more items, configure a Secondary On-Field Teammate contact for courier handoff, and view an automated Soft Credit deduction breakdown before payment.
  * **Requirement (View Cart Navigation & Consolidated Order Summary Page)**:
    - On the Menu screen, a prominent floating/bottom bar displays: **"View Cart ([X] Items • ₹[Subtotal]) ➔"**.
    - Clicking takes the Team Manager to the **Consolidated Order Summary** page.
    - Displays:
      - **Match Logistics Header**: Target Match Date, Daytime Slot (`6:30 AM` / `10:30 AM` / `2:30 PM`), Ground Venue, Pitch Name, and Kitchen Hub serving the order.
      - **Itemized Squad Order List**: Item thumbnail, Item Name, Category, Dietary Badge (`Veg`/`Non-Veg`/`Egg`), Assigned Player Names (e.g., *Assigned: Dinesh, Rahul, Karthik*), Unit Price (₹), and Line Subtotal (₹).
  * **Requirement (In-Cart Item Adjustments & Seamless Back-Navigation)**:
    - **In-Cart Quantity Adjustments**: Each line item includes `+` / `-` controls to increase, reduce quantity, or delete the item directly from the summary.
    - **Back-to-Menu Navigation**: Prominent **"← Add More Items / Back to Menu"** button returns the manager to the sports nutrition catalog with all existing cart selections, quantities, and player assignments completely preserved.
  * **Requirement (Dual Delivery Contacts Capture for On-Field Handoff)**:
    - To guarantee reliable delivery handoff without disrupting live cricket matches, the order summary captures two verified contacts:
      1. **Primary Contact**: Team Manager Name & Mobile Number (Pre-filled from auth profile, editable).
      2. **Secondary On-Field Teammate Contact** (*Mandatory*): Option to select a teammate from the squad roster dropdown or enter a new contact (Full Name & Mobile Number) (e.g., vice-captain, reserve player, or scorekeeper stationed at the pavilion dugout).
      3. **Delivery Gate & Pavilion Notes**: Pre-populates venue entrance notes with an editable field for specific dugout instructions (e.g., *"East pavilion near score box"*).
  * **Requirement (Automated Soft Credit Application & Transparent Billing Breakdown)**:
    - System checks the `TeamWallet` balance bound to the Team Entity.
    - If `WalletBalance > 0`:
      - Automatically applies soft credit up to the cart total:
        $$\text{Applied Credit} = \min(\text{WalletBalance}, \text{OrderTotal})$$
        $$\text{Payable UPI Amount} = \text{OrderTotal} - \text{Applied Credit}$$
      - Displays itemized billing breakdown:
        - Order Subtotal: ₹1,100 (or partitioned subtotals for multi-match orders)
        - Applied Team Soft Credit: -₹500 (Remaining Wallet Balance: ₹0)
        - **Final Payable UPI Amount**: **₹600**
    - If `WalletBalance >= OrderTotal`:
      - Payable UPI Amount is ₹0. Order confirms instantly with 1 click using 100% wallet credits without launching UPI gateways.

---

### 3.8 Upfront UPI Payment, Confirmation & Payment Failure Recovery

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

---

### 3.9 Orders Page: Order History, Textual Status Sync & Digital Invoices

* **US-12**: As a Team Manager, I want a dedicated Orders Page to view all my active and historical orders, monitor textual fulfillment updates synchronized with the Console, access digital invoices, and manage match actions.
  * **Requirement (Dedicated Orders Page / History View)**:
    - Easily accessible via the primary bottom navigation bar (**"Orders"** tab).
    - Chronologically lists all match orders with distinct tabs: **"Active Orders"** (Upcoming match days) and **"Past Matches"** (Completed / Cancelled history).
  * **Requirement (Order Card Visual Anatomy)**:
    - Each Order Card displays:
      - **Order ID & Booking Timestamp**
      - **Match Date & Daytime Slot Badge** (`⏰ 6:30 AM`, `⏰ 10:30 AM`, `⏰ 2:30 PM`)
      - **Ground Venue & Specific Pitch/Facility** (e.g., *Marina Cricket Arena — Ground #1 Turf*)
      - **Itemized Recipe Summary**: Quantities, bundle names, and assigned player name tags.
      - **Paid Amount (₹)** with UPI Reference ID.
      - **Dual Delivery Contacts**: Primary Manager + Secondary On-Field Teammate phone numbers.
  * **Requirement (Textual Status Updates Synchronized with Console)**:
    - Displays clean, intent-based **Textual Delivery & Fulfillment Status** reflecting real-time progress updated by the Business Owner or Operations Manager in the Console:
      1. `🟢 Confirmed (UPI Paid)` — Pre-order locked for match day.
      2. `🔵 Accepted by Kitchen Hub` — Kitchen hub acknowledged batch prep.
      3. `🟡 Preparing in Kitchen` — Morning batch cooking & packaging active.
      4. `🟣 In Transit` — Dispatched with courier (displays Courier Partner, Driver Phone, 3rd-Party Tracking ID, and ETA).
      5. `🟢 Delivered` — Food safely dropped off at the pavilion/gate.
      6. `🔴 Cancelled (Rainout / Refunded)` — Match called off and soft credits deposited.
    - Status syncs via lightweight background polling (15–30s interval) and a prominent **"Refresh Status"** action. *(Note: Pure textual confirmation reflecting staff updates, without unnecessary heavy GPS map tracking).*
  * **Requirement (Itemized Digital Invoice Modal & WhatsApp Share)**:
    - Each order card provides a **"View Invoice"** button opening an itemized digital receipt with print support and 1-click **"Share to WhatsApp"** for pasting squad refreshment distribution into the team group.

---

### 3.10 Early Rainout Cancellation Engine ($\ge 1.5\text{h}$) & Persistent Team Wallet

* **US-13**: As a Team Manager, I want permanent visibility of our Team Wallet balance across the app, and the ability to cancel an order before the cutoff window if morning rain washes out our game, so that 100% of our order value is refunded as in-app soft credits and automatically redeemed on our next match order.
  * **Requirement (Persistent Team Wallet Visibility Across the App)**:
    - The **Team Soft Credit Wallet Balance (₹ INR)** is permanently visible to the Team Manager at all times:
      - **Top Header Bar**: Persistent wallet pill/badge (e.g., `🪙 ₹500 Team Credit`) visible on Calendar, Menu, Orders, and Profile screens.
      - **Team Profile Tab**: Detailed wallet ledger showing credit deposits (rainouts/grievances), redemptions, and timestamps.
  * **Requirement (Universal 1.5-Hour Automated Rainout Cancellation Cutoff)**:
    - In accordance with the system-wide cancellation engine ([specs/innings-break/console/prd.md](file:///specs/innings-break/console/prd.md) US-23):
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

---

### 3.11 Dedicated Help & Support Screen & Order-Linked Grievance Tracking

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

---

### 3.12 Dedicated Team Credits & Wallet Refund Ledger (Order-Linked Financial History)

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

---

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
