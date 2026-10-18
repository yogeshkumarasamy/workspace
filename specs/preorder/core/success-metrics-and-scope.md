> ← Back to [PRD: Pre-Order Core Module — Index](./prd.md)

# PRD: Pre-Order Core Module — Success Metrics & Scope

## 4. Success Metrics

1. **Zero Oversell**: 0 instances where committed + active-hold quantity exceeds offering capacity, verified by a concurrency test of ≥ 100 parallel reservations against capacity 10.
2. **Idempotent Mutations**: 100% of mutating endpoints and webhook handlers produce identical end state when replayed with the same idempotency key / provider event id.
3. **Legal Transitions Only**: 100% of order status changes pass through the transition table; an attempt at any non-listed transition is rejected with `409 ILLEGAL_TRANSITION` and no side effects.
4. **Timezone Correctness**: Window/cutoff evaluation passes the DST test matrix (spring-forward gap, fall-back overlap) for at least `Asia/Kolkata` (no DST), `Europe/London`, and `America/New_York`.
5. **Ledger Integrity**: For every account, `cached_balance == SUM(entries)` at all times; 0 updates or deletes on ledger rows.
6. **Cheap Polling**: ≥ 90% of status polls during steady state return `304 Not Modified` with an empty body.
7. **Adoption Effort**: A new business can be configured (calendar, slots, catalog, policies) and pass the generated contract tests using only extension points, with **zero edits** to core modules — demonstrated by the two worked examples in [adopting.md](./adopting.md).
8. **Business-Agnostic Language**: 0 project-specific terms in core entity, event, error or endpoint names.

---

## 5. Scope & Out-of-Scope

### In Scope (Module MVP)
* Operating calendar with default-day templates, per-day overrides, and an automated **fallback lock** at a configured local time.
* Pre-order windows with `opensAt`, `cutoffAt`, `fulfilmentStart`, `fulfilmentEnd` derived from local-time rules + IANA timezone.
* Catalog items, bundles, fulfilment locations, slots, offerings with capacity, batches, availability toggles.
* Eligibility rules (e.g. service-area radius) and pricing rules as pluggable ports.
* Order state machine with explicit transition table, guards, actors, audit trail and domain events.
* Checkout groups (multiple orders, one payment).
* Inventory holds with TTL, idempotent reserve/commit/release/expire, no oversell.
* Pluggable cancellation policies, including time-before-fulfilment rules and escalation to manual review.
* Append-only credits ledger with shared accounts, auto-apply at checkout, and refund dispositions (to credit / to original payment).
* Provider-agnostic payment intents, signed webhook verification, idempotent event processing, reconciliation.
* Transactional outbox for notifications; in-app notification feed.
* Scheduled jobs with idempotent run keys.
* Versioned status resources with ETag / `updatedAt` polling contract and an upgrade path to push.
* Reference SQL for Postgres and Cloudflare D1 (SQLite).

### Out of Scope (left to adopting projects)
* Authentication / identity proofing (OTP, OAuth). The module consumes an authenticated `Principal` only.
* UI, design systems, and client state (carts may be drafted client-side).
* Domain-specific collaboration flows (group preference polls, per-person item assignment, invite links).
* Domain-specific venue/location directories beyond a coordinate + service area.
* Specific payment, SMS, messaging or courier vendors (reached via ports).
* Tax computation beyond a `PricingRule` hook; invoicing layouts.
* Multi-currency within one order; marketplace / multi-merchant settlement.
* Real-time push transport implementation (contract reserved; polling is the MVP).
