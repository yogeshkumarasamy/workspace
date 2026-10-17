> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.5 Cancellations & Policies

Cancellation outcomes are computed by a pluggable **`CancellationPolicy`**, never hard-coded. The core supplies the context; the policy returns a decision.

## User Stories

* **US-PM-17**: As an `owner`, I want to configure a **time-before-fulfilment** cancellation policy (e.g. full refund to credits if cancelled ≥ 90 minutes before fulfilment start; no self-cancel after that), so that customers get predictable outcomes and my kitchen isn't left with waste.
  * **Given** policy `timeBeforeFulfilment { tiers: [{ minLead: "PT90M", refundPct: 100, disposition: "credit" }], else: "deny" }` and an order with `fulfilmentStart` 2 h away, **When** the customer cancels, **Then** the order goes `Cancelled` (T10), a `CancellationDecision { refundMinor: total, disposition: "credit" }` is stored, and T17 settles to `Refunded` after the ledger credit is written.
  * **Given** the same order 60 minutes before start, **When** the customer cancels, **Then** `409 POLICY_DENIED { reason: "LEAD_TIME_TOO_SHORT", minLead: "PT90M" }` and nothing changes.
* **US-PM-18**: As an `owner`, I want different outcomes per **cancellation cause** — customer request, merchant closure (date closed, slot cancelled), external event (e.g. weather/venue cancellation reported by customer), fulfilment failure — so that fault determines who bears the cost.
  * **Given** cause `merchant_closure`, **When** an owner cancels a slot, **Then** every non-terminal order of the slot is cancelled with `refundPct=100` and the configured disposition for merchant fault (default `original_payment`), regardless of lead time.
  * **Given** cause `external_event` and `requiresEvidence=true`, **When** the customer cancels, **Then** the decision is `pending_review` (order stays in its state with `cancellationRequestId`) until an `owner`/`operator` approves or rejects.
* **US-PM-19**: As an `operator`, I want an **escalation path** for post-fulfilment complaints (wrong/missing/late items) that issues a partial compensation without changing a completed order's state, so that service recovery is fast and auditable.
  * **Given** a `Completed` order, **When** an operator files `CompensationRequest { lines: [{ orderLineId, quantity }], reason: "missing_item" }` within `complaintWindow` (default `PT24H`), **Then** a `CompensationDecision` is created; if `amount ≤ operatorLimitMinor` it auto-approves, otherwise it is `pending_owner`. Approval writes a ledger credit ([3.6](./06-credits-wallet-ledger-refunds.md)).

## Policy Context & Decision (normative)

```ts
interface CancellationContext {
  order: Readonly<Order>; lines: ReadonlyArray<OrderLine>;
  cause: 'customer_request'|'merchant_closure'|'external_event'|'fulfilment_failure'|'payment_expired';
  actorRole: ActorRole; now: Date; window: PreorderWindow; timezone: string;
  paidMinor: number; creditAppliedMinor: number;
  evidence?: { kind: string; ref: string };
}
type CancellationDecision =
  | { outcome: 'deny'; reason: string; details?: Record<string, unknown> }
  | { outcome: 'pending_review'; reviewerRoles: ActorRole[]; reason: string }
  | { outcome: 'allow'; refundMinor: number; disposition: 'credit'|'original_payment'|'split'|'none';
      split?: { creditMinor: number; originalPaymentMinor: number }; releaseCapacity: boolean; policyId: string; policyVersion: number };
interface CancellationPolicy { id: string; version: number; evaluate(ctx: CancellationContext): CancellationDecision }
```
Built-in policy kinds (configurable JSON, so no code needed for common cases):

| Kind | Params | Behaviour |
|---|---|---|
| `timeBeforeFulfilment` | `tiers[{ minLead, refundPct, disposition }]`, `else: deny\|review` | First tier whose `minLead ≤ fulfilmentStart − now` wins. |
| `beforeState` | `allowedStates[]`, `refundPct`, `disposition` | e.g. allow only before `Preparing`. |
| `causeMatrix` | `{ [cause]: PolicyRef }` | Routes by cause to another policy. |
| `requireReview` | `reviewerRoles[]` | Always `pending_review`. |
| `composite` | `all[] \| first[]` | Combine policies. |

`releaseCapacity` defaults to `true` before `Preparing` and `false` after (units already produced).

## Data Model

| Entity | Key fields |
|---|---|
| `PolicyConfig` | `id`, `kind`, `params: JSON`, `version`, `scope: { locationId? }`, `active` |
| `CancellationRequest` | `id`, `orderId`, `cause`, `requestedByRole`, `requestedBy`, `evidence?`, `status: pending_review\|approved\|rejected\|applied`, `decision: JSON`, `createdAt`, `decidedAt?`, `decidedBy?` |
| `CompensationRequest` | `id`, `orderId`, `lines: JSON`, `reason`, `amountMinor`, `status: auto_approved\|pending_owner\|approved\|rejected`, `ledgerEntryId?`, `createdBy`, `createdAt` |

```sql
CREATE TABLE policy_config (
  id TEXT NOT NULL, version INTEGER NOT NULL, kind TEXT NOT NULL,
  params JSONB NOT NULL, location_id TEXT, active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (id, version)
);
CREATE TABLE cancellation_request (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES "order"(id),
  cause TEXT NOT NULL, requested_by_role TEXT NOT NULL, requested_by TEXT,
  evidence JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending_review','approved','rejected','applied')),
  decision JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ, decided_by TEXT
);
CREATE UNIQUE INDEX one_open_cancel_per_order ON cancellation_request (order_id) WHERE status = 'pending_review'; -- D1 supports partial indexes
CREATE TABLE compensation_request (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES "order"(id),
  lines JSONB NOT NULL, reason TEXT NOT NULL, amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL CHECK (status IN ('auto_approved','pending_owner','approved','rejected')),
  ledger_entry_id TEXT, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/orders/{id}/cancellation:preview` | customer (own), operator, owner | `{ cause }` | `200 CancellationDecision` (no side effects) | `409 ORDER_TERMINAL` |
| `POST /v1/orders/{id}/cancellations` | customer (own), operator, owner | `Idempotency-Key`, `If-Match`; `{ cause, evidence? }` | `201 { request: CancellationRequest, order: Order }` | `409 POLICY_DENIED`, `409 CANCELLATION_PENDING`, `412 VERSION_CONFLICT` |
| `POST /v1/cancellation-requests/{id}:decide` | operator, owner (per `reviewerRoles`) | `{ approve: boolean, note? }` | `200 { request, order }` | `403 ACTION_NOT_PERMITTED`, `409 ALREADY_DECIDED` |
| `POST /v1/slots/{slotId}:cancel` | owner | `Idempotency-Key`; `{ reason }` | `202 { affectedOrders: int, jobId }` | `409 SLOT_ALREADY_CANCELLED` |
| `POST /v1/orders/{id}/compensations` | operator, owner | `{ lines: [{ orderLineId, quantity }], reason }` | `201 CompensationRequest` | `409 COMPLAINT_WINDOW_CLOSED`, `422 QUANTITY_EXCEEDS_LINE` |
| `POST /v1/compensations/{id}:decide` | owner | `{ approve: boolean }` | `200 CompensationRequest` | `409 ALREADY_DECIDED` |
| `PUT /v1/policies/cancellation` | owner | `PolicyConfig` (new version) | `200 PolicyConfig` | `400 INVALID_POLICY` |

## Domain Events
`CancellationPreviewed` (not persisted to outbox), `CancellationRequested`, `CancellationApproved`, `CancellationRejected`, `OrderCancelled`, `SlotCancelled { affectedOrders }`, `CompensationRequested`, `CompensationApproved`, `CompensationRejected`.

## Invariants
* The decision applied to an order references an exact `policyId` + `policyVersion`; policy edits never retroactively change stored decisions.
* `refundMinor ≤ paidMinor + creditAppliedMinor` and `split.creditMinor + split.originalPaymentMinor == refundMinor`.
* At most one `pending_review` cancellation per order.
* Total compensation per order ≤ order total (configurable cap).
* Preview and apply use the **same** pure evaluation; apply re-evaluates at commit time with server `Clock`.

## Codegen Notes
* **Module**: `core/cancellation` (pure policies + registry). Built-in kinds are interpreters over `PolicyConfig.params`; custom policies implement `CancellationPolicy` and are registered by id.
* **Tests to generate**: tier boundaries (exactly `minLead` → allowed), DST-affected lead times use absolute durations, cause routing, merchant-closure bulk cancel idempotency, review flow approve/reject, operator limit auto-approval, compensation cap, preview/apply parity, policy versioning.
