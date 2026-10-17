> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.6 Credits, Wallet Ledger & Refunds

Credits are stored in an **append-only ledger**. Balance is always derived. Refunds choose a **disposition**: back to credits, back to the original payment method, or a split.

## User Stories

* **US-PM-20**: As a `customer`, I want an account balance (individual or **shared**, e.g. a household/club account that several customers can spend from) built from an auditable history, so that I can trust every credit and debit.
  * **Given** account `A1` with entries `+500 (cancellation_refund)`, `−200 (order_debit)`, **When** I fetch the account, **Then** `balanceMinor=300` and the entries are listed newest first with `reason`, `orderId`, `createdAt`.
  * **Given** I am not a member of shared account `A2`, **When** I read it, **Then** `403 ACCOUNT_ACCESS_DENIED`.
* **US-PM-21**: As a `customer`, I want available credits **auto-applied** at checkout (opt-out allowed), so that I only pay the remainder.
  * **Given** `balance=300`, cart total `1000`, `applyCredits=true`, **When** I check out, **Then** `creditAppliedMinor=300`, `payableMinor=700`; the debit entry is written only when the order reaches `Confirmed` (T4/T5), while a **credit hold** of 300 prevents double-spend meanwhile.
  * **Given** `balance=1500`, total `1000`, **Then** `creditAppliedMinor=1000`, `payableMinor=0`, and the order confirms via T4 without a payment intent.
* **US-PM-22**: As an `owner`, I want to issue manual credits or debits with a mandatory reason, so that goodwill and corrections are traceable.
  * **Given** I post `{ amountMinor: 250, kind: "goodwill", reason: "late delivery" }`, **Then** a `credit` entry with `createdByRole=owner` is appended; there is no endpoint to edit or delete entries — corrections are new `reversal` entries referencing the original.
* **US-PM-23**: As the `system`, I want refunds to execute their disposition exactly once, so that a customer is never refunded twice.
  * **Given** decision `{ refundMinor: 1000, disposition: "split", split: { creditMinor: 300, originalPaymentMinor: 700 } }`, **When** settlement runs, **Then** a `cancellation_refund` credit of 300 is appended (idempotency key `refund:{orderId}:credit`) and a provider refund of 700 is requested (`refund:{orderId}:payment`); T17 fires only after both are recorded as succeeded.
  * **Given** settlement is retried after a crash, **Then** no duplicate entries or provider refunds are created.

## Data Model

| Entity | Key fields |
|---|---|
| `Account` | `id`, `kind: individual\|shared`, `currency`, `status: active\|frozen`, `cachedBalanceMinor`, `version` |
| `AccountMember` | `accountId`, `customerId`, `role: holder\|spender` |
| `LedgerEntry` | `id`, `accountId`, `direction: credit\|debit`, `amountMinor > 0`, `kind`, `reason?`, `orderId?`, `reversesEntryId?`, `idempotencyKey` (unique per account), `createdByRole`, `createdBy?`, `createdAt` |
| `CreditHold` | `id`, `accountId`, `checkoutGroupId`, `amountMinor`, `state: Active\|Captured\|Released`, `expiresAt` |
| `Refund` | `id`, `orderId`, `decisionRef`, `creditMinor`, `originalPaymentMinor`, `ledgerEntryId?`, `providerRefundId?`, `status: pending\|partially_settled\|settled\|failed`, `attempts` |

`kind ∈ { order_debit, cancellation_refund, compensation, goodwill, correction, reversal, expiry }`.

```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('individual','shared')),
  currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen')),
  cached_balance_minor INTEGER NOT NULL DEFAULT 0 CHECK (cached_balance_minor >= 0),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE account_member (
  account_id TEXT NOT NULL REFERENCES account(id), customer_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('holder','spender')),
  PRIMARY KEY (account_id, customer_id)
);
CREATE TABLE ledger_entry (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES account(id),
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  kind TEXT NOT NULL, reason TEXT, order_id TEXT, reverses_entry_id TEXT REFERENCES ledger_entry(id),
  idempotency_key TEXT NOT NULL,
  created_by_role TEXT NOT NULL, created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, idempotency_key)
);
-- Postgres: enforce append-only (raise, never silently ignore)
CREATE FUNCTION ledger_append_only() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'ledger_entry is append-only'; END $$;
CREATE TRIGGER ledger_no_update_delete BEFORE UPDATE OR DELETE ON ledger_entry
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();
-- D1/SQLite equivalent:
-- CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger_entry BEGIN SELECT RAISE(ABORT,'append-only'); END;
-- CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger_entry BEGIN SELECT RAISE(ABORT,'append-only'); END;
CREATE TABLE credit_hold (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES account(id),
  checkout_group_id TEXT NOT NULL, amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  state TEXT NOT NULL CHECK (state IN ('Active','Captured','Released')), expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE refund (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES "order"(id), decision_ref TEXT NOT NULL,
  credit_minor INTEGER NOT NULL DEFAULT 0, original_payment_minor INTEGER NOT NULL DEFAULT 0,
  ledger_entry_id TEXT, provider_refund_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','partially_settled','settled','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, UNIQUE (order_id, decision_ref)
);
```
Writes: append entry and update `cached_balance_minor = cached_balance_minor ± amount, version = version + 1 WHERE id=? AND version=?` in the same transaction; a debit additionally requires `cached_balance_minor − activeCreditHolds ≥ amount`.

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `GET /v1/accounts/{id}` | member, owner | — | `200 { id, kind, currency, balanceMinor, availableMinor, members[] }` + `ETag` | `403 ACCOUNT_ACCESS_DENIED` |
| `GET /v1/accounts/{id}/entries?cursor=&limit=` | member, owner | — | `200 { items: LedgerEntry[], nextCursor? }` | — |
| `POST /v1/accounts/{id}/entries` | owner | `Idempotency-Key`; `{ direction, amountMinor, kind: "goodwill"\|"correction"\|"reversal", reason, reversesEntryId? }` | `201 LedgerEntry` | `422 INSUFFICIENT_BALANCE`, `422 REASON_REQUIRED`, `409 ACCOUNT_FROZEN`, `409 ALREADY_REVERSED` |
| `POST /v1/accounts` | customer, owner | `{ kind, currency }` | `201 Account` | — |
| `POST /v1/accounts/{id}/members` | holder, owner | `{ customerId, role }` | `201 AccountMember` | `409 ALREADY_MEMBER` |
| `GET /v1/orders/{id}/refund` | customer (own), owner | — | `200 Refund` | `404 REFUND_NOT_FOUND` |

`availableMinor = balanceMinor − SUM(active credit holds)`.

## Domain Events
`AccountOpened`, `AccountMemberAdded`, `LedgerEntryAppended { direction, amountMinor, kind, balanceAfterMinor }`, `CreditHoldPlaced`, `CreditHoldCaptured`, `CreditHoldReleased`, `RefundRequested`, `RefundSettled`, `RefundFailed`.

## Invariants
* Ledger rows are never updated or deleted.
* `cached_balance_minor == SUM(credit) − SUM(debit)` per account (reconciled nightly; drift ⇒ `LedgerDriftDetected`, account auto-`frozen`).
* Balance never negative; `availableMinor ≥ 0`.
* A reversal references exactly one entry; an entry can be reversed at most once.
* Every refund disposition is executed at most once per `(orderId, decisionRef)`.

## Codegen Notes
* **Module**: `core/ledger` (pure: `deriveBalance`, `planDebit`, `planRefund`); persistence via `LedgerRepository` port.
* **Types**:
  ```ts
  type EntryKind = 'order_debit'|'cancellation_refund'|'compensation'|'goodwill'|'correction'|'reversal'|'expiry';
  interface LedgerEntry { id: string; accountId: string; direction: 'credit'|'debit'; amountMinor: number; kind: EntryKind; orderId?: string; reversesEntryId?: string; idempotencyKey: string; createdAt: Date }
  const deriveBalance = (entries: LedgerEntry[]) => entries.reduce((b, e) => b + (e.direction === 'credit' ? e.amountMinor : -e.amountMinor), 0);
  interface LedgerRepository { append(e: NewLedgerEntry, expectedVersion: number): Promise<{ entry: LedgerEntry; balanceAfterMinor: number }>; list(accountId: string, cursor?: string): Promise<Page<LedgerEntry>> }
  ```
* **Tests to generate**: derived = cached after random sequences (property test); negative balance rejection; credit hold prevents double spend across two concurrent checkouts; idempotent refund settlement after simulated crash between steps; reversal-once rule; append-only enforcement (trigger raises); shared account membership checks.
