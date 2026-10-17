# PRD: Innings Break Console

> **Status**: Approved  
> **Author**: Product Manager (BMAD)  
> **Date**: 2026-09-22  
> **Scope**: `apps/innings-break-console` (Innings Break Ecosystem)  
> **Target Personas**: `Business Owner` (Super-User) & `Operations Manager` (Console Operations Staff)  
> **Canonical Persona Reference**: [.specify/memory/innings-break-personas.md](file:///.specify/memory/innings-break-personas.md)  
> **System Memory Reference**: [.specify/memory/innings-break.md](file:///.specify/memory/innings-break.md)  
> **Customer App Specification**: [specs/innings-break/customer/prd.md](file:///specs/innings-break/customer/prd.md)

---

Back-office PWA for the Business Owner and Operations Managers: ground directory, in-house kitchen menu, operational calendar, order fulfillment, courier dispatch, support and rainout credits.
User stories are split into one file per feature below; problem and personas live in the overview, metrics and MVP scope in their own file.

## Documents

| Doc | Contents |
|---|---|
| [Overview](file:///specs/innings-break/console/overview.md) | §1 Problem Statement, §2 Target Personas |
| [Success Metrics & Scope](file:///specs/innings-break/console/success-metrics-and-scope.md) | §4 Success Metrics, §5 Scope & Out-of-Scope |

## Features (§3 User Stories & Key Requirements)

| § | Feature | Summary | User stories |
|---|---|---|---|
| 3.1 | [Authentication, Access Control & Staff Onboarding (Whitelisted & Invite-Only)](file:///specs/innings-break/console/features/01-authentication-access-control-staff-onboarding.md) | Whitelisted mobile + OTP sign-in, stranger lockout, invite-only Operations Manager onboarding | US-01 – US-03 |
| 3.2 | [Business Presences, Multi-Kitchen Hubs & Delivery Geofencing](file:///specs/innings-break/console/features/02-business-presences-multi-kitchen-hubs-delivery-geofencing.md) | City → Kitchen Hub hierarchy, location-scoped dashboards, delivery radius geofencing | US-04 – US-07 |
| 3.3 | [Active Month Calendar View & Operational Schedule Engine](file:///specs/innings-break/console/features/03-active-month-calendar-view-operational-schedule-engine.md) | Monthly operational calendar, month/week/day controls, Sunday cutoff and fallback, customer pre-order gating | US-08 – US-09 |
| 3.4 | [Areas, Venues & Ground Directory Management](file:///specs/innings-break/console/features/04-areas-venues-ground-directory-management.md) | Decoupled CRUD for Areas, Venues and nested Ground/Pitch facilities with serviceability badges | US-10 – US-13 |
| 3.5 | [Kitchen Menu, Nutrition, Recipes & Dynamic Bundles](file:///specs/innings-break/console/features/05-kitchen-menu-nutrition-recipes-dynamic-bundles.md) | Central menu, nutrition and recipe catalogue, dynamic squad bundles, hub-level stock | US-14 – US-15 |
| 3.6 | [Order Queue, Kitchen Batch Prep & Fulfillment](file:///specs/innings-break/console/features/06-order-queue-kitchen-batch-prep-fulfillment.md) | Day/slot-scoped Kanban order pipeline, 5-stage lifecycle, batch prep sheet, invoices | US-16 – US-19 |
| 3.7 | [Third-Party Delivery Dispatch Coordination](file:///specs/innings-break/console/features/07-third-party-delivery-dispatch-coordination.md) | Manual 3rd-party courier booking with mandatory booking/reference ID audit | US-20 |
| 3.8 | [Help, Support & Quality Grievance Management](file:///specs/innings-break/console/features/08-help-support-quality-grievance-management.md) | Support tab for order-linked grievances and soft-credit compensation | US-21 – US-22 |
| 3.9 | [In-App Soft Credits & Early Rainout Cancellation Engine](file:///specs/innings-break/console/features/09-in-app-soft-credits-early-rainout-cancellation-engine.md) | 1.5h rainout cancellation cutoff and team-wallet soft credits | US-23 – US-24 |

> Features are added or removed as separate files under `features/`; update this table when they change. Decision history lives in the [changelog](file:///.specify/memory/innings-break-changelog.md).
