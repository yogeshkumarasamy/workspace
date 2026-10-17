> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.9 Scheduled Jobs

Time-driven behaviour runs as **idempotent jobs** triggered by the `Scheduler` port (cron on an edge runtime, a queue, or a worker loop). Every job is safe to run late, early (it re-checks `Clock.now()`), concurrently, or twice.

## Job Catalogue

| Job | Default trigger | Selects | Action | Idempotency key |
|---|---|---|---|---|
| `calendar.fallback-lock` | every 15 min | `calendar_period` in `draft` whose fallback instant (local weekday+time → UTC) ≤ now | lock period (US-PM-04) | `fallback-lock:{periodId}` |
| `window.open-close` | every 1 min | windows whose `opens_at`/`cutoff_at` crossed since last run | emit `WindowOpened`/`WindowClosed`; optional notifications | `window:{slotId}:{open\|close}` |
| `holds.sweep` | every 1 min | `hold` `Active` with `expires_at ≤ now` (batch ≤ 500) | expire holds; expire their `Draft`/`Placed`/`PaymentPending` orders (T8) | hold id + target state |
| `payments.reconcile` | every 5 min | intents `Pending` > `PT5M` | `fetchStatus` + apply (US-PM-26) | provider event / charge id |
| `orders.auto-complete` | every 15 min | orders in `Ready`/`InTransit`/`Delivered` past `autoCompleteAfter[state]` | T16 | `auto-complete:{orderId}:{version}` |
| `refunds.settle` | every 5 min | `refund` `pending`/`partially_settled`/`failed`(attempts < max) | execute disposition steps; T17 | `refund:{orderId}:{step}` |
| `outbox.dispatch` | every 1 min (or after-commit trigger) | undispatched outbox rows | plan & send notifications | `(event_id, recipient, channel)` |
| `integrity.reconcile` | daily 03:00 location-local | all offerings & accounts | verify capacity counters and ledger balances; emit drift events | `integrity:{date}` |
| `idempotency.purge` | daily | expired idempotency records | delete | — |

A deployment with a cron cap (e.g. 5 triggers) may multiplex: one `every 1 min` trigger runs the 1-minute jobs plus any job whose period divides the current minute.

## User Stories

* **US-PM-31**: As an `owner`, I want unpaid checkouts to release their capacity automatically, so that sell-outs reflect real orders.
  * **Given** a hold expired 30 s ago, **When** `holds.sweep` runs, **Then** the hold becomes `Expired`, `offering.held` decreases, the linked order goes `Expired` (T8), and `OrderExpired { reason: "hold_ttl" }` is emitted.
* **US-PM-32**: As an `owner`, I want stale fulfilment states auto-completed (see US-PM-12) and the default calendar auto-locked (see US-PM-04) without manual intervention.
  * **Given** both jobs run twice in the same minute on two workers, **Then** each target is transitioned exactly once (conditional update on `version`/`state`).
* **US-PM-33**: As an `owner`, I want to see job health (last run, last success, items processed, last error) so that I notice when automation stops.
  * **Given** `holds.sweep` hasn't succeeded in `3 × period`, **Then** `GET /v1/ops/jobs` reports `status="stale"` and an owner in-app alert `JobStale` is queued once per stale episode.
* **US-PM-34**: As an `owner`, I want to trigger a job manually (e.g. after an outage) with a dry-run option, so that I can recover safely.
  * **Given** `POST /v1/ops/jobs/orders.auto-complete:run { dryRun: true }`, **Then** the response lists the orders that would transition and nothing changes.

## Data Model

```sql
CREATE TABLE job_run (
  id TEXT PRIMARY KEY, job TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL, finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running','succeeded','failed','skipped')),
  processed INTEGER NOT NULL DEFAULT 0, error TEXT, triggered_by TEXT NOT NULL -- 'scheduler' | principal id
);
CREATE INDEX job_run_job_idx ON job_run (job, started_at DESC);
CREATE TABLE job_lease (                -- optional single-runner lease
  job TEXT PRIMARY KEY, holder TEXT NOT NULL, lease_until TIMESTAMPTZ NOT NULL
);
```
Lease acquisition: `INSERT … ON CONFLICT (job) DO UPDATE SET holder=:me, lease_until=:t WHERE job_lease.lease_until < now()` (Postgres and SQLite both support `ON CONFLICT … DO UPDATE … WHERE`). Leases are an **optimisation**; correctness relies on per-item conditional updates.

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `GET /v1/ops/jobs` | owner | — | `200 { jobs: [{ job, schedule, lastRunAt, lastSuccessAt, lastProcessed, lastError?, status: "ok"\|"stale"\|"failing" }] }` | — |
| `POST /v1/ops/jobs/{job}:run` | owner | `{ dryRun?: boolean, limit?: int }` | `200 { runId, processed, wouldProcess?: string[] }` | `404 UNKNOWN_JOB`, `409 JOB_RUNNING` |
| `POST /internal/jobs/{job}` | system (scheduler secret / platform binding) | — | `204` | `401 UNAUTHORIZED` |

## Domain Events
`JobRunStarted`, `JobRunSucceeded { processed }`, `JobRunFailed { error }`, `JobStale`, plus the domain events each job causes (`HoldExpired`, `OrderExpired`, `OrderCompleted`, `CalendarPeriodLocked`, `RefundSettled`, `CapacityDriftDetected`, `LedgerDriftDetected`).

## Invariants
* Jobs only perform transitions marked `system` in the transition table and use the same application services as HTTP handlers.
* Each item is processed in its own unit of work; one bad item never blocks the batch.
* Re-running any job with the same `now` produces no additional changes.
* Jobs compute local-time triggers through the location `timezone` (see [3.1](./01-preorder-windows-cutoffs-timezone-rules.md)).

## Codegen Notes
* **Module**: `app/jobs` — each job is `{ name, schedule, select(now, repo, limit), handle(item, ctx) }`; a generic runner records `job_run` rows.
* **Types**: `interface Job<T> { name: string; schedule: string /* cron */; select(now: Date, limit: number): Promise<T[]>; handle(item: T, ctx: JobContext): Promise<'changed'|'unchanged'> }`.
* **Tests to generate**: double-run no-op; concurrent runners; dry-run purity; staleness detection; cron multiplexing under a trigger cap; fallback-lock at DST boundaries; partial batch failure isolation.
