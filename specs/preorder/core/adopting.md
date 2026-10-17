> ← Back to [PRD: Pre-Order Core Module — Index](./prd.md)

# Adopting the Pre-Order Core Module

How a new pre-order business plugs in **without editing core modules**. Read the [Overview](./overview.md) first; every step below points at the feature file that defines the behaviour.

## 1. Adoption Checklist

| Step | What you decide | Where it lives | Spec |
|---|---|---|---|
| 1 | Map your personas to module roles (`owner`, `operator`, `customer`, `system`) | your project PRD / persona file | [Overview §2](./overview.md) |
| 2 | Fulfilment locations: timezone, coordinates, service area | config / seed data | [3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md), [3.2](./features/02-catalog-offerings-capacity.md) |
| 3 | Operating calendar: default weekdays, fallback lock | `calendar_template` | [3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md) |
| 4 | Window rule: when orders open and cut off | `window_rule` | [3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md) |
| 5 | Slots and fulfilment mode (`pickup` / `delivery`) | `slot` | [3.2](./features/02-catalog-offerings-capacity.md) |
| 6 | Catalog, bundles, per-slot offerings, capacity, batches | `catalog_item`, `offering`, `batch` | [3.2](./features/02-catalog-offerings-capacity.md) |
| 7 | Hold TTL, payment TTL, cutoff grace, auto-complete durations | `PreorderModuleConfig` | [3.4](./features/04-inventory-holds-reservations.md), [3.3](./features/03-order-lifecycle-state-machine.md) |
| 8 | Eligibility + pricing rules (built-in or custom) | `rules.eligibility`, `rules.pricing` | [3.11](./features/11-extension-points-ports.md) |
| 9 | Cancellation policy (JSON kinds or custom) | `policy_config` | [3.5](./features/05-cancellations-policies.md) |
| 10 | Credits: individual vs shared accounts, refund disposition defaults | `features.sharedAccounts`, policy | [3.6](./features/06-credits-wallet-ledger-refunds.md) |
| 11 | Payment provider adapter (or `manual` to start) | `ports.payments` | [3.7](./features/07-payment-hooks-intent-webhooks-reconciliation.md) |
| 12 | Notification rules, channels, templates, quiet hours | `notification_rule` | [3.8](./features/08-notifications.md) |
| 13 | Scheduler binding and trigger cap | `ports.scheduler` | [3.9](./features/09-scheduled-jobs.md) |
| 14 | Polling intervals (keep defaults unless you have a budget) | `pollIntervals` | [3.10](./features/10-status-sync-polling-contract.md) |
| 15 | Storage: run the DDL from each feature file (Postgres or D1) | migrations | all features |
| 16 | Run the contract test suites against your adapters | CI | [3.11](./features/11-extension-points-ports.md) |

**Rule of thumb**: if something you need is not expressible through config, a rule, a policy or an adapter, propose a new **extension point** in this PRD (change request) rather than forking the core.

## 2. Storage Notes

* Apply each feature's DDL in order 3.1 → 3.10 (foreign keys reference earlier tables). For D1/SQLite: replace `TIMESTAMPTZ` with `TEXT` (ISO 8601 UTC), `JSONB` with `TEXT`, booleans with `INTEGER`, quote `order` or rename it `orders`.
* Atomicity on D1 uses `db.batch([...])` (single implicit transaction). The no-oversell guarantee relies on the conditional `UPDATE … WHERE committed + held + :qty <= capacity` pattern in [3.4](./features/04-inventory-holds-reservations.md), which works identically on both engines.
* Every state change writes **state + outbox_event + change_log** in one unit of work.

---

## 3. Worked Example A — Match-Day Food Pre-Order

A business delivering refreshments to amateur sports venues on weekend match days (the generalised model described in [innings-break-mapping.md](./innings-break-mapping.md)).

**Role mapping**: merchant owner → `owner`; kitchen staff → `operator` scoped to a kitchen location; group organiser who orders for a team → `customer` acting on a **shared account** (the team).

```ts
const config: PreorderModuleConfig = {
  currency: 'INR',
  holdTtl: 'PT10M', paymentTtl: 'PT15M', cutoffGrace: 'PT2M',
  autoCompleteAfter: { InTransit: 'PT24H', Delivered: 'PT2H' },
  complaintWindow: 'PT24H',
  operatorCompensationLimitMinor: 50000,          // ₹500
  draftOrders: false,                              // cart lives client-side
  features: { manualPayments: true, sharedAccounts: true, batches: true },
  rules: {
    eligibility: ['radius', 'minOrderValue'],
    pricing: ['bundlePrice', 'fixedFee:delivery'],
    cancellationPolicyId: 'match-day-cancel',
  },
  ports: { /* D1 UnitOfWork, cron Scheduler, manual + gateway PaymentProvider, in_app + share_link Notifiers, ... */ } as any,
};
```

| Concern | Setting |
|---|---|
| Location | `{ name: "Central Kitchen", timezone: "Asia/Kolkata", lat: 13.06, lng: 80.25 }`; service area `{ kind: "radius", km: 15 }` |
| Calendar | `defaultWeekdays: ["SAT","SUN"]`; `fallbackLock: { weekday: "THU", time: "12:00", horizonDays: 7 }` |
| Slots | three per operating day, e.g. `06:30–07:30`, `10:30–11:30`, `14:00–15:00` local, mode `delivery` |
| Window rule | `opens: { kind: "relative", anchor: "fulfilmentStart", duration: "-P7D" }`, `cutoff: { kind: "calendar", anchor: "fulfilmentStart", dayOffset: -1, time: "20:00" }` |
| Catalog | items: fresh juice, cut fruit, boiled eggs, energy bites; bundle "Group Pack (11)" |
| Offerings / batches | each item per slot with capacity = kitchen output; batch per slot for the prep sheet |
| Checkout group | one organiser schedules two matches (Sat + Sun) → two orders, one payment (US-PM-09) |
| Cancellation | `{ id: "match-day-cancel", kind: "causeMatrix", params: { customer_request: { kind: "beforeState", allowedStates: ["Confirmed"], refundPct: 0, disposition: "none" }, external_event: { kind: "timeBeforeFulfilment", tiers: [{ minLead: "PT90M", refundPct: 100, disposition: "credit" }], else: "review" }, merchant_closure: { kind: "timeBeforeFulfilment", tiers: [{ minLead: "PT0S", refundPct: 100, disposition: "credit" }] } } }` |
| Credits | shared account per team; refunds to credit by default; auto-apply at checkout |
| Notifications | `in_app` for everything; `share_link` for organiser → group updates; SMS only for `OrderDispatched` (critical) |
| Polling | defaults: 3 s during payment, 15 s on match day, 10 s operator board |

**Project-specific extensions (kept outside the module)**: group preference polls, per-item person assignment, venue/ground directory, courier dispatch metadata form, team roster import. Each attaches to orders via `order.metadata` or its own tables keyed by `order_id`.

---

## 4. Worked Example B — Weekend Bakery Pre-Orders

A neighbourhood bakery taking pre-orders for Saturday/Sunday morning pickup, with limited oven capacity.

**Role mapping**: baker-owner → `owner`; counter staff → `operator`; shopper → `customer` (individual accounts).

```ts
const config: PreorderModuleConfig = {
  currency: 'GBP',
  holdTtl: 'PT15M', paymentTtl: 'PT20M', cutoffGrace: 'PT0S',
  autoCompleteAfter: { Ready: 'PT6H' },              // unclaimed pickups close end of day
  complaintWindow: 'PT48H',
  operatorCompensationLimitMinor: 500,              // £5
  draftOrders: true,
  features: { manualPayments: false, sharedAccounts: false, batches: true },
  rules: {
    eligibility: ['maxOrdersPerSlotPerCustomer'],
    pricing: ['percentDiscount:preorder-10'],
    cancellationPolicyId: 'bakery-cancel',
  },
  ports: { /* Postgres UnitOfWork, worker-loop Scheduler, card gateway PaymentProvider, email Notifier, ... */ } as any,
};
```

| Concern | Setting |
|---|---|
| Location | `{ name: "High Street Bakery", timezone: "Europe/London" }`; no service area (pickup only) |
| Calendar | `defaultWeekdays: ["SAT","SUN"]`; overrides close bank-holiday weekends; no fallback lock |
| Slots | `08:00–10:00` and `10:00–12:00` local, mode `pickup` |
| Window rule | `opens: { kind: "calendar", anchor: "fulfilmentStart", dayOffset: -6, time: "09:00" }`, `cutoff: { kind: "calendar", anchor: "fulfilmentStart", dayOffset: -1, time: "14:00" }` — on the late-October weekend clocks go back; rule 4 of [3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md) applies |
| Catalog | sourdough loaf, croissant ×6 box, seasonal cake; bundle "Brunch Box" |
| Capacity | per-offering capacity plus **batch** capacity per oven run (e.g. 48 croissants across all croissant products) |
| Cancellation | `{ id: "bakery-cancel", kind: "timeBeforeFulfilment", params: { tiers: [{ minLead: "PT24H", refundPct: 100, disposition: "original_payment" }, { minLead: "PT12H", refundPct: 50, disposition: "credit" }], else: "deny" } }` |
| Credits | individual accounts, used mostly for compensations |
| Notifications | `email` for `OrderConfirmed`, `OrderReady`; `in_app` feed for staff |
| Polling | customer screens rarely open → defaults; staff board 10 s |

**What changed vs Example A**: different timezone with DST, pickup instead of delivery, no shared accounts, card refunds to original payment, batch-level capacity — **zero** core changes, only config, rules and adapters. This is success metric #7 in [Success Metrics](./success-metrics-and-scope.md).

---

## 5. End-to-End Scenarios to Generate as Acceptance Tests

1. Browse → hold → checkout (credits partially applied) → webhook success → `Confirmed` → `Preparing` → `Ready`/`InTransit` → `Completed` (auto).
2. Two customers race for the last unit; one succeeds, one gets `INSUFFICIENT_CAPACITY`.
3. Abandoned payment: hold expires → order `Expired` → capacity restored → late webhook refunds.
4. Cancellation by policy tier → `Cancelled` → refund disposition → `Refunded`; ledger and provider refund each happen once.
5. Fallback lock fires at local time across a DST boundary.
6. Operator board polling: `304` steady state; change appears within one interval.
