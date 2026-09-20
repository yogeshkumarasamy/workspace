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
* **Directory**: `apps/innings-break-web`
* **Primary user**: Team Manager
* **Core functions**:
  - **Ground selection**: Search and select the match ground (by area/proximity) along with the match date
  - **Menu browsing**: Browse available refreshments, food, and beverages
  - **Team ordering**: Place a single consolidated pre-order for the entire playing XI
  - **Payment**: Pay upfront via UPI to confirm the order
  - **Order tracking**: Track order status (confirmed, in transit, delivered, etc.)
* **Order flow**: Team Manager logs in → selects ground + date → team details loaded → selects items → pays via UPI → order confirmed

### 3.2 Innings Break Console
* **Directory**: `apps/innings-break-ops`
* **Primary user**: Business Owner
* **Core functions**:
  - **Ground management**: Create and manage playing grounds, organized by City → Area → Ground hierarchy
  - **Menu configuration**: Configure what food, beverages, refreshments, and recipes are offered
  - **Order management**: View and manage incoming orders from team managers
  - **Order fulfillment**: Update order status (confirmed → preparing → in transit → delivered)

### 3.3 Innings Break API
* **Directory**: `apps/innings-break-api`
* **Stack**: Node.js + Express (REST APIs)
* **Core function**: Backend service layer supporting both Innings Break and Innings Break Console

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

### 5.2 Player (Passive — No App Access)
* **Who**: Team members in the playing XI.
* **App access**: **None.** Players do not use Innings Break.
* **Role**: Share their food/drink preferences with the team manager via WhatsApp. The team manager handles everything from there.
* **Future consideration**: Players may eventually get app access to submit preferences directly, but this is explicitly out of scope for now.

### 5.3 Business Owner (Innings Break Console User)
* **Who**: The Innings Break business owner — the person who runs the entire operation.
* **App access**: Full access to **Innings Break Console**.
* **Responsibilities**:
  - **Grounds**: Creates and maintains the ground directory (City → Area → Ground hierarchy).
  - **Kitchen**: Manages the kitchen directly — no external vendors. All food and beverages are prepared in-house.
  - **Menu**: Configures what items are offered (recipes, beverages, refreshments, food).
  - **Orders**: Views, manages, and fulfills incoming orders from team managers.
  - **Delivery coordination**: Arranges delivery via third-party on-demand delivery apps.
* **Key point**: This is a single-owner operation. The business owner wears all hats — grounds, kitchen, menu, orders, and delivery coordination.

### 5.4 Delivery (Third-Party — No App Interface)
* **Who**: On-demand delivery partners from third-party apps (e.g., Dunzo, Porter, etc.).
* **App access**: **None.** Delivery partners do not use any Innings Break interface.
* **How it works**: The business owner books a delivery via the third-party app, hands off the prepared order, and the delivery partner brings it to the ground.
* **Implication**: Innings Break does **not** need to build a delivery-facing app or driver interface. Delivery tracking (if any) is based on what the business owner manually updates in Innings Break Console.

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
