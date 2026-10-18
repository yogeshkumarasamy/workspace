> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.7 Payment Hooks: Intent, Webhook Verification & Reconciliation

The module never talks to a payment vendor directly. It creates **payment intents** through the `PaymentProvider` port, trusts **only verified webhooks** (or a server-side status fetch) to confirm payment, and **reconciles** periodically.

## Payment Intent States

`Created → Pending → Succeeded | Failed | Cancelled | Expired`; `Succeeded → (Refunded | PartiallyRefunded)` via refund records. Client-side "payment success" callbacks are **hints only** and trigger a server-side `fetchStatus`, never a direct confirmation.

## User Stories

* **US-PM-24**: As a `customer`, I want to be redirected to (or shown) a payment step for exactly the payable amount of my checkout group, so that I pay once and only what I owe.
  * **Given** a checkout group with `payableMinor=700 INR`, **When** T3 runs, **Then** `PaymentProvider.createIntent({ amountMinor: 700, currency: "INR", reference: checkoutGroupId, idempotencyKey: "intent:{checkoutGroupId}:{attempt}" })` is called and the response exposes only `{ intentId, clientSecret?, redirectUrl?, expiresAt }` to the client.
  * **Given** the provider call fails with a transient error, **Then** the checkout returns `502 PAYMENT_PROVIDER_UNAVAILABLE`, the order stays `Placed`, and holds remain until TTL.
* **US-PM-25**: As the `system`, I want to accept payment webhooks only after **signature verification** and process each provider event **exactly once**, so that forged or replayed notifications cannot confirm orders.
  * **Given** a webhook with an invalid signature or a timestamp older than `toleranceSeconds` (default 300), **When** received, **Then** respond `401 INVALID_SIGNATURE`, persist nothing except a security log line.
  * **Given** a valid webhook whose `providerEventId` was already processed, **Then** respond `200` with no side effects.
  * **Given** a valid `payment.succeeded` whose amount or currency differs from the intent, **Then** mark intent `Mismatch`, do **not** confirm, emit `PaymentAmountMismatch`, and alert the owner.
* **US-PM-26**: As the `system`, I want a **reconciliation** job to compare intents stuck in `Pending` with the provider's status, so that missed webhooks never leave paid orders unconfirmed.
  * **Given** an intent `Pending` for more than `PT5M`, **When** reconciliation runs, **Then** it calls `PaymentProvider.fetchStatus(intentId)` and applies the same handler as the webhook (same idempotency key = provider event/charge id).
* **US-PM-27**: As an `owner`, I want manual/offline payment confirmation (e.g. bank transfer screenshot verified by staff) behind a feature flag, so that I can operate before a gateway integration exists.
  * **Given** provider `manual` is enabled, **When** an owner calls `:mark-paid` with `{ reference, amountMinor }`, **Then** it is processed through the same success handler with `actorRole=owner` recorded and `verification="manual"`.

## Data Model

| Entity | Key fields |
|---|---|
| `PaymentIntent` | `id`, `checkoutGroupId`, `provider`, `providerIntentId`, `amountMinor`, `currency`, `status`, `clientSecret?` (never logged), `expiresAt`, `verification: webhook\|fetch\|manual`, `createdAt`, `updatedAt`, `version` |
| `PaymentEvent` | `provider`, `providerEventId` (PK pair), `intentId?`, `type`, `payloadHash`, `receivedAt`, `processedAt?`, `result` |
| `ProviderRefund` | `id`, `intentId`, `refundId` (→ [3.6](./06-credits-wallet-ledger-refunds.md) `Refund`), `providerRefundId?`, `amountMinor`, `status: requested\|succeeded\|failed`, `idempotencyKey` |

```sql
CREATE TABLE payment_intent (
  id TEXT PRIMARY KEY, checkout_group_id TEXT NOT NULL REFERENCES checkout_group(id),
  provider TEXT NOT NULL, provider_intent_id TEXT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Created','Pending','Succeeded','Failed','Cancelled','Expired','Mismatch')),
  client_secret TEXT, expires_at TIMESTAMPTZ NOT NULL,
  verification TEXT CHECK (verification IN ('webhook','fetch','manual')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_intent_id)
);
CREATE INDEX payment_intent_pending_idx ON payment_intent (status, updated_at);
CREATE TABLE payment_event (
  provider TEXT NOT NULL, provider_event_id TEXT NOT NULL,
  intent_id TEXT REFERENCES payment_intent(id), type TEXT NOT NULL,
  payload_hash TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ, result TEXT,
  PRIMARY KEY (provider, provider_event_id)
);
CREATE TABLE provider_refund (
  id TEXT PRIMARY KEY, intent_id TEXT NOT NULL REFERENCES payment_intent(id),
  refund_id TEXT NOT NULL REFERENCES refund(id), provider_refund_id TEXT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL CHECK (status IN ('requested','succeeded','failed')),
  idempotency_key TEXT NOT NULL UNIQUE
);
```
Raw webhook payloads are **not** stored by default (only a hash) to minimise PII; adopters may opt in with a retention period.

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/checkouts/{groupId}/payment:retry` | customer (own) | `Idempotency-Key` | `201 { intentId, clientSecret?, redirectUrl?, expiresAt }` | `409 ALREADY_PAID`, `409 HOLDS_EXPIRED`, `502 PAYMENT_PROVIDER_UNAVAILABLE` |
| `POST /v1/checkouts/{groupId}/payment:check` | customer (own) | — | `200 { status, orders: [{ id, state, version }] }` (triggers `fetchStatus`, rate-limited 1/5 s) | `429 RATE_LIMITED` |
| `POST /v1/webhooks/payments/{provider}` | public (signed) | raw body + provider signature headers | `200 {}` | `401 INVALID_SIGNATURE`, `400 UNPARSEABLE_EVENT`, `404 UNKNOWN_PROVIDER` |
| `POST /v1/payment-intents/{id}:mark-paid` | owner (flag `manualPayments`) | `{ reference, amountMinor, note? }` | `200 PaymentIntent` | `403 FEATURE_DISABLED`, `422 AMOUNT_MISMATCH` |
| `GET /v1/payment-intents/{id}` | owner | — | `200 PaymentIntent` (no `clientSecret`) | — |

Webhook handler order (normative): **verify signature on raw bytes → parse → insert `payment_event` (PK conflict ⇒ return 200) → load intent → validate amount/currency → apply order transitions for every order in the group in one unit of work → mark event processed → 200**. Any failure after insert leaves `processed_at NULL` so the provider's retry or reconciliation reprocesses it.

## Domain Events
`PaymentIntentCreated`, `PaymentSucceeded`, `PaymentFailed`, `PaymentIntentExpired`, `PaymentAmountMismatch`, `PaymentWebhookRejected` (security log only), `ProviderRefundRequested`, `ProviderRefundSucceeded`, `ProviderRefundFailed`, `PaymentReconciled { intentId, from, to }`.

## Invariants
* An order reaches `Confirmed` via payment only if its group's intent is `Succeeded` with matching amount and currency.
* Each `(provider, providerEventId)` is processed at most once.
* At most one non-terminal intent per checkout group.
* `SUM(provider_refund.amount WHERE succeeded) ≤ intent.amount`.
* Secrets (`clientSecret`, webhook secrets) are never returned on read endpoints or logged.

## Codegen Notes
* **Module**: `core/payment` (pure intent state machine + `applyPaymentOutcome`), `app/webhooks` (verification orchestration). Vendor specifics live only in `PaymentProvider` adapters ([3.11](./11-extension-points-ports.md)).
* **Types**:
  ```ts
  type IntentStatus = 'Created'|'Pending'|'Succeeded'|'Failed'|'Cancelled'|'Expired'|'Mismatch';
  interface VerifiedPaymentEvent { provider: string; providerEventId: string; type: 'payment.succeeded'|'payment.failed'|'payment.cancelled'|'refund.succeeded'|'refund.failed'; providerIntentId: string; amountMinor: number; currency: string; occurredAt: Date }
  ```
* **Tests to generate**: bad signature / stale timestamp rejected; duplicate event no-op; amount mismatch blocks confirmation; webhook + reconciliation race yields single confirmation; late success after cutoff → T6 + refund; crash after event insert reprocessed; manual provider behind flag; `clientSecret` never serialised on GET.
