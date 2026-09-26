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
   * **Primary Users**: `Business Owner` (Full Access & Team Management) & `Operations Manager` (Order Fulfillment & Delivery Coordination Staff)
   * **Format**: Responsive Web & PWA (desktop & mobile)
   * **Purpose**: Decoupled location management (independent Areas, Venues, and nested Pitch Facilities), in-house kitchen menu/recipe configuration, console staff management, order queue & fulfillment, and 3rd-party delivery dispatch coordination.

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
* **Team Entity & Wallet**: Team Profile and In-App Soft Credit wallet are tied to the **Team entity**, ensuring credit balances stay with the squad even if Team Managers rotate.
* **Banned Misnomers**: Do not refer to this persona as "Captain" or generic "User".

### 2.2 Business Owner
* **App Access**: Full access to **Innings Break Console** (`apps/innings-break-console`) via pre-configured/whitelisted mobile number.
* **Role**: The sole entrepreneur running the entire operation (1 single Business Owner in MVP).
* **Responsibilities**:
  * Manages the decoupled directory of Areas, Venues, and Pitch Facilities (spatial resolution handled by backend API services; zero manual mapping in the Console).
  * Manages the in-house kitchen (100% prepared in-house; no external food vendors).
  * Configures menu items, recipes, and team packs.
  * Deploys and manages **Operations Managers** via the Team Members section (pre-whitelists mobile numbers and generates onboarding invite links).
  * Fulfills incoming team pre-orders and oversees delivery dispatches.
* **Banned Misnomers**: Do not refer to this persona as "Admin" or "Vendor".

### 2.3 Operations Manager
* **App Access**: Staff access to **Innings Break Console** (`apps/innings-break-console`) strictly through pre-authorized mobile number invite links and OTP (uninvited strangers are blocked).
* **Role**: Operational staff deployed by the Business Owner to run day-to-day fulfillment.
* **Responsibilities**:
  * Views incoming team pre-order queue for their assigned Kitchen Hub.
  * Advances kitchen prep stages (`Confirmed` → `Preparing` → `In Transit` → `Delivered`).
  * Coordinates with third-party delivery couriers (Dunzo, Porter) and logs dispatch info.
* **Strict Boundary**: Restricted from viewing or managing the "Team Members" section, onboarding other managers, or changing core business configurations.

### 2.4 Player
* **App Access**: **None.** Passive actor.
* **Role**: Shares food/drink preferences with the Team Manager via WhatsApp; drinks/eats at the ground.
* **Strict Boundary**: Players do not interact with Innings Break or Innings Break Console. No player accounts, logins, or player-facing screens exist.

### 2.5 Delivery
* **App Access**: **None.** External third-party delivery partners (e.g. Dunzo, Porter).
* **Role**: Pick up prepared orders from the kitchen and deliver them to the ground.
* **Strict Boundary**: Booked via third-party apps by the Business Owner or Operations Manager. No driver or courier app is built in the Innings Break ecosystem.

---

## 3. Specification & Code Traceability

* **PRDs**: User stories must declare: `As a Team Manager...`, `As the Business Owner...`, or `As an Operations Manager...`.
* **Tech Specs**: Every screen and API endpoint must specify authorization: `Innings Break (Team Manager)`, `Innings Break Console (Business Owner)`, or `Innings Break Console (Operations Manager)`.
* **Tasks**: Every task must declare its target app and persona.
