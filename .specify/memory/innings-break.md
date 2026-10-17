# Innings Break Project Memory

> **Purpose**: Stable, high-level overview of the Innings Break ecosystem — vision, problem, solution concept, components, and the decisions currently in force. Kept short and rarely changed.  
> **Not here**: History → [changelog](file:///.specify/memory/innings-break-changelog.md); feature detail → PRDs (see §6 Docs Map).

---

## 1. Problem Statement

Chennai weekend leather-ball cricket is played on often **remote grounds with no water, food, or refreshments**. A match day (commute + two 20/25-over innings + innings break + commute back) spans **5–6 hours** in the heat, and most players skip meals and hydration.

**Key insight:** the blocker is **team coordination**, not logistics. Squads are fluid, so individual apps (Swiggy/Zomato) produce fragmented orders that leave most players out, and per-item delivery fees (₹80 juice + ₹60–80 delivery) make them uneconomical. No app thinks in teams, match days, or grounds.

## 2. Solution Concept

**Innings Break** is a **team-level pre-order and delivery platform**: the Team Manager places one consolidated pre-order of refreshments for the whole squad before match day, and it is delivered to the ground.

* **The team is the unit of ordering** — no individual orders. Delivery cost is amortized across the squad, so per-person prices stay near base price; margin is built into item pricing.
* **Upfront UPI only** — no COD, no post-delivery payment; no payment = no order. Zero-cost UPI integration preferred.
* **In-house kitchen** — all food and beverages are prepared by the business; delivery is done by third-party couriers.
* **Scope** — Chennai only, weekend (and Console-activated holiday) matches, leather-ball grounds for ordering in MVP.

## 3. Ecosystem Components

| App | Directory | Users | Purpose |
|---|---|---|---|
| **Innings Break** | `apps/innings-break` | Team Manager | Schedule matches, pre-order for the squad, pay via UPI, track orders, team wallet. |
| **Innings Break Console** | `apps/innings-break-console` | Business Owner, Operations Manager | Grounds, kitchen hubs, menu, calendar, fulfillment, dispatch, support & credits. |
| **Innings Break API** | `apps/innings-break-api` | (Backend) | Node.js + Express REST services for both apps, including spatial resolution and geofencing. |

**Platform**: Both client apps are **responsive web + PWA** (installable to home screen). Native iOS/Android apps are deferred.

## 4. Key Decisions in Force

* **Decoupled locations**: `Areas`, `Venues`, and nested `Ground Facilities / Pitches` are managed independently in the Console with **no manual mapping** (Venues have no Area dropdown). The API resolves proximity, area clustering, and delivery geofencing (straight-line Haversine) for customer search.
* **Kitchen Hubs**: City ➔ Kitchen Hub hierarchy with a delivery-radius geofence. MVP runs **one Primary Kitchen in Chennai**; data model is multi-kitchen ready. Operations Managers are scoped to their assigned hub.
* **Console access**: Mobile + SMS OTP, **whitelist only** — one pre-seeded Business Owner, invited Operations Managers; unknown numbers are blocked.
* **Customer access**: Sign-up requires a CricHeroes Team Profile link and OTP-verified mobile; later logins are Mobile + OTP only. Roster is seeded once from CricHeroes (no recurring sync).
* **Operational calendar gating**: Team Managers can only schedule/pre-order on days marked active in the Console calendar. Unconfigured weeks fall back to Saturday & Sunday; the upcoming-week cutoff is Sunday 2:00 PM IST.
* **Match slots**: Three daytime slots — `6:30 AM`, `10:30 AM`, `2:30 PM`. Floodlight evening slots are deferred.
* **Order lifecycle**: `Confirmed` (UPI paid) ➔ `Accepted` ➔ `Preparing` ➔ `In Transit` (mandatory courier booking/reference ID) ➔ `Delivered / Completed`.
* **Delivery handoff**: Every order carries Primary (Team Manager) + Secondary (on-field teammate) contacts and gate notes. Couriers are booked manually (e.g. Dunzo, Porter, direct courier).
* **Rainouts & credits**: Self-service cancellation up to **1.5 hours** before the slot gives a 100% **in-app soft credit**; no cash refunds. Credits live in a **Team-level wallet** (stays with the team if managers rotate) and auto-apply on the next order. Later cancellations go through Support.
* **Player collaboration**: Players never get accounts; the Team Manager may send zero-login WhatsApp polling links whose choices import into the draft order. Squads support up to 13 players (2 Super Subs).

## 5. Personas

Personas and their boundaries are defined canonically in [innings-break-personas.md](file:///.specify/memory/innings-break-personas.md): **Team Manager**, **Business Owner**, **Operations Manager** (app users), plus **Player** and **Delivery** (no app access). Do not redefine them here.

## 6. Docs Map

| Doc | What it holds |
|---|---|
| [innings-break.md](file:///.specify/memory/innings-break.md) | This stable overview |
| [innings-break-personas.md](file:///.specify/memory/innings-break-personas.md) | Canonical personas & applications glossary |
| [innings-break-changelog.md](file:///.specify/memory/innings-break-changelog.md) | Append-only decision log (Sessions 1–26 onward) |
| [Console PRD index](file:///specs/innings-break/console/prd.md) | Innings Break Console — Approved; per-feature files under `console/features/` |
| [Customer PRD index](file:///specs/innings-break/customer/prd.md) | Innings Break (Team Manager app) — Draft; per-feature files under `customer/features/` |
