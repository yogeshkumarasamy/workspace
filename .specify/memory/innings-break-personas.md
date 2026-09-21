# Canonical Personas & Applications: Innings Break

> **Scope**: Innings Break Ecosystem Exclusively (`apps/innings-break-*`, `specs/innings-break/**`)  
> **Source of Truth**: [.specify/memory/innings-break.md](file:///.specify/memory/innings-break.md)  
> **Exempt Domains**: Portfolio (`apps/portfolio`, `specs/portfolio/**`)

This document directly reflects the decided ecosystem components and personas from the primary memory file ([innings-break.md](file:///.specify/memory/innings-break.md)). No other roles or app names exist.

---

## 1. Finalized Applications

As established in [innings-break.md](file:///.specify/memory/innings-break.md) Section 3:

1. **Innings Break**
   * **Directory**: `apps/innings-break`
   * **Primary User**: `Team Manager`
   * **Format**: Responsive Web & PWA (mobile-first)
   * **Purpose**: Match ground selection, menu browsing, consolidated team pre-ordering, UPI payment, and live order tracking.

2. **Innings Break Console**
   * **Directory**: `apps/innings-break-console`
   * **Primary User**: `Business Owner`
   * **Format**: Responsive Web & PWA (desktop & mobile)
   * **Purpose**: Ground hierarchy management (City → Area → Ground), in-house kitchen menu/recipe configuration, order queue & fulfillment, and 3rd-party delivery dispatch coordination.

3. **Innings Break API**
   * **Directory**: `apps/innings-break-api`
   * **Primary User**: Backend service layer (Node.js + Express REST APIs) supporting both Innings Break and Innings Break Console.

---

## 2. Decided Personas

As established in [innings-break.md](file:///.specify/memory/innings-break.md) Section 5:

### 2.1 Team Manager
* **App Access**: Full access to **Innings Break** (`apps/innings-break`).
* **Role**: The trusted team coordinator responsible for logistics.
* **Why Not "Captain"**: In weekend domestic cricket, captains rotate or miss matches; the team needs a stable logistics manager regardless of who captains on the day.
* **Coordination**: Collects player preferences via the team's **WhatsApp group**, consolidates the order, and places a single team pre-order with upfront UPI payment.
* **Scope**: One team manager per team.
* **Banned Misnomers**: Do not refer to this persona as "Captain" or generic "User".

### 2.2 Business Owner
* **App Access**: Full access to **Innings Break Console** (`apps/innings-break-console`).
* **Role**: The single entrepreneur running the entire operation.
* **Responsibilities**:
  * Manages the ground directory.
  * Manages the in-house kitchen (100% prepared in-house; no external food vendors).
  * Configures menu items, recipes, and team packs.
  * Fulfills incoming team pre-orders.
  * Books third-party delivery couriers.
* **Banned Misnomers**: Do not refer to this persona as "Admin" or "Vendor".

### 2.3 Player
* **App Access**: **None.** Passive actor.
* **Role**: Shares food/drink preferences with the Team Manager via WhatsApp; drinks/eats at the ground.
* **Strict Boundary**: Players do not interact with Innings Break or Innings Break Console. No player accounts, logins, or player-facing screens exist.

### 2.4 Delivery
* **App Access**: **None.** External third-party delivery partners (e.g. Dunzo, Porter).
* **Role**: Pick up prepared orders from the kitchen and deliver them to the ground.
* **Strict Boundary**: Booked via third-party apps by the Business Owner. No driver or courier app is built in the Innings Break ecosystem.

---

## 3. Specification & Code Traceability

* **PRDs**: User stories must declare: `As a Team Manager...` or `As the Business Owner...`.
* **Tech Specs**: Every screen and API endpoint must specify authorization: `Innings Break (Team Manager)` or `Innings Break Console (Business Owner)`.
* **Tasks**: Every task must declare its target app and persona.
