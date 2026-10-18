# Canonical Personas & Applications: Innings Break

> **Scope**: Innings Break Ecosystem Exclusively (`apps/innings-break-*`, `specs/innings-break/**`)  
> **Source of Truth**: [.specify/memory/innings-break.md](file:///.specify/memory/innings-break.md)  
> **Decision History**: [.specify/memory/innings-break-changelog.md](file:///.specify/memory/innings-break-changelog.md)  
> **Exempt Domains**: Portfolio (`apps/portfolio`, `specs/portfolio/**`)

This document directly reflects the decided ecosystem components from the primary memory file ([innings-break.md](file:///.specify/memory/innings-break.md)) and is the canonical definition of the decided personas (the memory file points here rather than duplicating them). No other roles or app names exist. The cron hub is shared infrastructure, not an application and not a persona.

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

3. **Innings Break Customer API** *(runtime pending approval — [runtime spec](file:///specs/innings-break/runtime.md))*
   * **Directory**: `apps/innings-break-customer-api`
   * **Cloudflare Worker**: `ib-customer-api-dev`, `ib-customer-api-staging`, `ib-customer-api-prod`
   * **Authorized Persona**: `Team Manager`
   * **Runtime**: Hono on Cloudflare Workers. Not Node.js and not Express.
   * **Data**: D1 `ib-<env>`, the same database as the Console API.
   * **Sessions**: WebCrypto (`crypto.subtle`). Node.js `crypto` is not used.
   * **Purpose**: Customer app API, including ground search, spatial resolution, and delivery geofencing.

4. **Innings Break Console API** *(runtime pending approval — [runtime spec](file:///specs/innings-break/runtime.md))*
   * **Directory**: `apps/innings-break-console-api`
   * **Cloudflare Worker**: `ib-console-api-dev`, `ib-console-api-staging`, `ib-console-api-prod`
   * **Authorized Personas**: `Business Owner`, `Operations Manager`
   * **Runtime**: Hono on Cloudflare Workers. Not Node.js and not Express.
   * **Data**: D1 `ib-<env>`, shared with the Customer API. Both Workers read and write that one database.
   * **Sessions**: WebCrypto (`crypto.subtle`). Node.js `crypto` is not used.
   * **Purpose**: Console API for grounds, kitchen hubs, menu, calendar, fulfillment, dispatch, support, and credits.

5. **Cron hub** (infrastructure — not a persona application)
   * **Directory**: `apps/cron-hub`
   * **Cloudflare Worker**: `cron-hub-dev`, `cron-hub-staging`, `cron-hub-prod`
   * **Authorized Persona**: none. Team Manager, Business Owner, and Operations Manager do not sign in here.
   * **Purpose**: One `* * * * *` trigger per environment. Calls the Console API scheduled handler over a service binding. Preview has no cron. See the [runtime spec](file:///specs/innings-break/runtime.md).

---

## 2. Decided Personas

As decided in the [decision log](file:///.specify/memory/innings-break-changelog.md) (canonical here; referenced from [innings-break.md](file:///.specify/memory/innings-break.md) Section 5):

### 2.1 Team Manager
* **App Access**: Full access to **Innings Break** (`apps/innings-break`).
* **Role**: The trusted team coordinator responsible for logistics.
* **Why Not "Captain"**: In weekend domestic cricket, captains rotate or miss matches; the team needs a stable logistics manager regardless of who captains on the day.
* **Role Hierarchy & Per-Week Delegation**:
  - **`Primary Team Manager`**: Permanent team creator and account owner. Holds permanent team ownership, manages the team roster, and possesses exclusive authority to delegate or revoke weekly manager access.
  - **`Delegated Match-Week Manager`**: A registered squad member assigned by the Primary Manager to run logistics for a specific operating week via a secure tokenized Magic Delegation URL (`https://inningsbreak.app/delegate/...`). Has full operational parity for their assigned week (scheduling, polling, ordering, UPI checkout using Team Wallet), displays a prominent role status badge in the app header, cannot edit primary ownership, and access can be revoked instantly by the Primary Manager.
* **Coordination**: Collects player preferences via the team's **WhatsApp group** or tokenized polling links, consolidates the order, and places a single team pre-order with upfront UPI payment.
* **Team Entity & Wallet**: Team Profile and In-App Soft Credit wallet are tied to the **Team entity**, ensuring credit balances stay with the squad even if Team Managers rotate.
* **Onboarding & Authentication**: On first sign-up, captures Manager Name, Team Name, Mobile Number (verified via SMS OTP), **Mandatory CricHeroes Team Profile Link**, and **Optional CricHeroes Captain Profile Link**. Subsequent sign-ins authenticate strictly via **Mobile Number + SMS OTP**.
* **Landing & Scheduling Experience**: Upon login, lands directly on the **Interactive Monthly Calendar View** with the active week highlighted for quick weekend scheduling (`Saturday` / `Sunday`), active midweek holiday game scheduling, and future weeks/months planning—strictly gated by pre-order acceptance and operational status configured in the Console (non-operational days are locked).
* **Team Roster & Dual-Location Member Management**: Initial roster is populated via a one-time seed from the CricHeroes Team Profile link at sign-up (zero recurring background sync). Team Manager can add new or guest players in two places: (1) **Team Members Section** (under Team Profile tab for persistent squad management) and (2) **Match Scheduling Flow (Step 4: Squad Curation)** (inline `+ Add Player` action during match setup that immediately checks the player in and persists them to the main team roster).
* **4-Step Match Quick Scheduling**: Streamlined modal flow: (1) Date Confirmation ➔ (2) Unified Hierarchical Search across Area/Venue/Ground (instant single-pitch load for `Standalone Venues` vs drill-down picker for `Multi-Complex Venues`; default 20 km proximity radius search for Area queries) ➔ (3) Daytime Match Slot (`6:30 AM`, `10:30 AM`, `2:30 PM`) ➔ (4) Optional Match Squad Curation & Ad-Hoc Player Addition (from team member roster with inline `+ Add Player` for guest players).
* **Menu Ordering, Player Assignment & Squad Polling**: Supports blind bulk squad ordering, **Per-Item Player Assignment** via squad checkbox multi-select UI (supporting 11 players up to 13 players with domestic cricket Super Subs), and **Squad Menu Polling**: when unsure about squad preferences, the Team Manager can trigger personalized WhatsApp web links for curated squad members (Name + Mobile Number) from the Menus page. Players submit their choices via a lightweight, zero-login web link, notifying the manager and allowing 1-tap import into the order draft.
* **Multi-Match Weekend Ordering**: Seamlessly switches between multiple scheduled matches in a weekend (Saturday & Sunday) via a top contextual match switcher, maintaining isolated cart payloads and executing unified partitioned checkouts.
* **Order Summary & Dual Contacts**: Reviews consolidated order summary with in-cart quantity adjustments and back-to-menu navigation. Configures Primary Manager + Secondary On-Field Teammate contact (with gate notes) to guarantee delivery handoff without disrupting match play.
* **Payment, Orders Page & Rainout Engine**: Upfront UPI payment with failure retry recovery. Dedicated Orders Page displaying textual delivery status synchronized with Console staff updates (`Confirmed` ➔ `Accepted` ➔ `Preparing` ➔ `In Transit` ➔ `Delivered`). Permanent in-app visibility of Team Wallet with self-service 1-tap rainout cancellation ($\ge 1.5$h) automatically depositing 100% soft credits to the team wallet and auto-redeeming on next pre-orders.
* **Help & Support & Wallet Ledger**: Dedicated Help & Support screen tracking order-linked quality grievances, late cancellations, and provider resolution history. Dedicated Team Credits & Wallet History screen displaying a chronological transaction ledger of credit deposits and redemptions with clickable order references.
* **Banned Misnomers**: Do not refer to this persona as "Captain" or generic "User".

### 2.2 Business Owner
* **App Access**: Full access to **Innings Break Console** (`apps/innings-break-console`) via pre-configured/whitelisted mobile number.
* **Role**: The sole entrepreneur running the entire operation (1 single Business Owner in MVP).
* **Responsibilities**:
  * Manages the decoupled directory of Areas, Venues, and Pitch Facilities (spatial resolution handled by the Customer API; zero manual mapping in the Console).
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
* **Strict Boundary**: Players do not have customer app accounts, logins, or app-side ordering/payment interfaces. Players may only access a lightweight, zero-login web link sent by their Team Manager via WhatsApp to submit refreshment preferences for a specific scheduled match, which feeds directly into the Team Manager's draft order.

### 2.5 Delivery
* **App Access**: **None.** External third-party delivery partners (e.g. Dunzo, Porter).
* **Role**: Pick up prepared orders from the kitchen and deliver them to the ground.
* **Strict Boundary**: Booked via third-party apps by the Business Owner or Operations Manager. No driver or courier app is built in the Innings Break ecosystem.

---

## 3. Specification & Code Traceability

* **PRDs**: User stories must declare: `As a Team Manager...`, `As the Business Owner...`, or `As an Operations Manager...`.
* **Tech Specs**: Every screen and API endpoint must specify authorization: `Innings Break (Team Manager)`, `Innings Break Console (Business Owner)`, or `Innings Break Console (Operations Manager)`.
* **Tasks**: Every task must declare its target app and persona.
