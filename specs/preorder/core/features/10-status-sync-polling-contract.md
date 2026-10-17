> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.10 Status Sync: Polling Contract & Future Push

Clients learn about changes by **conditional polling** of versioned resources. The contract is designed so that most polls cost a `304` with no body and so that a push transport can be added later without changing resource shapes.

## Contract (normative)

1. Every pollable resource (`Order`, order lists, `Account`, notification feed, slot offerings/remaining) exposes `version` (monotonic integer per aggregate) and `updatedAt`.
2. Responses carry `ETag: W/"<resource>:<version>"` (lists: `W/"<hash of (id,version) pairs + cursor>"`) and `Last-Modified`.
3. Clients send `If-None-Match`; unchanged ⇒ `304 Not Modified`, empty body.
4. Server returns `X-Poll-Interval: <seconds>` hint; clients must not poll faster. Defaults by state:

| Resource / state | Interval hint |
|---|---|
| Order in `PaymentPending` | 3 s (for at most `PT10M`) |
| Order in `Confirmed`…`Delivered` on fulfilment day | 15 s |
| Order otherwise non-terminal | 60 s |
| Terminal order | `0` = stop polling |
| Operator board (`/v1/sync`) | 10 s |
| Slot remaining capacity on browse screens | 30 s |
| Notification feed | 30 s |

5. Clients add ±20% jitter, back off ×2 (max 300 s) on `5xx`/`429`, and pause when the app is hidden.
6. `429 RATE_LIMITED` includes `Retry-After`.

## User Stories

* **US-PM-35**: As a `customer`, I want my order status to update within the interval hint without draining my data plan, so that I know when to expect it.
  * **Given** I poll `GET /v1/orders/{id}` with `If-None-Match: W/"order:o1:7"` and the order is still version 7, **Then** I get `304` with `X-Poll-Interval: 15`.
  * **Given** it moved to `InTransit` (version 8), **Then** I get `200` with the new body and `ETag: W/"order:o1:8"`.
* **US-PM-36**: As an `operator`, I want **one** batched sync call for my board that returns only orders changed since my last cursor, so that a busy slot doesn't mean dozens of requests.
  * **Given** `GET /v1/sync?scope=location:L1&since=<cursor>`, **When** 3 orders changed, **Then** `200 { changes: [{ type: "order", id, version, state, updatedAt }], cursor: "<new>", full: false }`; if nothing changed, `304`.
  * **Given** the cursor is older than the change-log retention (default 24 h), **Then** `200 { full: true, … }` with a complete snapshot.
* **US-PM-37**: As a product team, I want a reserved push upgrade path (SSE/WebSocket/web-push) that reuses the same change records, so that moving off polling doesn't require new data models.
  * **Given** a future `GET /v1/stream?scope=…` (SSE), **Then** each message is exactly a `changes[]` element from `/v1/sync`, carries `id: <cursor>` for resume via `Last-Event-ID`, and clients fall back to polling on disconnect.

## Data Model

Change feed (append-only, written in the same unit of work as each aggregate update):
```sql
CREATE TABLE change_log (
  seq INTEGER PRIMARY KEY,               -- Postgres: BIGINT GENERATED ALWAYS AS IDENTITY; D1: INTEGER PRIMARY KEY AUTOINCREMENT
  scope TEXT NOT NULL,                   -- 'location:L1' | 'customer:C1' | 'account:A1' | 'slot:S1'
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  version INTEGER NOT NULL, summary JSONB NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX change_log_scope_seq_idx ON change_log (scope, seq);
```
An order change writes rows for `location:{locationId}`, `customer:{customerId}` and, if shared, `account:{accountId}`. Cursor = opaque base64 of `seq`. Rows older than retention are purged by `idempotency.purge`'s sibling job.

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `GET /v1/orders/{id}` | per [3.3](./03-order-lifecycle-state-machine.md) | `If-None-Match` | `200 Order` / `304` | `404` |
| `GET /v1/orders/{id}/status` | same | `If-None-Match` | `200 { id, state, version, updatedAt, allowedActions, etaHint? }` / `304` (lightweight) | `404` |
| `GET /v1/sync?scope=&since=&limit=` | operator/owner for `location:*`; customer for own `customer:*`/`account:*` | `If-None-Match` | `200 { changes: Change[], cursor, full: boolean, hasMore: boolean }` / `304` | `403 SCOPE_DENIED`, `400 INVALID_CURSOR` |
| `GET /v1/slots/{slotId}/remaining` | any | `If-None-Match` | `200 { offerings: [{ id, remaining, soldOut }], version }` / `304` | — |
| `GET /v1/stream?scope=` | *(reserved, not in MVP)* | `Last-Event-ID` | `text/event-stream` | `501 NOT_IMPLEMENTED` |

`Change` schema: `{ "type": "order"|"account"|"offering"|"notification", "id": string, "version": integer, "state"?: string, "updatedAt": date-time }`.

## Domain Events
None new. The change log is a projection of every domain event that alters a pollable aggregate.

## Invariants
* `version` and `ETag` change if and only if client-visible fields change.
* `/v1/sync` never returns changes outside the caller's authorised scopes.
* A `304` is only returned when the resource is byte-identical to the one the ETag was issued for.
* Push (future) and poll deliver identical `Change` payloads.

## Codegen Notes
* **Modules**: `http/conditional` (ETag/304 middleware), `app/sync` (change-log reader), `core/poll-policy` (pure `pollIntervalFor(resource, now) → seconds`).
* **Client helper** (to generate for adopters): `createPoller({ url, onChange, getInterval })` honouring `X-Poll-Interval`, jitter, visibility pause and backoff; framework-agnostic, with a thin data-fetching-library adapter optional.
* **Tests to generate**: 304 on unchanged; ETag changes on transition; scope filtering; cursor expiry → full snapshot; interval hints per state; client backoff/jitter; request-volume budget test (simulate N clients × interval and assert requests/day under a configurable cap).
