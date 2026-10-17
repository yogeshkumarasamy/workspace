# PRD: Pre-Order Core Module

> **Status**: Draft (Extracted from Innings Break PRDs — awaiting human approval per AGENTS.md "No Code Without a Spec" lifecycle)  
> **Author**: Product Manager (BMAD / SDD)  
> **Date**: 2026-10-17  
> **Scope**: `preorder` / `core` — business-agnostic pre-order engine (spec only; no `apps/` or `packages/` code yet). Written so code can be generated from it later.  
> **Source**: Generalised from the Innings Break Console and Customer PRDs — see [Innings Break mapping](./innings-break-mapping.md).  
> **Adoption Guide**: [adopting.md](./adopting.md)

---

A reusable domain module for any business that takes orders **before** a scheduled fulfilment: time-boxed pre-order windows with cutoffs in a business timezone, capacity-limited offerings, an explicit order state machine, inventory holds that never oversell, pluggable cancellation policies, an append-only credits ledger, payment-provider hooks, notifications, scheduled jobs, and a polling-friendly status contract.
User stories are split into one file per feature below; problem and personas live in the overview, metrics and scope in their own file. Every feature file carries user stories with Given/When/Then acceptance criteria, a data model with suggested SQL, an API contract, domain events, invariants, and **Codegen notes**.

## Documents

| Doc | Contents |
|---|---|
| [Overview](./overview.md) | §1 Problem Statement, §2 Roles, §2.3 Glossary |
| [Success Metrics & Scope](./success-metrics-and-scope.md) | §4 Success Metrics, §5 Scope & Out-of-Scope |
| [Adopting Guide](./adopting.md) | How a new pre-order business plugs in (config, rules, adapters) with two worked examples |
| [Innings Break Mapping](./innings-break-mapping.md) | Which Innings Break features / user stories map to this module vs stay project-specific |

## Features (§3 User Stories & Key Requirements)

| § | Feature | Summary | User stories |
|---|---|---|---|
| 3.1 | [Pre-Order Windows, Cutoffs & Timezone Rules](./features/01-preorder-windows-cutoffs-timezone-rules.md) | Operating calendar, window open/cutoff/fulfilment instants in an IANA timezone, DST rules | US-PM-01 – US-PM-04 |
| 3.2 | [Catalog, Offerings & Capacity](./features/02-catalog-offerings-capacity.md) | Catalog items, bundles, fulfilment slots, offerings with capacity, batches, eligibility | US-PM-05 – US-PM-08 |
| 3.3 | [Order Lifecycle State Machine](./features/03-order-lifecycle-state-machine.md) | Explicit transition table, guards, actors, domain events, checkout groups | US-PM-09 – US-PM-12 |
| 3.4 | [Inventory Holds & Reservations](./features/04-inventory-holds-reservations.md) | Reserve / commit / release / expire with TTL, idempotency keys, no oversell | US-PM-13 – US-PM-16 |
| 3.5 | [Cancellations & Policies](./features/05-cancellations-policies.md) | Pluggable cancellation policies (time-before-fulfilment, staged refunds, escalation) | US-PM-17 – US-PM-19 |
| 3.6 | [Credits, Wallet Ledger & Refunds](./features/06-credits-wallet-ledger-refunds.md) | Append-only ledger, derived balance, shared accounts, auto-apply, refund dispositions | US-PM-20 – US-PM-23 |
| 3.7 | [Payment Hooks: Intent, Webhook Verification & Reconciliation](./features/07-payment-hooks-intent-webhooks-reconciliation.md) | Provider-agnostic payment intents, signed webhooks, idempotent processing, reconciliation | US-PM-24 – US-PM-27 |
| 3.8 | [Notifications](./features/08-notifications.md) | Transactional outbox, channels, templates, in-app feed | US-PM-28 – US-PM-30 |
| 3.9 | [Scheduled Jobs](./features/09-scheduled-jobs.md) | Fallback lock, auto-complete, hold/payment/draft expiry, reconciliation, idempotent runs | US-PM-31 – US-PM-34 |
| 3.10 | [Status Sync: Polling Contract & Future Push](./features/10-status-sync-polling-contract.md) | Versioned status resources, ETag/`updatedAt`, batched polling, interval hints, push upgrade path | US-PM-35 – US-PM-37 |
| 3.11 | [Extension Points & Ports](./features/11-extension-points-ports.md) | Repository/UnitOfWork, Clock, IdGenerator, PaymentProvider, Notifier, Scheduler, EligibilityRule, PricingRule, CancellationPolicy | US-PM-38 – US-PM-40 |

## Cross-Cutting Conventions (apply to every feature file)

| Concern | Convention |
|---|---|
| **API base** | `/v1`, JSON (`application/json; charset=utf-8`), resource ids are opaque strings (ULID recommended). |
| **Money** | Integer **minor units** (`amountMinor: integer`) + ISO 4217 `currency` string. Never floats. |
| **Time** | All instants stored and transmitted as UTC ISO 8601 (`2026-10-17T07:00:00Z`). Business-local rules carry an IANA `timezone` (e.g. `Asia/Kolkata`, `Europe/London`). |
| **Idempotency** | All mutating endpoints accept `Idempotency-Key` header (1–128 chars). Same key + same body ⇒ same response replayed; same key + different body ⇒ `409 IDEMPOTENCY_KEY_REUSED`. |
| **Concurrency** | Mutable aggregates carry `version: integer`. Updates accept `If-Match: "<version>"`; mismatch ⇒ `412 VERSION_CONFLICT`. |
| **Error envelope** | `{ "error": { "code": "UPPER_SNAKE", "message": "human text", "details": { } } }` with HTTP status per table in each feature. |
| **Roles** | `owner`, `operator`, `customer`, `system` (see [Overview §2](./overview.md)). Every endpoint declares **Authorized Role(s)**. |
| **SQL** | Each feature gives Postgres DDL; D1/SQLite differences are noted inline (`TEXT` for timestamps/JSON, `INTEGER` for booleans, no `ENUM` → `CHECK`). |
| **Events** | Domain events are past-tense (`OrderConfirmed`), carry `{ id, type, occurredAt, aggregateId, aggregateVersion, payload }`, and are written to an outbox in the same unit of work as the state change. |

> Features are added or removed as separate files under `features/`; update this table when they change.
