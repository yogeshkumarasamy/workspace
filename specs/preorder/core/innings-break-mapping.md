> ← Back to [PRD: Pre-Order Core Module — Index](./prd.md)

# Innings Break → Pre-Order Core Mapping

> **Dependency**: The per-feature Innings Break files linked below are introduced by **PR #59** (`docs/innings-break-restructure`, unmerged at time of writing). Links are relative and assume PR #59 lands on `main`; until then they resolve only on that branch. On current `main` the same stories live in the monolithic [console PRD](../../innings-break/console/prd.md) and [customer PRD](../../innings-break/customer/prd.md).

This document records which Innings Break user stories were **generalised** into this module and which **stay project-specific**. It is the only document in `specs/preorder/` that uses Innings Break vocabulary. Innings Break personas remain canonical in their own persona file; this module only defines generic roles.

## Role Mapping

| Innings Break persona | Module role | Notes |
|---|---|---|
| Business Owner | `owner` | Full configuration |
| Operations Manager | `operator` | Scoped to assigned kitchen hub(s) → `Principal.locationIds` |
| Team Manager / Primary Team Manager | `customer` acting on a shared `Account` (the team) | Delegation tokens are project-specific |
| Courier (Dunzo/Porter etc.) | passive party | Dispatch metadata only |

## Console App

| Innings Break feature | User stories | Classification | Generic module coverage | Stays project-specific |
|---|---|---|---|---|
| [Console 3.1 Auth & Staff Onboarding](../../innings-break/console/features/01-authentication-access-control-staff-onboarding.md) | US-01, US-02, US-03 | Partial | Role model `owner`/`operator` + location scoping ([3.11](./features/11-extension-points-ports.md) `Principal.locationIds`) | SMS-OTP login, whitelist/invite flow, Team Members UI (auth is out of module scope) |
| [Console 3.2 Business Presences, Hubs & Geofencing](../../innings-break/console/features/02-business-presences-multi-kitchen-hubs-delivery-geofencing.md) | US-04, US-05, US-06, US-07 | Mostly generic | Fulfilment locations, `radius` eligibility, window cutoff rules ([3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md), [3.2](./features/02-catalog-offerings-capacity.md)) | City → hub hierarchy & primary-hub designation, location switcher UI |
| [Console 3.3 Calendar & Schedule Engine](../../innings-break/console/features/03-active-month-calendar-view-operational-schedule-engine.md) | US-08, US-09 | Generic | Operating calendar, overrides, fallback lock, cutoffs ([3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md), [3.9](./features/09-scheduled-jobs.md)) | Specific weekday/hour values (Thursday lock, Sunday post-lunch cutoff) become config |
| [Console 3.4 Areas, Venues & Grounds](../../innings-break/console/features/04-areas-venues-ground-directory-management.md) | US-10 – US-13 | Project-specific | Only `deliveryPoint {lat,lng,label,instructions}` on the order ([3.3](./features/03-order-lifecycle-state-machine.md)) | Area/venue/ground directory, facility types, media, maps links |
| [Console 3.5 Menu, Nutrition & Bundles](../../innings-break/console/features/05-kitchen-menu-nutrition-recipes-dynamic-bundles.md) | US-14, US-15 | Mostly generic | Catalog items, bundles, per-location availability toggle ([3.2](./features/02-catalog-offerings-capacity.md)) | Nutrition facts / dietary tags live in `attributes` JSON; recipe content |
| [Console 3.6 Order Queue, Batch Prep & Fulfilment](../../innings-break/console/features/06-order-queue-kitchen-batch-prep-fulfillment.md) | US-16 – US-19 | Mostly generic | State machine incl. auto-complete, acknowledge (Accepted), prep aggregate, polling board ([3.3](./features/03-order-lifecycle-state-machine.md), [3.2](./features/02-catalog-offerings-capacity.md), [3.10](./features/10-status-sync-polling-contract.md)) | Kanban UI, invoice layout/printing/tax presentation |
| [Console 3.7 Third-Party Delivery Dispatch](../../innings-break/console/features/07-third-party-delivery-dispatch-coordination.md) | US-20 | Partial | `dispatch` transition with `{partner, trackingRef}` metadata ([3.3](./features/03-order-lifecycle-state-machine.md)) | Named courier partners, mandatory booking-detail form |
| [Console 3.8 Help, Support & Grievances](../../innings-break/console/features/08-help-support-quality-grievance-management.md) | US-21, US-22 | Partial | Compensation requests + approval limits + ledger credit ([3.5](./features/05-cancellations-policies.md), [3.6](./features/06-credits-wallet-ledger-refunds.md)) | Support tab UI, investigation notes workflow |
| [Console 3.9 Soft Credits & Rainout Cancellation](../../innings-break/console/features/09-in-app-soft-credits-early-rainout-cancellation-engine.md) | US-23, US-24 | Generic engine, specific policy | `timeBeforeFulfilment` policy (≥ `PT90M`), credit disposition, ledger ([3.5](./features/05-cancellations-policies.md), [3.6](./features/06-credits-wallet-ledger-refunds.md)) | Weather/rainout as the `external_event` cause; credits-only (no cash) is a policy choice |

## Customer App

| Innings Break feature | User stories | Classification | Generic module coverage | Stays project-specific |
|---|---|---|---|---|
| [Customer 3.1 Auth, Team Profile & Team Onboarding](../../innings-break/customer/features/01-authentication-team-profile-cricheroes-team-onboarding.md) | US-01, US-02, US-03 | Partial | Shared accounts & membership ([3.6](./features/06-credits-wallet-ledger-refunds.md)) | Mobile OTP sign-up, sports-network team link, roster seeding, tokenised weekly delegation |
| [Customer 3.2 Calendar Landing & Schedule Gating](../../innings-break/customer/features/02-post-login-landing-monthly-calendar-view-active-week-selection-schedule-gating.md) | US-04 | Generic | Calendar read API + window gating + `serverNow` ([3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md)) | Calendar UI, active-week pre-selection |
| [Customer 3.3 Match Scheduling: Ground Search & Slots](../../innings-break/customer/features/03-match-scheduling-flow-hierarchical-ground-search-slots-optional-squad-curation.md) | US-05 | Partial | Slot selection, eligibility of delivery point ([3.1](./features/01-preorder-windows-cutoffs-timezone-rules.md), [3.2](./features/02-catalog-offerings-capacity.md)) | Hierarchical ground search, optional squad curation |
| [Customer 3.4 Multi-Match Weekend Pre-Ordering](../../innings-break/customer/features/04-multi-match-weekend-pre-ordering-contextual-match-switcher.md) | US-06 | Generic | Checkout group: many orders, one payment ([3.3](./features/03-order-lifecycle-state-machine.md), [3.7](./features/07-payment-hooks-intent-webhooks-reconciliation.md)) | Contextual match-switcher UI |
| [Customer 3.5 Menu Browsing & Per-Item Player Assignment](../../innings-break/customer/features/05-menu-browsing-in-house-sports-nutrition-per-item-player-assignment.md) | US-07, US-08 | Partial | Offerings with remaining/sold-out + eligibility ([3.2](./features/02-catalog-offerings-capacity.md), [3.4](./features/04-inventory-holds-reservations.md)) | Per-item player assignment (store in `order.metadata` / own table) |
| [Customer 3.6 Squad Menu Polling & Messaging-Link Preferences](../../innings-break/customer/features/06-squad-menu-polling-whatsapp-link-preference-collection.md) | US-09 | Project-specific | `share_link` notifier channel only ([3.8](./features/08-notifications.md)) | Squad preference polls and their tallies (this is a *vote*, not status polling) |
| [Customer 3.7 Order Summary, Cart Adjustments & Dual Contacts](../../innings-break/customer/features/07-consolidated-order-summary-cart-adjustments-dual-delivery-contacts.md) | US-10 | Mostly generic | Holds, quantity edits, pricing rules, `recipient` contact ([3.4](./features/04-inventory-holds-reservations.md), [3.3](./features/03-order-lifecycle-state-machine.md), [3.11](./features/11-extension-points-ports.md)) | Dual delivery contacts beyond `recipient` (adopter metadata) |
| [Customer 3.8 Upfront UPI Payment & Failure Recovery](../../innings-break/customer/features/08-upfront-upi-payment-confirmation-payment-failure-recovery.md) | US-11 | Generic | Payment intents, webhooks, retry, reconciliation, manual provider ([3.7](./features/07-payment-hooks-intent-webhooks-reconciliation.md)) | UPI as the concrete provider adapter |
| [Customer 3.9 Orders Page & Status Sync](../../innings-break/customer/features/09-orders-page-order-history-textual-status-sync-digital-invoices.md) | US-12 | Generic | Order history, polling contract with ETag/304 ([3.3](./features/03-order-lifecycle-state-machine.md), [3.10](./features/10-status-sync-polling-contract.md)) | Invoice rendering |
| [Customer 3.10 Rainout Cancellation & Team Wallet](../../innings-break/customer/features/10-early-rainout-cancellation-engine-persistent-team-wallet.md) | US-13 | Generic engine, specific policy | Cancellation policy + shared-account balance ([3.5](./features/05-cancellations-policies.md), [3.6](./features/06-credits-wallet-ledger-refunds.md)) | Rainout wording, ≥ 1.5 h value as config |
| [Customer 3.11 Help & Support / Grievance Tracking](../../innings-break/customer/features/11-dedicated-help-support-screen-order-linked-grievance-tracking.md) | US-14 | Partial | Cancellation requests (`pending_review`) and compensations ([3.5](./features/05-cancellations-policies.md)) | Support screen UI, ticket conversation |
| [Customer 3.12 Team Credits & Wallet Ledger](../../innings-break/customer/features/12-dedicated-team-credits-wallet-refund-ledger.md) | US-15 | Generic | Append-only ledger, order-linked entries ([3.6](./features/06-credits-wallet-ledger-refunds.md)) | Team-branded history UI |

## Vocabulary Translation

| Innings Break term | Module term |
|---|---|
| Kitchen Hub | Fulfilment location |
| Match slot (daytime slot) | Slot |
| Match date / operating week | Operating day / calendar period |
| Team Pack / Dynamic Bundle | Bundle |
| Kitchen prep sheet | Prep aggregate per batch |
| Order statuses Unaccepted/Confirmed, Accepted, Preparing, In Transit, Delivered | `Confirmed`, `Confirmed` + `acknowledgedAt` (T18), `Preparing`, `InTransit`, `Delivered` → `Completed` |
| Team Wallet / In-App Soft Credits | Shared account / ledger credits |
| Rainout cancellation (≥ 1.5 h) | `timeBeforeFulfilment` policy, cause `external_event`, `minLead: PT90M`, disposition `credit` |
| Ground serviceability geofence | `radius` eligibility rule |
| Thursday default-schedule lock | `fallbackLock` |
| Squad menu poll | *(no equivalent — project-specific)* |
| Textual status sync / real-time polling dashboard | Polling contract ([3.10](./features/10-status-sync-polling-contract.md)) |

## Left Behind (summary)

* Authentication (mobile OTP, whitelist, invites), team onboarding via an external sports network, roster seeding, tokenised delegation.
* Area → venue → ground directory, facility types, media.
* Squad preference polls, per-item player assignment, messaging-group share flows.
* Named courier partners and their booking forms; invoice/tax presentation; all UI.

## Decisions Recorded

1. **Specs before code**: no Innings Break code exists, so the module is derived purely from the PRDs (AGENTS.md "No Code Without a Spec").
2. **"Accepted" is not a state**: the Innings Break "Accepted" column maps to the non-state `acknowledge` action (T18) to keep the core machine minimal; an adopter UI can render a separate column from `acknowledgedAt`.
3. **Credits-only refunds are policy**, not core behaviour — the module supports `credit`, `original_payment` and `split`.
4. **Polling first**: matching the Innings Break PRDs (no websockets/SSE/push specified), the module specifies polling with ETag/304 and reserves a push endpoint.
