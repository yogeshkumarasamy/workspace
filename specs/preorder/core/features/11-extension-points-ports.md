> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.11 Extension Points & Ports

The core is pure and talks to the outside world only through the ports below. Adopting projects implement or configure them; they never edit core modules.

## User Stories

* **US-PM-38**: As an adopting developer, I want every infrastructure dependency behind a typed interface with an **in-memory reference adapter**, so that I can run the full contract test suite without a database or vendors.
  * **Given** the in-memory adapters, **When** the generated contract tests run, **Then** all feature tests in [3.1](./01-preorder-windows-cutoffs-timezone-rules.md)–[3.10](./10-status-sync-polling-contract.md) pass with a `FixedClock` and `SequentialIdGenerator`.
* **US-PM-39**: As an adopting developer, I want to plug in business rules (eligibility, pricing, cancellation) by registering implementations or JSON configs, so that my domain specifics stay in my project.
  * **Given** a custom `EligibilityRule` with id `minimum-group-size`, **When** registered in the module config and referenced by a location, **Then** it is evaluated alongside built-ins and its reason codes appear in `reasons[]`.
* **US-PM-40**: As an adopting developer, I want each port to have a **contract test kit**, so that my production adapter (e.g. D1, Postgres, a payment vendor) is proven equivalent to the reference adapter.
  * **Given** my `HoldRepository` adapter, **When** I run `holdRepositoryContract(factory)`, **Then** it executes the concurrency, idempotency and expiry suites from [3.4](./04-inventory-holds-reservations.md).

## Ports (normative interfaces)

```ts
// Infrastructure
interface UnitOfWork { run<T>(fn: (tx: Repositories) => Promise<T>): Promise<T> } // atomic: state + outbox + change_log
interface Repositories {
  locations: LocationRepository; calendar: CalendarRepository; catalog: CatalogRepository;
  slots: SlotRepository; offerings: OfferingRepository; holds: HoldRepository;
  orders: OrderRepository; checkouts: CheckoutRepository; ledger: LedgerRepository;
  payments: PaymentRepository; policies: PolicyRepository; notifications: NotificationRepository;
  outbox: OutboxRepository; changes: ChangeLogRepository; idempotency: IdempotencyStore; jobs: JobRunRepository;
}
interface Clock { now(): Date }
interface IdGenerator { next(prefix?: string): string } // ULID recommended
interface Scheduler { register(job: Job<unknown>): void; trigger(jobName: string, opts?: { dryRun?: boolean }): Promise<JobRunResult> }

// External services
interface PaymentProvider {
  readonly id: string;
  createIntent(i: { amountMinor: number; currency: string; reference: string; idempotencyKey: string; customer?: { email?: string; phone?: string }; returnUrl?: string }): Promise<{ providerIntentId: string; clientSecret?: string; redirectUrl?: string; expiresAt: Date }>;
  verifyWebhook(rawBody: Uint8Array, headers: Record<string, string>, now: Date): Promise<VerifiedPaymentEvent | { invalid: true; reason: string }>;
  fetchStatus(providerIntentId: string): Promise<{ status: IntentStatus; amountMinor: number; currency: string; providerEventId: string }>;
  refund(r: { providerIntentId: string; amountMinor: number; idempotencyKey: string }): Promise<{ providerRefundId: string; status: 'requested'|'succeeded'|'failed' }>;
}
interface Notifier { readonly channel: Channel; send(n: Notification, contact: ContactPreference | null): Promise<{ status: 'sent'|'handed_off'; providerRef?: string; link?: string }> }

// Business rules
interface EligibilityRule { readonly id: string; evaluate(ctx: { location: FulfilmentLocation; slot: Slot; deliveryPoint?: { lat: number; lng: number }; customerId: string; cart?: CartSnapshot }): Promise<{ eligible: boolean; reasons: string[] }> }
interface PricingRule { readonly id: string; readonly order: number; apply(ctx: PricingContext): PricingAdjustment[] } // adjustments: { code, amountMinor (±), label }
interface CancellationPolicy { readonly id: string; readonly version: number; evaluate(ctx: CancellationContext): CancellationDecision } // see 3.5

// Identity (consumed, not provided)
interface Principal { id: string; role: ActorRole; locationIds?: string[]; accountIds?: string[] }
interface AuthContext { resolve(request: Request): Promise<Principal | null> }
```

## Module Configuration

```ts
interface PreorderModuleConfig {
  currency: string;                       // single currency per deployment
  holdTtl: string;                        // ISO duration, default 'PT10M'
  paymentTtl: string;                     // default 'PT15M'
  cutoffGrace: string;                    // default 'PT0S'
  autoCompleteAfter: Partial<Record<'Ready'|'InTransit'|'Delivered', string>>;
  complaintWindow: string;                // default 'PT24H'
  operatorCompensationLimitMinor: number;
  draftOrders: boolean;                   // server-side drafts on/off
  features: { manualPayments: boolean; sharedAccounts: boolean; batches: boolean };
  rules: { eligibility: string[]; pricing: string[]; cancellationPolicyId: string };
  pollIntervals?: Partial<Record<string, number>>;
  ports: { clock: Clock; ids: IdGenerator; uow: UnitOfWork; payments: Record<string, PaymentProvider>; notifiers: Notifier[]; scheduler: Scheduler; auth: AuthContext;
           eligibility: EligibilityRule[]; pricing: PricingRule[]; cancellation: CancellationPolicy[] };
}
```
Built-in rule implementations shipped with the module: `EligibilityRule` → `radius`, `minOrderValue`, `maxOrdersPerSlotPerCustomer`; `PricingRule` → `fixedFee` (e.g. delivery fee), `percentDiscount`, `bundlePrice`; `CancellationPolicy` → kinds listed in [3.5](./05-cancellations-policies.md).

## Data Model
No new tables. `policy_config` ([3.5](./05-cancellations-policies.md)) stores JSON configs for built-in rules; custom rules are code.

## API Contract

| Method & Path | Role(s) | Response |
|---|---|---|
| `GET /v1/meta/config` | owner | `200 { currency, holdTtl, paymentTtl, cutoffGrace, autoCompleteAfter, features, rules }` (no secrets) |
| `GET /v1/meta/health` | public | `200 { ok: true, version, time }` |

## Domain Events
None. Ports consume/produce the events defined in other features.

## Invariants
* Core modules import nothing from adapters, HTTP, or vendor SDKs (enforced by a lint/boundary rule); the only permitted runtime dependency is a timezone library (or the platform `Temporal` API).
* All time reads go through `Clock`; all ids through `IdGenerator`.
* Business-agnostic names only in core; domain vocabulary lives in adopter config/templates.

## Codegen Notes
* **Suggested module boundaries** (whatever the eventual package layout):
  * `core/*` — pure domain: `schedule`, `catalog`, `capacity`, `eligibility`, `order`, `inventory`, `cancellation`, `ledger`, `payment`, `notifications`, `poll-policy`, `events`.
  * `app/*` — application services orchestrating `UnitOfWork` + effects; `jobs`, `outbox-dispatcher`, `webhooks`, `sync`.
  * `adapters/memory` — reference adapters for every port (+ `FixedClock`, `SequentialIdGenerator`, `FakePaymentProvider` with signing).
  * `adapters/sql` — one implementation targeting Postgres and D1 (SQLite) from the DDL in each feature file.
  * `http` — a thin, framework-agnostic handler layer (fetch `Request → Response`) runnable on edge runtimes or Node.
  * `contract-tests` — exported suites per port + end-to-end scenario tests from [adopting.md](../adopting.md).
* **Tests to generate**: boundary/lint rule that `core` has no runtime deps other than the timezone library; contract suites per port run against memory and SQL adapters; config validation (unknown rule ids, invalid durations).
