> ← Back to [PRD: Pre-Order Core Module — Index](./prd.md)

# PRD: Pre-Order Core Module — Overview

## 1. Problem Statement

Many businesses sell things that are **produced or allocated for a scheduled moment** rather than shipped on demand: weekend bakery boxes, event-day catering, meal-prep subscriptions, farm-share pickups, festival hampers, class or slot bookings with add-ons. They all need the same hard parts:

1. **Time-boxed ordering**: orders open at one instant, close at a cutoff, and are fulfilled in a later window — all defined in the **business's local timezone**, including daylight-saving edge cases.
2. **Finite capacity**: a batch, oven, kitchen shift or vehicle can only take so much. Two customers checking out at once must never oversell the last unit.
3. **A trustworthy order lifecycle**: every status change must be legal, attributable, and observable by both staff and customers.
4. **Money discipline**: upfront payment through a provider, verified on the server via signed webhooks; cancellations and compensations handled by explicit policy; in-app credits held in an auditable, append-only ledger.
5. **Background automation**: closing windows, expiring unpaid holds, locking default schedules, auto-completing stale orders — all safe to run twice.
6. **Cheap status visibility**: customers and staff watch orders change; most small businesses start with polling and need it to be cheap.

These concerns were specified in depth for one product (Innings Break). Re-deriving them per business wastes effort and invites inconsistencies. This module extracts the **business-agnostic** part as a single specification that a new pre-order business configures and extends through declared **extension points** rather than rewriting.

### The Solution: Pre-Order Core Module
A specification for a framework-agnostic domain core plus thin adapters:
* **Core domain** (pure, no I/O): entities, the order state machine, window/cutoff evaluation, hold accounting, cancellation policy evaluation, ledger arithmetic, domain events.
* **Ports** (interfaces) for storage, time, ids, payments, notifications, scheduling, eligibility, pricing, and cancellation policy.
* **Reference HTTP contract** suitable for edge runtimes (e.g. Cloudflare Workers) or a Node server, including a polling-friendly status endpoint.

---

## 2. Roles & Boundaries

Roles are **generic** and adopting projects map them to their own canonical personas (see [adopting.md](./adopting.md) §2).

### 2.1 Active Roles
| Role | Description | Typical permissions |
|---|---|---|
| `owner` | The merchant principal who configures the business. | Everything: calendar, windows, catalog, capacity, policies, staff, credits issuance, refunds. |
| `operator` | Staff member scoped to one or more **fulfilment locations**. | Advance orders through fulfilment states, toggle offering availability, view prep aggregates, resolve escalations within limits. |
| `customer` | The party that places and pays for a pre-order. May act for a **shared account** (e.g. a household, club or team). | Browse offerings, place/pay/cancel own orders within policy, view status, view own ledger. |
| `system` | The scheduler and webhook processors. | Only transitions explicitly marked `system` in the transition table. |

### 2.2 Passive Parties (no module access)
* **Recipient**: whoever physically receives the order if not the customer. Captured as contact data on the order only.
* **Courier / fulfilment partner**: external third party; referenced by dispatch metadata only.
* **Payment provider**: external; reached only through the `PaymentProvider` port.

### 2.3 Glossary
| Term | Meaning |
|---|---|
| **Catalog item** | Something sellable (product, bundle component). Business-wide definition with price and attributes. |
| **Bundle** | A catalog item composed of other items with fixed quantities and its own price. |
| **Fulfilment location** | Where orders are produced or dispatched from (kitchen, bakery, depot). Holds timezone and service area. |
| **Slot** | A fulfilment time range at a location (e.g. Saturday 06:30–08:00). |
| **Pre-order window** | The open → cutoff interval during which orders for a slot are accepted. |
| **Offering** | A catalog item made available in a specific slot with a **capacity** (units). |
| **Batch** | A production grouping of offerings (e.g. one oven run) used for prep aggregates; may carry its own capacity. |
| **Hold** | A temporary reservation of offering capacity with a TTL, later committed or released. |
| **Checkout group** | One or more orders paid together by a single payment intent. |
| **Account** | A ledger holder (individual or shared) that owns credits. |
| **Ledger entry** | An immutable credit/debit record; balance = sum of entries. |
| **Policy** | A pluggable rule object (cancellation, pricing, eligibility) evaluated by the core. |
