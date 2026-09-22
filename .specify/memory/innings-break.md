# Innings Break Project Memory

> **Purpose**: High-level vision, domain knowledge, and product concept for the Innings Break ecosystem.

---

## 1. Problem Statement

Domestic cricket is massively popular in Chennai. Every weekend, dozens of teams play across grounds scattered throughout the city. Many of these grounds are in **remote locations** with little to no access to basic amenities — water, refreshments, food, or beverages.

**The pain:**
* Players spend hours in the **scorching Chennai sun** without proper hydration or nutrition.
* Well-organized teams with disciplined captains plan ahead and arrange supplies, but **most teams don't**.
* Players end up **skipping meals and drinks** entirely during match day. They either grab something during the commute home, or skip altogether and eat only once they reach home.
* This is a **health, wellbeing, and performance problem** for amateur cricketers who are otherwise deeply passionate about the game.

**The time commitment is massive.** These are leather ball cricket matches — serious, competitive games of 20 or 25 overs per side:
* Grounds are typically **20–40 minutes away** from where players live.
* A 20-over innings takes roughly **80 minutes**; a 25-over innings takes roughly **120 minutes**.
* Cricket is a **two-innings game** with an **innings break** in between.
* Add it all up — commute + first innings + innings break + second innings + commute back — and a player's match day spans **5 to 6 hours**.
* Going that entire duration without a proper meal, hydration, or refreshments — while playing an intense physical sport in Chennai heat — is a serious problem.

**Key insight:** The problem isn't logistics — there are plenty of options to deliver food and beverages in Chennai. The real blocker is **team coordination**. No existing solution addresses the problem of feeding players as a *team unit*. Individual apps exist, but solving refreshments for a player *within a team environment* — where the group is fluid, loosely organized, and no one takes ownership of the collective need — is the actual unsolved problem.

### Why Not Swiggy / Zomato?

Apps like Swiggy and Zomato have strong coverage across Chennai, so why build another app? Because the problem is **coordination and economics**, not just delivery:

1. **Teams are rarely a fixed group.** Very few domestic teams have a stable playing XI. Most teams pull in external players — posting ads for match requirements, borrowing players from neighboring teams, arranging last-minute replacements. The 11 who show up on match day aren't necessarily a tight-knit group with shared habits.

2. **Fragmented, uncoordinated ordering.** In practice, maybe 4 out of 11 players who know each other well might coordinate a personal Swiggy order. The rest — especially external or ad-hoc players — are left out entirely. There's no single point of coordination for the whole team's refreshment needs.

3. **Individual delivery costs are prohibitive.** A single watermelon juice costs ₹80 on Swiggy, but the delivery fee adds another ₹60–80 — that's a **60–80% markup** just for delivery. Total: ₹140–160 for one juice. At that price, most players simply skip it.

4. **No team-level thinking.** Existing food apps are designed for individuals or households. They don't understand the concept of a team, a playing XI, a match day, or a ground location. There's no way to consolidate an order for 11 people and split costs effectively.

### The Innings Break Differentiator

**Innings Break does not accept individual orders. The unit of ordering is the team.**

* When you order for 11 people at once, the delivery cost is **amortized across the group** — making per-person cost minimal.
* A juice that costs ₹140+ individually on Swiggy can be offered at near base price (~₹80 or less) per person through Innings Break.
* This model **strengthens team bonding** — everyone eats and drinks together, no one is left out, and the team manager takes care of his squad.
* It creates a natural **coordination point** that doesn't exist today, even for loosely assembled teams.

---

## 2. Solution Concept

**Innings Break** is a **team-level pre-order and delivery platform** that enables cricket team managers to order refreshments (water, food, beverages, snacks) for their entire playing XI **before game day**, with delivery to the ground.

**How it works:**
1. The team manager knows the **playing XI** for the upcoming weekend match.
2. He collects **preferences from players** via their existing WhatsApp group.
3. He opens **Innings Break**, sees his team roster, and **places a single consolidated order** for the entire team — choosing from the available menu of refreshments, food, and beverages.
4. The order is placed **the day before the match** (pre-order model).
5. The team manager **pays upfront via UPI** — payment confirmation triggers the order.
6. On match day, the order is **delivered to the ground**.
7. The team manager can **track order status** (confirmed, in transit, delivered, etc.).

**Core business model:** No individual orders. Team-level bulk ordering absorbs delivery costs and passes savings to players.

**Revenue model:** Per team order — the margin is built into the item pricing.

**Payment model:**
* **Upfront payment required.** No COD, no post-delivery payment. No payment = no order.
* **UPI only** — the sole payment method, keeping it simple and aligned with how players already transact.
* **Integration strategy:** Open-source or zero-cost UPI payment integration to avoid gateway fees on the business side.

**Geographic scope:** Chennai only (for now). May expand to other cities later.

**Timing scope:** Weekends (when domestic cricket matches happen).

---

## 3. Ecosystem Components

### 3.1 Innings Break
* **Directory**: `apps/innings-break`
* **Primary user**: Team Manager
* **Format**: Responsive Web & PWA (mobile-first experience for Team Managers)
* **Core functions**:
  - **Ground selection**: Search and select the match ground (by area/proximity) along with the match date
  - **Menu browsing**: Browse available refreshments, food, and beverages
  - **Team ordering**: Place a single consolidated pre-order for the entire playing XI
  - **Payment**: Pay upfront via UPI to confirm the order
  - **Order tracking**: Track order status (confirmed, in transit, delivered, etc.)
* **Order flow**: Team Manager logs in → selects ground + date → team details loaded → selects items → pays via UPI → order confirmed

### 3.2 Innings Break Console
* **Directory**: `apps/innings-break-console`
* **Primary users**: Business Owner (Full Access) & Operations Manager (Order Fulfillment & Dispatch Staff)
* **Format**: Responsive Web & PWA (desktop & mobile friendly)
* **Core functions**:
  - **Ground management**: Create and manage playing grounds, organized by City → Area → Ground hierarchy
  - **Menu configuration**: Configure what food, beverages, refreshments, and recipes are offered
  - **Team Member management**: Business Owner onboards and manages Operations Managers (generates sign-up invite links)
  - **Order management**: View and manage incoming orders from team managers
  - **Order fulfillment**: Update order status (confirmed → preparing → in transit → delivered)
  - **Delivery dispatch**: Coordinate and record third-party courier dispatches

### 3.3 Innings Break API
* **Directory**: `apps/innings-break-api`
* **Stack**: Node.js + Express (REST APIs)
* **Core function**: Backend service layer supporting both Innings Break and Innings Break Console

### 3.4 Platform & Delivery Strategy (Responsive Web & PWA)
* **Browser-First Architecture**: Both client-facing apps (**Innings Break** and **Innings Break Console**) are built as responsive web applications, accessible via browser URLs without platform gating.
* **PWA (Progressive Web App)**: Full PWA support (web app manifest, service workers) enables users (Team Managers, Business Owner, and Operations Managers) to "Install / Add to Home Screen" for instant, single-tap access.
* **Native Apps Deferred**: No native iOS/Android development for MVP / Iteration 1. PWA provides the native feel with zero app store deployment overhead.

---

## 4. Grounds & Location Management

> Without a ground, there's no delivery destination — this is core to the platform.

* Chennai has a huge canvas of playing grounds. Ground organizers are actively finding new grounds, so the count increases frequently.
* Grounds are added dynamically by the Business Owner via **Innings Break Console** as new ones are discovered.
* The Team Manager searches and selects a ground in **Innings Break** when placing an order.

**Location hierarchy:**
```
City (e.g., Chennai)
 └── Area (e.g., Velachery, Tambaram, Porur)
      └── Ground (e.g., "ABC Cricket Ground", "XYZ Turf")
```

---

## 5. Personas — ✅ DECIDED

### 5.1 Team Manager (Innings Break User)
* **Who**: A dedicated person responsible for managing the team's logistics — could be the captain himself, or someone the captain assigns (e.g., a vice-captain, a friend, or any trusted team member).
* **Why not "Captain"?** In weekend domestic cricket, the captain isn't always present for every match. Teams need a stable person who handles coordination regardless of who's captaining on the day.
* **App access**: Full access to **Innings Break**. Logs in, sees his team, browses the menu, selects a ground, places orders for the entire playing XI, and pays via UPI.
* **Coordination**: Collects player preferences via the team's **WhatsApp group**, then consolidates and places the order himself. Players do not interact with the app.
* **Scope**: One team manager per team.
* **Future consideration**: Could be extended to allow additional roles to place orders, based on feedback.

### 5.2 Business Owner (Innings Break Console Super-User)
* **Who**: The Innings Break business owner — the entrepreneur who owns and oversees the entire operation.
* **App access**: Full access to **Innings Break Console**.
* **Responsibilities**:
  - **Grounds**: Creates and maintains the ground directory (City → Area → Ground hierarchy).
  - **Kitchen**: Manages the kitchen directly — no external vendors. All food and beverages are prepared in-house.
  - **Menu**: Configures what items are offered (recipes, beverages, refreshments, food).
  - **Team Members**: Onboards, oversees, and manages console Operations Managers (generates invite links).
  - **Orders & Fulfillment**: Oversees all incoming orders and delivery dispatches.

### 5.3 Operations Manager (Innings Break Console Staff User)
* **Who**: Operations and kitchen staff deployed by the Business Owner to manage day-to-day order fulfillment.
* **App access**: Staff access to **Innings Break Console** (restricted from Team Members / Owner Settings).
* **Responsibilities**:
  - **Order Queue**: Views incoming team pre-orders and kitchen prep requirements.
  - **Order Fulfillment**: Advances order lifecycle stages (`Confirmed` → `Preparing` → `In Transit` → `Delivered`).
  - **Delivery Dispatch**: Coordinates with third-party delivery partners (Dunzo, Porter) and logs tracking details.

### 5.4 Player (Passive — No App Access)
* **Who**: Team members in the playing XI.
* **App access**: **None.** Players do not use Innings Break.
* **Role**: Share their food/drink preferences with the team manager via WhatsApp. The team manager handles everything from there.
* **Future consideration**: Players may eventually get app access to submit preferences directly, but this is explicitly out of scope for now.

### 5.5 Delivery (Third-Party — No App Interface)
* **Who**: On-demand delivery partners from third-party apps (e.g., Dunzo, Porter, etc.).
* **App access**: **None.** Delivery partners do not use any Innings Break interface.
* **How it works**: The Business Owner or Operations Manager books a delivery via the third-party app, hands off the prepared order, and the delivery partner brings it to the ground.
* **Implication**: Innings Break does **not** need to build a delivery-facing app or driver interface. Delivery tracking is based on what the Business Owner or Operations Manager manually updates in Innings Break Console.

---

## 6. Brain Dump & Evolution Notes

*Raw notes and decision log from ongoing discussions. Features will be carved out into `specs/innings-break/` as they mature.*

### Session 1 — 2026-09-20: Core Concept & Foundations
* **Problem framed**: Chennai domestic cricket, weekends, remote grounds, no refreshments, 5–6 hour match days.
* **Core blocker identified**: Team coordination, not logistics. Swiggy/Zomato exist but don't solve team-level ordering.
* **Business model decided**: Team = minimum order unit. No individual orders. Bulk delivery absorbs cost. Margin built into item pricing.
* **Payment decided**: Upfront UPI-only. No payment = no order. Zero-cost UPI integration preferred.
* **Personas locked in**: Team Manager (Innings Break), Player (passive/WhatsApp), Business Owner (Innings Break Console), Delivery (third-party).
* **Ground management scoped**: City → Area → Ground hierarchy. Business Owner manages in Console. Team Manager selects in Innings Break.
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
* **Universal 1.5-Hour Cancellation Cutoff**: Team Managers can initiate rainout cancellations up to 1.5 hours (90 minutes) prior to match slot time (5:00 AM for 6:30 AM slot, 9:00 AM for 10:30 AM slot, 1:00 PM for 2:30 PM slot), preventing kitchen prep and food waste. Cancellations < 1.5h require manual support review.
* **In-App Soft Credits Model**: Zero cash/bank refunds. All rainouts, quality grievances, and missing item compensations are issued as In-App Match Credits (₹) directly into customer wallets, automatically deducted on their next order.
* **Support & Quality Grievances Tab**: Dedicated console tab for staff to manually investigate and resolve post-delivery quality complaints and issue soft credits.






