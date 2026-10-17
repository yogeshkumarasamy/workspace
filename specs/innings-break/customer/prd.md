# PRD: Innings Break Customer App (Team Manager App)

> **Status**: Draft (Initial Scaffolding for Review & Iteration)  
> **Author**: Product Manager (BMAD / SDD)  
> **Date**: 2026-09-26  
> **Scope**: `apps/innings-break` (Innings Break Customer Application)  
> **Target Persona**: `Team Manager` (Logistics Coordinator for Cricket Squads)  
> **Canonical Persona Reference**: [.specify/memory/innings-break-personas.md](file:///.specify/memory/innings-break-personas.md)  
> **System Memory Reference**: [.specify/memory/innings-break.md](file:///.specify/memory/innings-break.md)  
> **Back-Office Specification**: [specs/innings-break/console/prd.md](file:///specs/innings-break/console/prd.md)

---

Mobile-first PWA for the Team Manager: sign-up and squad roster, match scheduling, multi-match pre-ordering, squad polling, UPI checkout, order tracking, rainout wallet, support and credits ledger.
User stories are split into one file per feature below; problem and personas live in the overview, metrics and MVP scope in their own file.

## Documents

| Doc | Contents |
|---|---|
| [Overview](file:///specs/innings-break/customer/overview.md) | §1 Problem Statement, §2 Target Personas |
| [Success Metrics & Scope](file:///specs/innings-break/customer/success-metrics-and-scope.md) | §4 Success Metrics, §5 Scope & Out-of-Scope |

## Features (§3 User Stories & Key Requirements)

| § | Feature | Summary | User stories |
|---|---|---|---|
| 3.1 | [Authentication, Team Profile & CricHeroes Team Onboarding](file:///specs/innings-break/customer/features/01-authentication-team-profile-cricheroes-team-onboarding.md) | CricHeroes-backed sign-up, mobile OTP login, team roster and per-week manager delegation | US-01 – US-03 |
| 3.2 | [Post-Login Landing: Monthly Calendar View, Active Week Selection & Schedule Gating](file:///specs/innings-break/customer/features/02-post-login-landing-monthly-calendar-view-active-week-selection-schedule-gating.md) | Monthly calendar landing with active week focus, gated by Console schedule | US-04 |
| 3.3 | [Match Scheduling Flow: Hierarchical Ground Search, Slots & Optional Squad Curation](file:///specs/innings-break/customer/features/03-match-scheduling-flow-hierarchical-ground-search-slots-optional-squad-curation.md) | 4-step scheduling modal: date, hierarchical ground search, daytime slot, optional squad | US-05 |
| 3.4 | [Multi-Match Weekend Pre-Ordering & Contextual Match Switcher](file:///specs/innings-break/customer/features/04-multi-match-weekend-pre-ordering-contextual-match-switcher.md) | Contextual match switcher with isolated carts and single partitioned UPI checkout | US-06 |
| 3.5 | [Menu Browsing, In-House Sports Nutrition & Per-Item Player Assignment](file:///specs/innings-break/customer/features/05-menu-browsing-in-house-sports-nutrition-per-item-player-assignment.md) | Sports nutrition menu, blind bulk vs per-item player assignment (up to 13 players) | US-07 – US-08 |
| 3.6 | [Squad Menu Polling & WhatsApp Link Preference Collection (Pre-Order Squad Collaboration)](file:///specs/innings-break/customer/features/06-squad-menu-polling-whatsapp-link-preference-collection.md) | Zero-login WhatsApp polling links per player with 1-tap import to cart | US-09 |
| 3.7 | [Consolidated Order Summary, Cart Adjustments & Dual Delivery Contacts](file:///specs/innings-break/customer/features/07-consolidated-order-summary-cart-adjustments-dual-delivery-contacts.md) | Order summary, in-cart adjustments and mandatory dual delivery contacts | US-10 |
| 3.8 | [Upfront UPI Payment, Confirmation & Payment Failure Recovery](file:///specs/innings-break/customer/features/08-upfront-upi-payment-confirmation-payment-failure-recovery.md) | Upfront UPI payment, confirmation and 1-tap retry on failure | US-11 |
| 3.9 | [Orders Page: Order History, Textual Status Sync & Digital Invoices](file:///specs/innings-break/customer/features/09-orders-page-order-history-textual-status-sync-digital-invoices.md) | Orders page with textual status sync and digital invoices | US-12 |
| 3.10 | [Early Rainout Cancellation Engine ($\ge 1.5\text{h}$) & Persistent Team Wallet](file:///specs/innings-break/customer/features/10-early-rainout-cancellation-engine-persistent-team-wallet.md) | Self-service rainout cancellation (≥ 1.5h) and persistent Team Wallet | US-13 |
| 3.11 | [Dedicated Help & Support Screen & Order-Linked Grievance Tracking](file:///specs/innings-break/customer/features/11-dedicated-help-support-screen-order-linked-grievance-tracking.md) | Help & Support screen with order-linked grievance tracking | US-14 |
| 3.12 | [Dedicated Team Credits & Wallet Refund Ledger (Order-Linked Financial History)](file:///specs/innings-break/customer/features/12-dedicated-team-credits-wallet-refund-ledger.md) | Team Credits ledger of wallet deposits and redemptions | US-15 |

> Features are added or removed as separate files under `features/`; update this table when they change. Decision history lives in the [changelog](file:///.specify/memory/innings-break-changelog.md).
