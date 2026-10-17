> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.4 Inventory Holds & Reservations

Capacity is consumed through **holds**. A hold is reserved, then committed (order confirmed), released (cancel/abandon) or expired (TTL). The module must never oversell, even under concurrent checkouts.

## Hold Lifecycle

| From | Operation | To | Counter effect on offering (and batch) |
|---|---|---|---|
| — | `reserve(qty, ttl, key)` | `Active` | `held += qty` (only if `committed + held + qty ≤ capacity`) |
| `Active` | `extend(ttl)` | `Active` | — |
| `Active` | `commit` | `Committed` | `held −= qty; committed += qty` |
| `Active` | `release` | `Released` | `held −= qty` |
| `Active` | `expire` (now ≥ `expiresAt`) | `Expired` | `held −= qty` |
| `Committed` | `release_committed` | `Released` | `committed −= qty` (cancellation before production lock) |

All other operations are no-ops returning the current hold (idempotent) when already in the target state, and `409 HOLD_STATE_CONFLICT` otherwise (e.g. commit an expired hold).

## User Stories

* **US-PM-13**: As a `customer`, I want items in my checkout to be held for a short time while I pay, so that they are not sold to someone else mid-payment.
  * **Given** offering `capacity=10, committed=6, held=2`, **When** I reserve `qty=2`, **Then** a hold `Active` with `expiresAt = now + holdTtl` (default `PT10M`) is created and `held=4`.
  * **Given** the same offering now has `remaining=0`, **When** another customer reserves `qty=1`, **Then** `409 INSUFFICIENT_CAPACITY { remaining: 0 }`.
* **US-PM-14**: As the `system`, I want concurrent reservations to be serialised at the storage layer, so that the last unit is sold exactly once.
  * **Given** `remaining=1` and 50 concurrent `reserve(qty=1)` calls, **When** they complete, **Then** exactly 1 succeeds and 49 return `INSUFFICIENT_CAPACITY`; `committed + held ≤ capacity` holds throughout.
* **US-PM-15**: As a `customer` on a flaky network, I want retried reservation requests not to double-hold, so that I don't lock up stock or get charged twice.
  * **Given** a reserve with `Idempotency-Key: K1` succeeded, **When** the identical request is retried with `K1`, **Then** the same hold is returned (`200`, header `Idempotent-Replay: true`) and counters are unchanged.
  * **Given** `K1` is reused with a different `qty`, **Then** `409 IDEMPOTENCY_KEY_REUSED`.
* **US-PM-16**: As the `system`, I want expired holds released automatically and lazily, so that abandoned checkouts free capacity even if the scheduler is late.
  * **Given** a hold with `expiresAt` in the past, **When** any reserve against the same offering runs, **Then** it first expires stale holds on that offering in the same transaction (lazy sweep), and the scheduled sweep ([3.9](./09-scheduled-jobs.md)) catches the rest.
  * **Given** an order in `PaymentPending` whose hold expired, **When** a late `payment_succeeded` arrives, **Then** the core attempts re-reservation; if capacity is gone it takes T6 (`Expired` + refund).

## Atomic Reservation (normative SQL pattern)

Works on Postgres and D1 (single statement, no read-then-write race):
```sql
UPDATE offering
   SET held = held + :qty, version = version + 1
 WHERE id = :offeringId
   AND available = 1
   AND committed + held + :qty <= capacity;
-- rows affected = 1 ⇒ insert hold row in the same transaction / D1 batch; 0 ⇒ INSUFFICIENT_CAPACITY (or OFFERING_UNAVAILABLE)
```
If the offering has a batch with capacity, the batch row is updated with the same predicate in the same transaction (D1: same `batch()` call); if either affects 0 rows, roll back. Multi-line checkouts reserve lines in **ascending `offeringId` order** to avoid deadlocks on Postgres.

## Data Model

| Entity | Key fields |
|---|---|
| `Hold` | `id`, `offeringId`, `batchId?`, `quantity`, `state: Active\|Committed\|Released\|Expired`, `expiresAt`, `orderId?`, `customerId`, `idempotencyKey?`, `createdAt`, `updatedAt` |
| `IdempotencyRecord` | `scope` (e.g. `POST /v1/holds` + principal), `key`, `requestHash`, `responseStatus`, `responseBody`, `createdAt`, `expiresAt` |

```sql
CREATE TABLE hold (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL REFERENCES offering(id),
  batch_id TEXT REFERENCES batch(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  state TEXT NOT NULL CHECK (state IN ('Active','Committed','Released','Expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  order_id TEXT, customer_id TEXT NOT NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX hold_active_expiry_idx ON hold (state, expires_at);  -- sweep
CREATE INDEX hold_offering_idx ON hold (offering_id, state);
CREATE TABLE idempotency_record (
  scope TEXT NOT NULL, key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL, response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, key)
);
```
Idempotency records are retained ≥ 24 h (configurable) and shared by every mutating endpoint in this PRD.

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/holds` | customer | `Idempotency-Key` (required); `{ offeringId, quantity }` | `201 Hold` (`200` on replay) | `409 INSUFFICIENT_CAPACITY { remaining }`, `409 OFFERING_UNAVAILABLE`, `409 WINDOW_CLOSED`, `422 MAX_PER_ORDER_EXCEEDED`, `409 IDEMPOTENCY_KEY_REUSED` |
| `PATCH /v1/holds/{id}` | customer (own) | `{ quantity }` | `200 Hold` | `409 INSUFFICIENT_CAPACITY`, `409 HOLD_STATE_CONFLICT` |
| `DELETE /v1/holds/{id}` | customer (own) | — | `200 Hold (Released)` (idempotent) | `409 HOLD_STATE_CONFLICT` (if Committed) |
| `GET /v1/holds/{id}` | customer (own) | — | `200 Hold & { secondsRemaining }` | `404 HOLD_NOT_FOUND` |

`Hold` schema: `{ id: string, offeringId: string, quantity: integer≥1, state: enum, expiresAt: date-time, orderId: string|null }`.

Commit / release of holds bound to orders happens only as **side effects of order transitions** ([3.3](./03-order-lifecycle-state-machine.md)); there is no public commit endpoint.

## Domain Events
`HoldReserved`, `HoldExtended`, `HoldCommitted`, `HoldReleased { reason }`, `HoldExpired`, `OfferingSoldOut` (when `remaining` reaches 0), `OfferingRestocked` (when it leaves 0).

## Invariants
* `offering.held == SUM(hold.quantity WHERE state='Active')` and `offering.committed == SUM(hold.quantity WHERE state='Committed')` — verified by the reconciliation job; drift raises `CapacityDriftDetected`.
* `committed + held ≤ capacity` at all times (DB `CHECK` + conditional update).
* A hold belongs to at most one order line.
* Hold state transitions are monotonic: once `Released`/`Expired` it never becomes `Active` again (re-reservation creates a new hold).

## Codegen Notes
* **Module**: `core/inventory` — pure functions `canReserve`, `applyHoldTransition`; storage-side atomicity lives in the `HoldRepository.reserveAtomic()` adapter method (see [3.11](./11-extension-points-ports.md)).
* **Types**:
  ```ts
  type HoldState = 'Active'|'Committed'|'Released'|'Expired';
  interface Hold { id: string; offeringId: string; batchId?: string; quantity: number; state: HoldState; expiresAt: Date; orderId?: string; customerId: string }
  interface HoldRepository {
    reserveAtomic(input: { offeringId: string; quantity: number; expiresAt: Date; customerId: string; idempotencyKey?: string }): Promise<{ ok: true; hold: Hold } | { ok: false; reason: 'INSUFFICIENT_CAPACITY'|'OFFERING_UNAVAILABLE'; remaining: number }>;
    transition(holdId: string, to: Exclude<HoldState,'Active'>, now: Date): Promise<Hold>;
    sweepExpired(now: Date, limit: number): Promise<number>;
  }
  interface IdempotencyStore { get(scope: string, key: string): Promise<IdempotencyRecord|null>; put(rec: IdempotencyRecord): Promise<void> }
  ```
* **Tests to generate**: concurrency (N parallel reserves vs capacity, both in-memory adapter with a mutex and a SQLite/D1 adapter); idempotent replay & key-reuse conflict; lazy expiry on reserve; batch + offering dual predicate rollback; release of committed hold before production; counter/row drift detection; deterministic lock ordering for multi-line checkout.
