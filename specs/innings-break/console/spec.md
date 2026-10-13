# Technical Specification: Innings Break Console

> **Ref PRD**: [specs/innings-break/console/prd.md](file:///specs/innings-break/console/prd.md) (Status: Approved, 2026-09-22)  
> **Status**: Draft - Awaiting Approval  
> **Author**: System Architect (BMAD Phase 2)  
> **Date**: 2026-10-14  
> **Scope**: `apps/innings-break-console` (Console PWA), the Console-facing slice of `apps/innings-break-api`, and a new shared package `packages/innings-break-domain`  
> **Personas**: `Business Owner`, `Operations Manager` (canonical: [innings-break-personas.md](file:///.specify/memory/innings-break-personas.md))  
> **Companion docs**: [plan.md](file:///specs/innings-break/console/plan.md), [tasks.md](file:///specs/innings-break/console/tasks.md)

> **Gate**: Per [AGENTS.md](file:///AGENTS.md) §2, this spec is a proposal. No production code, scaffolding, or dependency installation happens until the human approves this spec **and** [tasks.md](file:///specs/innings-break/console/tasks.md).

> **Note on OpenSpec**: An OpenSpec trial exists in PR #19 (rainout change). This spec deliberately uses the repo's established Spec Kit format (`.specify/templates/spec.md`). If OpenSpec is adopted later, this spec becomes its baseline.

---

## 0. Guiding Constraints (carried from PRD / memory, not new requirements)

| Constraint | Source |
|---|---|
| Directory names `apps/innings-break-console`, `apps/innings-break-api` | personas.md §1, innings-break.md §3 |
| API stack: Node.js + Express REST | innings-break.md §3.3 |
| Responsive Web + PWA, no native apps | innings-break.md §3.4, PRD §5 Out of Scope |
| Exactly 1 Business Owner, 1 active Primary Kitchen Hub, Chennai only (MVP); schema multi-kitchen ready | PRD US-01, US-04, US-05 |
| Courier booking is **manual** (Dunzo/Porter booked in their own apps, references logged in Console) | PRD §5 Out of Scope ("Automated direct API dispatch integration") |
| No cash/bank reversals; all compensation = Team wallet soft credit | PRD US-24 |
| `pnpm` + `turbo` only; extend `@repo/typescript-config`, `@repo/eslint-config` | AGENTS.md §1, §3 |
| Persona names only: `Business Owner`, `Operations Manager`, `Team Manager`; banned misnomers never used in code identifiers, UI copy, or docs | AGENTS.md §5 |

---

## 1. System Architecture & Overview

### 1.1 Monorepo Placement

```
apps/
├── innings-break-console/     # NEW  @apps/innings-break-console  React 18 + Vite + TS PWA (Business Owner, Operations Manager)
└── innings-break-api/         # NEW  @apps/innings-break-api      Node.js + Express REST API (Console routes in this spec)
packages/
├── innings-break-domain/      # NEW  @repo/innings-break-domain  zod schemas, TS types, pure domain rules (no I/O)
├── ui/                        # EXTEND @repo/ui  shadcn/ui primitives (Tailwind) shared across apps
├── typescript-config/         # reuse
└── eslint-config/             # reuse
```

`apps/innings-break` (Team Manager app) is **not** built in this spec; its PRD is still Draft. The API is shared, so this spec defines the data model that both apps use, but only implements Console-facing endpoints plus the domain functions the customer app will later call (cancellation, wallet redemption, serviceability).

### 1.2 Architecture Diagram

```
 Business Owner / Operations Manager (browser or installed PWA)
                 │ HTTPS, httpOnly session cookie
                 ▼
 ┌──────────────────────────────┐        ┌──────────────────────────────┐
 │ apps/innings-break-console   │  REST  │ apps/innings-break-api       │
 │ React + Vite + TanStack Query│ ─────▶ │ Express routers              │
 │ React Router, @repo/ui       │ /api/  │  ├─ authn (OTP, session)     │
 │ vite-plugin-pwa (manifest+SW)│ console│  ├─ authz (persona + hub)    │
 │ 15–30 s polling for boards   │        │  ├─ services (domain rules)  │
 └──────────────────────────────┘        │  ├─ jobs (scheduler tick)    │
                                          │  └─ adapters ───────────────┼──▶ SmsOtpProvider (SMS)
            @repo/innings-break-domain ◀──┤                              ├──▶ MediaStorage (photos)
            (shared schemas + rules)      │                              ├──▶ DispatchProvider (manual log)
                                          └──────────────┬───────────────┘
                                                         ▼
                                                PostgreSQL (Drizzle ORM)
```

### 1.3 Key Architecture Decisions (ADRs, proposed)

| # | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| ADR-01 | Console = React 18 + Vite + TypeScript SPA, same toolchain as `apps/portfolio` | Repo consistency; PWA via `vite-plugin-pwa` | Next.js (adds SSR we don't need) |
| ADR-02 | UI from `@repo/ui` (shadcn/ui + Tailwind); `@repo/ui` is extended with the primitives needed (Button, Dialog, Table, Tabs, Badge, Select, Calendar, Toast, Sheet) | Shared design system for Console and later Team Manager app | App-local components (duplicates later) |
| ADR-03 | API = Express (decided in memory) with zod validation from `@repo/innings-break-domain` | Single source of truth for request/response shapes on both sides | tRPC (conflicts with "REST APIs" decision) |
| ADR-04 | PostgreSQL + Drizzle ORM + SQL migrations | Relational model (orders, ledger) needs transactions and constraints; Drizzle is TS-native and light (constitution §1.2) | Prisma (heavier codegen), SQLite (weak concurrency for jobs) |
| ADR-05 | Money stored as integer **paise** (`bigint`), never floats | Exact wallet/ledger arithmetic | numeric(10,2) |
| ADR-06 | All times stored UTC (`timestamptz`); business rules evaluated in `Asia/Kolkata` via a single `ist` helper in the domain package | Slot times, Sunday 14:00 cutoff, 90-min cancellation are all IST wall-clock rules | Store local time (DST-free but error-prone) |
| ADR-07 | Team wallet is an **append-only ledger**; balance = SUM(entries), cached on `team_wallet` and updated in the same transaction | Auditability (PRD US-24 "staff identifier & timestamp") | Mutable balance only |
| ADR-08 | Order status changes go through one domain state machine (`transitionOrder`) and write an `order_status_event` row | One place to enforce lifecycle (US-18) and produce the customer-facing timeline | Ad-hoc updates per route |
| ADR-09 | Real-time = polling (15–30 s, default 20 s) + manual refresh; no WebSockets in MVP | Explicit PRD requirement (US-16) | SSE/WebSockets (deferred) |
| ADR-10 | Scheduled work (24 h auto-complete, Sunday 14:00 schedule lock) runs as idempotent jobs invoked by an in-process interval **and** a protected `POST /internal/jobs/tick` for external cron | Works on free hosts that sleep; idempotent so double-runs are safe | pg-boss / Redis queue (unneeded infra) |
| ADR-11 | External integrations behind adapter interfaces: `SmsOtpProvider`, `MediaStorage`, `DispatchProvider`. MVP `DispatchProvider` implementations (`dunzo`, `porter`, `direct`, `other`) only **validate and record** references; no outbound API calls | PRD scopes automated courier APIs out; adapter keeps the door open | Hard-coded partner enum logic |
| ADR-12 | Auth = mobile number + SMS OTP, server-side session in Postgres, httpOnly SameSite=Lax cookie; no passwords, no JWT in localStorage | PRD US-01; simple revocation on suspend | JWT (harder to revoke instantly) |
| ADR-13 | Authorization = persona + Kitchen Hub scope enforced in API middleware (`requirePersona`, `scopeToHub`); the UI only hides what the API already forbids | PRD Success Metric 8/9 (no cross-hub leakage, no role drift) | UI-only gating |
| ADR-14 | Every Area/Venue/Ground/Hub/MenuItem is soft-status (`active`/`inactive`); hard delete only via integrity-guarded endpoint | PRD US-10, US-11, US-13 | Soft-delete flag on everything |

### 1.4 Persona → Capability Matrix (enforced server-side)

| Capability | Business Owner | Operations Manager |
|---|---|---|
| Sign in (whitelisted mobile + OTP) | ✅ | ✅ (Active status only) |
| Team Members (invite, reassign, suspend) | ✅ | ❌ (403, nav hidden) |
| Business Presences (cities, hubs) | ✅ | ❌ |
| Hub switcher | ✅ (all hubs + consolidated) | ❌ (fixed to assigned hub) |
| Pre-order cutoff configuration | ✅ | ❌ |
| Calendar month/week bulk actions | ✅ | ❌ |
| Calendar day toggle + tags | ✅ global | ✅ assigned hub only |
| Areas / Venues / Grounds CRUD | ✅ | ❌ (see OQ-12) |
| Menu items create/edit | ✅ | ❌ |
| Menu availability toggle per hub | ✅ any hub | ✅ assigned hub |
| Bundles build/publish | ✅ | ✅ (per PRD US-15; see OQ-11) |
| Order board, prep sheet, invoice, dispatch | ✅ any hub | ✅ assigned hub |
| Support tickets, soft credits | ✅ any hub | ✅ assigned hub |

---

## 2. API & Data Contracts

### 2.1 Conventions
* Base path: `/api/console/v1`. JSON only. Errors: `{ "error": { "code": "STRING_CODE", "message": "human text", "details"?: {} } }`.
* **Headers**: `Cookie: ib_console_session=<opaque>` on every authenticated call; `X-Hub-Id: <uuid>` optional for Business Owner (selected hub, `all` for consolidated); ignored/overridden for Operations Manager (always their assigned hub).
* Standard errors: `400 VALIDATION_FAILED`, `401 UNAUTHENTICATED`, `403 FORBIDDEN_PERSONA` / `FORBIDDEN_HUB`, `404 NOT_FOUND`, `409 CONFLICT` (state machine / integrity guard), `422 RULE_VIOLATION` (business rule e.g. cutoff passed), `429 RATE_LIMITED`.
* Lists support `?q=&sort=&order=&page=&pageSize=` (default 50, max 200).
* Every endpoint below declares **Authorized Persona** (AGENTS.md §5).

### 2.2 Endpoints

#### A. Authentication & Session (US-01, US-03)
* **`POST /auth/otp/request`** — Authorized Persona: public (pre-auth); succeeds only for Business Owner or Invited/Active Operations Manager numbers
  * Request: `{ "mobile": "+919876543210" }` (E.164, India `+91`)
  * 200: `{ "challengeId": "uuid", "expiresInSec": 300, "resendAfterSec": 30 }`
  * 403 `MOBILE_NOT_AUTHORIZED`: message exactly *"Access Denied: Your mobile number is not registered or invited. Contact the Business Owner for console access."* — **no SMS is sent**. Suspended staff receive the same response.
  * 429 when > 3 requests / 10 min per mobile or > 20 / 10 min per IP.
* **`POST /auth/otp/verify`** — Authorized Persona: public (pre-auth)
  * Request: `{ "challengeId": "uuid", "code": "123456", "inviteToken"?: "string" }`
  * 200: sets session cookie; body `{ "staff": StaffSession }` where `StaffSession = { id, fullName, persona: "BUSINESS_OWNER" | "OPERATIONS_MANAGER", hubId: string | null, landing: "/dashboard" }`
  * On first verify with valid `inviteToken`: invite status `Invited → Active`, `joinedAt` set, hub binding confirmed (US-02).
  * 400 `OTP_INVALID` (max 5 attempts, then challenge burned), 410 `OTP_EXPIRED`.
* **`GET /auth/session`** — Authorized Persona: Business Owner | Operations Manager. 200 `StaffSession`; 401 if none.
* **`POST /auth/logout`** — Authorized Persona: Business Owner | Operations Manager. 204.
* **`GET /invites/:token`** — Authorized Persona: public (pre-auth). 200 `{ "fullName", "maskedMobile": "+91******3210", "hubName" }`; 404/410 for unknown/expired/revoked.

#### B. Team Members (US-02) — Authorized Persona: **Business Owner only**
* **`GET /team-members`** → `OperationsManagerRow[]` `{ id, fullName, mobile, email, hubId, hubName, joinedAt|null, status: "INVITED"|"ACTIVE"|"SUSPENDED" }`
* **`POST /team-members`** `{ fullName, mobile, email, hubId }` → 201 `{ member, inviteUrl, whatsappShareUrl }`. Creating whitelists the mobile immediately. 409 `MOBILE_ALREADY_REGISTERED`.
* **`POST /team-members/:id/invite-link`** → regenerates link (old token revoked). 200 `{ inviteUrl, whatsappShareUrl }`.
* **`PATCH /team-members/:id`** `{ hubId? , fullName?, email? }` → reassign hub (US-02). Existing sessions re-read hub on next request.
* **`POST /team-members/:id/suspend`** / **`POST /team-members/:id/reactivate`** → suspend deletes all sessions instantly.

#### C. Business Presences & Hubs (US-04, US-05, US-06)
* **`GET /cities`**, **`POST /cities`** `{ name }` — Business Owner. MVP seed: `Chennai`.
* **`GET /hubs`** — Business Owner (all), Operations Manager (own hub only). `KitchenHub[]`.
* **`POST /hubs`**, **`PATCH /hubs/:id`** — Business Owner. Body: `{ name, cityId, role: "PRIMARY"|"SECONDARY", lat, lng, address, landmark?, deliveryRadiusKm (default 10), status: "ACTIVE"|"INACTIVE" }`. 409 `PRIMARY_HUB_EXISTS` if a second active Primary is attempted (DB partial unique index).
* **`GET /serviceability?lat=&lng=&hubId=`** — Business Owner | Operations Manager (and later the customer app via its own route). 200 `{ hubId, distanceKm: 7.2, deliverable: true }` using `haversineKm` from the domain package. In multi-kitchen mode (future) `hubId` omitted → nearest active covering hub (US-06 future routing); MVP evaluates the Primary hub.

#### D. Match Slots & Pre-Order Cutoff (US-07)
* **`GET /match-slots`** — Business Owner | Operations Manager. Seeded rows: `06:30`, `10:30`, `14:30` (active); `18:00`, `22:00` present but `enabled=false` (deferred, not exposed in UI).
* **`PUT /match-slots/:id/cutoff`** — Business Owner. Body is one of:
  * `{ "mode": "HOURS_BEFORE", "hours": 12 }`
  * `{ "mode": "FIXED_PREVIOUS_DAY_TIME", "daysBefore": 1, "time": "20:00" }` (e.g. Friday 8:00 PM for Saturday)
* **`GET /cutoffs?date=YYYY-MM-DD`** — 200 `{ slotId, cutoffAt (ISO), isOpen }[]` (consumed later by the customer app to lock pre-orders).

#### E. Operational Calendar (US-08, US-09)
* **`GET /calendar?month=YYYY-MM&hubId=`** — Business Owner | Operations Manager. 200 `CalendarDay[]` `{ date, effectiveStatus: "ACTIVE"|"CLOSED", source: "DEFAULT"|"GLOBAL"|"HUB", tag?: string, orderCount, weekLocked: boolean }` plus `weeks[]` `{ weekStart (Monday), lockAt (preceding Sunday 14:00 IST), locked }`.
* **`POST /calendar/month-actions`** — Business Owner. `{ month, action: "APPLY_WEEKEND_DEFAULTS" | "CLEAR_MONTH" }`. Only touches weeks whose `locked=false`.
* **`POST /calendar/week-actions`** — Business Owner. `{ weekStart, action: "DEFAULT_WEEKEND" | "ACTIVATE_ALL" | "DEACTIVATE_ALL" }`. 422 `WEEK_LOCKED` after lock.
* **`PUT /calendar/days/:date`** — Business Owner (scope `GLOBAL`, or a hub) | Operations Manager (scope forced to own hub). `{ status: "ACTIVE"|"CLOSED", tag?: string }`. 422 `WEEK_LOCKED` (see OQ-08 for post-lock edits).
* **`GET /calendar/active-days?from=&to=&hubId=`** — public-to-API (customer gating, US-09) and Console Match Date Switcher.
* Effective status resolution (domain fn `resolveDayStatus`): HUB override → GLOBAL override → DEFAULT (Sat/Sun active). Precedence is a proposal; see OQ-07.

#### F. Areas, Venues, Ground Facilities (US-10 – US-13) — Authorized Persona: **Business Owner** (Operations Manager read-only for venue/ground details shown on order cards)
* **Areas**: `GET /areas`, `POST /areas` `{ name, lat, lng, mapsUrl?, status? }`, `PATCH /areas/:id`, `POST /areas/:id/status` `{ status }`, `DELETE /areas/:id` (confirmation handled client-side; Areas have no FK dependents in the Console model).
* **Venues**: `GET /venues?hubId=` (each row includes `serviceability { distanceKm, deliverable }` against selected/Primary hub and `facilityCount`), `POST /venues` `{ name, type: "STANDALONE"|"MULTI_COMPLEX", lat, lng, mapsUrl?, description?, landmarkNotes?, videoUrl?, status? }`, `PATCH /venues/:id`, `POST /venues/:id/status`, `DELETE /venues/:id` → 409 `VENUE_HAS_ORDERS` if any order references any of its grounds.
* **Venue media**: `POST /venues/:id/media` (multipart image ≤ 5 MB, jpg/png/webp) → `{ mediaId, url, isCover }`; `DELETE /venues/:id/media/:mediaId`; `POST /venues/:id/media/:mediaId/cover`.
* **Ground facilities**: `GET /venues/:id/grounds`, `POST /venues/:id/grounds` `{ name, facilityType: "LEATHER_BALL"|"TENNIS_BALL"|"PRACTICE_NETS", surface, gateNotes (required, non-empty), lat?, lng?, status? }`, `PATCH /grounds/:id`, `POST /grounds/:id/status`, `DELETE /grounds/:id` → 409 `GROUND_HAS_ORDERS`.
  * `surface` validated per type: LEATHER_BALL ∈ {`LEATHER_TURF_WICKET`,`CONCRETE_MATTING_WICKET`,`ASTRO_TURF_WICKET`,`CEMENT_WICKET`}; TENNIS_BALL ∈ {`SYNTHETIC_ASTRO_TURF`,`CONCRETE_RUBBERIZED`,`NATURAL_CLAY_SAND`}; PRACTICE_NETS ∈ {`TURF_PRACTICE_NET`,`MATTING_PRACTICE_NET`,`ASTRO_NET_CAGE`}.
  * Derived `orderable = facilityType=LEATHER_BALL && surface ∈ {LEATHER_TURF_WICKET, CONCRETE_MATTING_WICKET} && ground, venue active` (US-12 MVP scope). Non-orderable rows carry badge text *"Ordering Disabled for MVP / Leather Ball Matches Only"*.
  * Effective coordinates: ground lat/lng if set, else inherited from venue.
  * Venue `INACTIVE` hides all nested grounds from discovery without changing their own status.

#### G. Menu, Availability, Bundles (US-14, US-15)
* **`GET /menu-items?hubId=`** — Business Owner | Operations Manager. Rows include `availability` for the hub.
* **`POST /menu-items`**, **`PATCH /menu-items/:id`** — Business Owner. `{ name, description, prepNotes, nutrition: { kcal, proteinG, carbsG, fatG, minerals }, dietary: "VEG"|"NON_VEG"|"EGG", category: "BEVERAGES_HYDRATION"|"FRESH_CUT_FRUITS"|"HIGH_PROTEIN_SNACKS"|"ENERGY_BITES"|"TEAM_MEALS", unitPricePaise, status }`; `POST /menu-items/:id/photo` multipart.
* **`PUT /menu-items/:id/availability`** — Business Owner (any hub) | Operations Manager (own hub). `{ hubId, available: boolean }`.
* **`GET /bundles`**, **`POST /bundles`**, **`PATCH /bundles/:id`**, **`POST /bundles/:id/publish`**, **`POST /bundles/:id/unpublish`**, `POST /bundles/:id/photo` — Business Owner | Operations Manager. `{ name, items: [{ menuItemId, quantity }], pricePaise }`. Publish requires ≥1 item and all items active. A bundle is orderable at a hub only if all its items are available at that hub (derived).

#### H. Orders, Board, Prep Sheet, Invoice (US-16 – US-19)
* **`GET /orders/board?date=YYYY-MM-DD&slot=all|06:30|10:30|14:30&hubId=`** — Business Owner | Operations Manager. 200 `{ date, hubId, generatedAt, columns: { CONFIRMED: OrderCard[], ACCEPTED: [], PREPARING: [], IN_TRANSIT: [], COMPLETED: [] }, cancelled: OrderCard[], counts }`. Supports `If-None-Match` ETag so 20 s polling is cheap (304).
* **`GET /orders/date-switcher?from=&days=14&hubId=`** → `{ date, label, orderCount, isActiveDay }[]` (Today, Tomorrow, active days, holidays).
* **`GET /orders/:id`** → full `OrderCard` (anatomy per US-16: slot badge, status, team name, primary contact, secondary on-field contact, venue/ground/address/gate notes, lines with quantities, total, UPI reference, dispatch details, allowed actions).
* **`POST /orders/:id/transitions`** — Business Owner | Operations Manager (hub-scoped). Body `{ "to": "ACCEPTED"|"PREPARING"|"IN_TRANSIT"|"COMPLETED"|"CANCELLED_REFUNDED", "expectedVersion": 3, "dispatch"?: DispatchInput, "cancellation"?: { reason: string, creditPaise?: number } }`. 409 `INVALID_TRANSITION` / `VERSION_CONFLICT` (optimistic concurrency so two staff can't double-advance). `ACCEPTED` emits a customer notification record.
* **`GET /prep-sheet?date=&slot=&hubId=`** → `{ date, slot, generatedAt, items: [{ menuItemId, name, totalUnits, prepNotes, byGround: [{ venueName, groundName, units }] }], groundCount, orderCount }`. Includes **all** orders in `CONFIRMED|ACCEPTED|PREPARING` (US-17 inclusive rule); bundles expanded into component items. Excludes cancelled.
* **`GET /orders/:id/invoice`** → `Invoice` `{ invoiceNumber, orderId, matchDate, slot, placedAt, team, manager, venue, ground, gateNotes, lines[{name, qty, unitPricePaise, lineTotalPaise}], subtotalPaise, gst?: [{ label, ratePct, amountPaise }], walletCreditAppliedPaise, paidPaise, upiReference, paymentAt }`. Printing/copy is client-side.

#### I. Dispatch (US-20)
* `DispatchInput = { partner: "DUNZO"|"PORTER"|"DIRECT_COURIER"|"OTHER", bookingRef: string, trackingUrl?: string, driverName?: string, driverMobile?: string, etaAt: string }` — validated by `DispatchProvider[partner].validate()`.
  * `bookingRef` mandatory for all partners. For `DIRECT_COURIER`, the UI offers a one-click generated `DIRECT-<yyyyMMddHHmmss>` or the driver mobile.
  * Recorded in `dispatch` table with `orderId` (one dispatch per order in MVP; `dispatch_run_id` nullable column reserved for future same-venue batching).
* **`PATCH /orders/:id/dispatch`** — Business Owner | Operations Manager: correct ETA/driver/tracking while `IN_TRANSIT`.

#### J. Support & Soft Credits (US-21, US-22, US-23 late path, US-24)
* **`GET /support-tickets?status=&hubId=`**, **`GET /support-tickets/:id`** — Business Owner | Operations Manager (hub-scoped via order's hub).
* **`PATCH /support-tickets/:id`** `{ status: "IN_PROGRESS" }`, **`POST /support-tickets/:id/notes`** `{ note }`.
* **`POST /support-tickets/:id/resolve`** `{ mode: "NOTES_ONLY", resolutionNotes }` or `{ mode: "SOFT_CREDIT", amountPaise, reason: "MATCH_RAINOUT"|"FOOD_QUALITY_ISSUE"|"MISSING_ITEMS"|"DELIVERY_DELAY"|"GOODWILL", resolutionNotes? }` → writes ledger entry (staff id + timestamp), sets `RESOLVED`. 422 if `amountPaise` > order paid value (see OQ-17).
* **`GET /cancelled-orders?from=&to=&hubId=`** — Cancelled Orders tab (US-23): rows `{ orderId, team, matchDate, slot, cancelledAt, cancelledBy: "TEAM_MANAGER"|"STAFF", reason, creditPaise, ledgerEntryId }`.
* **`GET /teams/:id/wallet`** — Business Owner | Operations Manager: balance + ledger (read-only, for investigations).
* **`GET /notifications?since=`** — Business Owner | Operations Manager: Console notification stream (new orders, auto rainout cancellations, new tickets).

#### K. Domain operations exposed for the later Team Manager app (implemented as services + tests now, routes added in the customer-app spec)
* `cancelOrderForRainout(orderId, actorTeamManagerId, now)` — US-23 auto path (see §2.4).
* `applyWalletToOrder(teamId, orderTotalPaise)` — US-24 next-order deduction: `applied = min(balance, total)`.
* `createSupportTicket(...)` — customer-raised tickets appear instantly in the Console (US-21).

#### L. Internal
* **`POST /internal/jobs/tick`** — Authorized Persona: none (service-to-service; `Authorization: Bearer <JOBS_SECRET>`). Runs `autoCompleteInTransit` and `lockUpcomingWeekSchedule`. Idempotent.
* **`GET /healthz`** — public.

### 2.3 Data Model (Drizzle / PostgreSQL)

All tables: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` (`timestamptz`). Money in paise (`bigint`). Status enums as Postgres enums.

```typescript
// Identity & access
export interface StaffMember {            // console personnel (Business Owner / Operations Manager)
  id: string; fullName: string; mobileE164: string /* unique */; email: string | null;
  persona: 'BUSINESS_OWNER' | 'OPERATIONS_MANAGER';
  hubId: string | null;                   // required for OPERATIONS_MANAGER
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  joinedAt: string | null;
}
// partial unique index: exactly one BUSINESS_OWNER row (MVP bootstrap via seed/env)
export interface StaffInvite { id: string; staffId: string; tokenHash: string; expiresAt: string; usedAt: string | null; revokedAt: string | null; }
export interface OtpChallenge { id: string; mobileE164: string; codeHash: string; attempts: number; expiresAt: string; consumedAt: string | null; }
export interface StaffSession { id: string; staffId: string; tokenHash: string; expiresAt: string; lastSeenAt: string; }

// Business presences
export interface City { id: string; name: string; status: 'ACTIVE' | 'INACTIVE'; }
export interface KitchenHub {
  id: string; cityId: string; name: string; role: 'PRIMARY' | 'SECONDARY';
  lat: number; lng: number; address: string; landmark: string | null;
  deliveryRadiusKm: number /* default 10 */; status: 'ACTIVE' | 'INACTIVE';
} // partial unique index: one ACTIVE PRIMARY

// Location directory (decoupled: no FK between Area and Venue)
export interface Area { id: string; name: string; lat: number; lng: number; mapsUrl: string | null; status: 'ACTIVE' | 'INACTIVE'; }
export interface Venue {
  id: string; name: string; type: 'STANDALONE' | 'MULTI_COMPLEX'; lat: number; lng: number;
  mapsUrl: string | null; description: string | null; landmarkNotes: string | null; videoUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}
export interface VenueMedia { id: string; venueId: string; storageKey: string; isCover: boolean; sortOrder: number; }
export interface GroundFacility {
  id: string; venueId: string; name: string;
  facilityType: 'LEATHER_BALL' | 'TENNIS_BALL' | 'PRACTICE_NETS'; surface: string;
  gateNotes: string; lat: number | null; lng: number | null; status: 'ACTIVE' | 'INACTIVE';
}

// Scheduling
export interface MatchSlot { id: string; startTime: '06:30' | '10:30' | '14:30' | '18:00' | '22:00'; enabled: boolean;
  cutoffMode: 'HOURS_BEFORE' | 'FIXED_PREVIOUS_DAY_TIME'; cutoffHours: number | null; cutoffDaysBefore: number | null; cutoffTime: string | null; }
export interface OperatingDayOverride { id: string; date: string /* YYYY-MM-DD IST */; hubId: string | null /* null = GLOBAL */;
  status: 'ACTIVE' | 'CLOSED'; tag: string | null; setByStaffId: string; } // unique(date, hubId)
export interface ScheduleWeek { weekStart: string /* Monday */; lockedAt: string | null; lockedBy: 'AUTO_FALLBACK' | 'STAFF' | null; }

// Menu
export interface MenuItem { id: string; name: string; description: string; prepNotes: string;
  kcal: number; proteinG: number; carbsG: number; fatG: number; minerals: string | null;
  dietary: 'VEG' | 'NON_VEG' | 'EGG'; category: MenuCategory; unitPricePaise: number; photoKey: string | null; status: 'ACTIVE' | 'INACTIVE'; }
export interface HubItemAvailability { hubId: string; menuItemId: string; available: boolean; updatedByStaffId: string; } // pk(hubId, menuItemId)
export interface Bundle { id: string; name: string; pricePaise: number; photoKey: string | null; published: boolean; createdByStaffId: string; }
export interface BundleItem { bundleId: string; menuItemId: string; quantity: number; }

// Teams & wallet (owned jointly with the Team Manager app; Console reads + credits)
export interface Team { id: string; name: string; /* Team Manager fields defined in customer spec */ }
export interface TeamWallet { teamId: string; balancePaise: number; } // cache of ledger sum
export interface WalletLedgerEntry { id: string; teamId: string; amountPaise: number /* +credit / -redeem */;
  kind: 'CREDIT' | 'REDEMPTION'; reason: 'MATCH_RAINOUT' | 'FOOD_QUALITY_ISSUE' | 'MISSING_ITEMS' | 'DELIVERY_DELAY' | 'GOODWILL' | 'ORDER_REDEMPTION';
  orderId: string | null; ticketId: string | null; actorType: 'SYSTEM' | 'STAFF' | 'TEAM_MANAGER'; actorId: string | null; }

// Orders
export interface Order {
  id: string; orderNumber: string; invoiceNumber: string; hubId: string; teamId: string;
  matchDate: string; slotId: string; groundId: string;
  primaryContactName: string; primaryContactMobile: string;
  secondaryContactName: string; secondaryContactMobile: string;   // PRD Success Metric 5
  status: 'CONFIRMED' | 'ACCEPTED' | 'PREPARING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED_REFUNDED';
  cancellationKind: 'RAINOUT_AUTO' | 'STAFF' | null; cancellationReason: string | null;
  subtotalPaise: number; gstPaise: number; walletAppliedPaise: number; paidPaise: number;
  upiReference: string; paidAt: string; version: number; completedBy: 'STAFF' | 'AUTO_24H' | null;
}
export interface OrderLine { id: string; orderId: string; menuItemId: string | null; bundleId: string | null; nameSnapshot: string; unitPricePaise: number; quantity: number; }
export interface OrderStatusEvent { id: string; orderId: string; from: string | null; to: string; actorType: 'SYSTEM' | 'STAFF' | 'TEAM_MANAGER'; actorId: string | null; at: string; }
export interface Dispatch { id: string; orderId: string /* unique */; partner: 'DUNZO' | 'PORTER' | 'DIRECT_COURIER' | 'OTHER';
  bookingRef: string; trackingUrl: string | null; driverName: string | null; driverMobile: string | null; etaAt: string; dispatchRunId: string | null; dispatchedByStaffId: string; }

// Support & notifications
export interface SupportTicket { id: string; ticketNumber: string; orderId: string; hubId: string;
  category: 'FOOD_QUALITY' | 'MISSING_ITEMS' | 'DAMAGED_PACKAGING' | 'DELIVERY_DELAY' | 'WRONG_GATE_DROPOFF' | 'LATE_CANCELLATION' | 'OTHER';
  description: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; resolutionNotes: string | null; resolvedByStaffId: string | null; }
export interface ConsoleNotification { id: string; hubId: string; kind: 'NEW_ORDER' | 'RAINOUT_CANCELLED' | 'NEW_TICKET' | 'AUTO_COMPLETED'; refId: string; at: string; }
export interface AuditLog { id: string; staffId: string | null; action: string; entity: string; entityId: string; before: unknown; after: unknown; at: string; }
```

> `LATE_CANCELLATION` ticket category is used for the US-23 < 1.5 h escalation path; the PRD's six grievance categories map 1:1 to the others.

### 2.4 Domain Rules (pure functions in `@repo/innings-break-domain`, 100% unit-tested)

| Function | Rule | PRD |
|---|---|---|
| `haversineKm(a, b)` | Earth radius 6371 km; `deliverable = distance ≤ hub.deliveryRadiusKm` (inclusive) | US-06 |
| `effectiveGroundCoords(ground, venue)` | Ground coords else venue coords | US-12 |
| `isOrderableGround(ground, venue)` | Leather ball + turf/matting + both active | US-12 |
| `slotStartAt(date, slot)` | IST wall clock → UTC instant | US-07 |
| `preOrderCutoffAt(date, slot)` | per slot mode (hours-before / fixed previous-day time) | US-07 |
| `cancellationCutoffAt(date, slot)` | `slotStartAt − 90 min` → 05:00 / 09:00 / 13:00 IST | US-23 |
| `canAutoCancel(order, now)` | status ∈ {CONFIRMED, ACCEPTED} and `now ≤ cutoff` (boundary per OQ-01; default inclusive matching "≥ 1.5 h") | US-23 |
| `transitionOrder(order, to, ctx)` | Allowed: CONFIRMED→ACCEPTED→PREPARING→IN_TRANSIT→COMPLETED; CONFIRMED/ACCEPTED/PREPARING→CANCELLED_REFUNDED (staff, reason required); IN_TRANSIT requires valid dispatch | US-18, US-20 |
| `autoCompleteDue(order, now)` | IN_TRANSIT and `now − inTransitAt ≥ 24 h` | US-18 |
| `resolveDayStatus(date, overrides, hubId)` | HUB → GLOBAL → default (Sat/Sun) | US-08, US-09 |
| `weekLockAt(weekStart)` | preceding Sunday 14:00 IST | US-09 |
| `aggregatePrepSheet(orders)` | Sum lines (bundles expanded) for non-cancelled orders incl. CONFIRMED | US-17 |
| `applyWallet(balance, total)` | `min(balance, total)` | US-24 |

**Rainout auto-cancel transaction** (US-23): in one DB transaction — lock order row (`SELECT … FOR UPDATE`), check `canAutoCancel`, set `CANCELLED_REFUNDED` with `cancellationKind=RAINOUT_AUTO`, insert status event, insert ledger `CREDIT` of `paidPaise + walletAppliedPaise` (100 % of order value; see OQ-14), bump wallet cache, insert `RAINOUT_CANCELLED` notification. Order disappears from board columns and prep sheet on next poll.

---

## 3. Component Breakdown (Frontend: `apps/innings-break-console`)

Routing (React Router), data (TanStack Query, polling `refetchInterval: 20_000` on board/notifications), forms (react-hook-form + zod resolver from domain package), UI from `@repo/ui`. Every screen declares its authorized persona; route guards mirror API rules.

| Screen / Route | Authorized Persona | Key components | PRD |
|---|---|---|---|
| `/login` (mobile → OTP) | public | `MobileForm`, `OtpForm`, access-denied banner | US-01 |
| `/invite/:token` | public (invited Operations Manager) | `InviteLanding` → OTP | US-02 |
| App shell | Business Owner, Operations Manager | `AppShell` (persona-filtered nav), `HubSwitcher` (Business Owner only; shows single Primary hub in MVP), `NotificationBell`, PWA `UpdatePrompt`/`OfflineScreen` | US-03, US-05 |
| `/dashboard` (Active Month Calendar) | Business Owner (month/week toolbars), Operations Manager (day toggles for own hub) | `MonthCalendar` (7-col Mon–Sun), `WeekRowActions`, `MonthToolbar`, `DayCell` (status + order pill + tag), `DayTagDialog`, lock indicators | US-08, US-09 |
| `/orders` (Kanban) | Business Owner, Operations Manager | `MatchDateSwitcher`, `SlotTabs`, `KanbanColumn` ×5, `CancelledTab`, `OrderCard`, `OrderDetailSheet`, `DispatchDialog`, `CancelOrderDialog`, `RefreshBoardButton`; mobile: columns become swipeable tabs | US-16, US-18, US-20 |
| `/orders/:id/invoice` (modal) | Business Owner, Operations Manager | `InvoiceReceipt` (print CSS), `CopySummaryButton` | US-19 |
| `/prep-sheet` | Business Owner, Operations Manager | `PrepSheetTable`, `PrintBatchSheetDialog` (`window.print()`), `CopyToClipboard` | US-17 |
| `/support` | Business Owner, Operations Manager | `TicketList`, `TicketDetail`, `ResolveWithNotesDialog`, `IssueSoftCreditDialog`, `CancelledOrdersTab` | US-21–US-24 |
| `/menu` | Business Owner (CRUD), Operations Manager (availability toggles) | `MenuGrid`, `MenuItemForm` (nutrition, dietary, category, price, photo), `AvailabilitySwitch` | US-14 |
| `/bundles` | Business Owner, Operations Manager | `BundleList`, `BundleBuilder` (item picker + quantities + price + photo), `PublishToggle` | US-15 |
| `/locations/areas` | Business Owner | `AreasDataGrid` (search/sort, copy coords, maps link), `AreaFormDialog`, `ConfirmDeleteDialog` | US-10, US-13 |
| `/locations/venues` | Business Owner | `VenuesDataGrid` (thumbnail, type badge, `ServiceabilityBadge`, facility count), `VenueFormDialog`, `MediaUploader` | US-11, US-13 |
| `/locations/venues/:id` | Business Owner | `GroundsSubGrid`, `GroundFormDialog` (type → surface cascade, mandatory gate notes, optional coords), MVP-ordering badge | US-12, US-13 |
| `/settings/presences` | Business Owner | `CitiesList`, `HubsList`, `HubFormDialog` (Primary flag, coords, radius, status) | US-04 |
| `/settings/slots` | Business Owner | `SlotCutoffForm` | US-07 |
| `/team-members` | Business Owner | `TeamMembersTable` (status badges), `InviteDialog` (WhatsApp share + copy link), `ReassignHubDialog`, `SuspendDialog` | US-02 |

PWA: `vite-plugin-pwa` manifest (name "Innings Break Console"), network-first for `/api/*` (no stale order data cached), offline fallback page, update prompt. Installable on HTTPS only.

---

## 4. Error Handling & Edge Cases

* **Network failure / offline**: TanStack Query retries GETs (2× backoff); mutations never auto-retry; toast with "Retry". Offline screen when navigator is offline; board never shows cached data older than last successful poll (timestamp shown: "Updated 12 s ago").
* **Concurrent staff edits**: order transitions use `expectedVersion`; on 409 the card refetches and shows "This order was updated by someone else".
* **Validation**: zod errors mapped to field messages; coordinates must be within valid lat/lng ranges (and Chennai bounding box warning, not a block).
* **Cutoff race**: rainout cancellation and staff `PREPARING` transition on the same order are serialized by row lock; whichever commits first wins, the other gets 409/422.
* **Week lock**: day/week edits after the Sunday 14:00 IST lock return 422 `WEEK_LOCKED` (pending OQ-08).
* **Deactivating a day with existing orders**: blocked with 409 `DAY_HAS_ORDERS` listing orders (proposal; see OQ-09).
* **Hub reassignment / suspension**: next API call re-reads staff record; suspended → 401 and forced to `/login`.
* **Jobs**: idempotent (`WHERE status='IN_TRANSIT' AND in_transit_at <= now()-24h`), safe to run concurrently (`FOR UPDATE SKIP LOCKED`).
* **Empty states**: no orders for date, no tickets, no venues → explanatory empty cards with primary action.
* **Loading**: skeletons for grids and board columns.
* **Media**: upload > 5 MB or wrong type → 400 with message; failed upload doesn't block form save.

---

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Board API p95 < 300 ms for ≤ 200 orders/day; polling uses ETag/304; initial console JS < 250 KB gzip |
| Security | OTP 6 digits, 5-min TTL, hashed at rest, rate-limited; session tokens hashed; httpOnly Secure cookies; CSRF via SameSite=Lax + `Origin` check on mutations; helmet; secrets only in env; no PII in logs (mobile masked) |
| Authorization | Every route has `requirePersona(...)` and, where relevant, `scopeToHub`; contract tests assert 403 for Operations Manager on every Business-Owner-only route and for cross-hub ids |
| Data integrity | Ledger append-only (no UPDATE/DELETE grants in app role); money in paise; FK constraints; partial unique indexes (one Business Owner, one active Primary hub) |
| Time | All rule evaluation in `Asia/Kolkata`; tests pin clock |
| Accessibility | WCAG 2.1 AA on shadcn primitives; keyboard-operable board (move via action buttons, not drag-only) |
| Responsiveness | 360 px mobile → desktop; print stylesheets for prep sheet and invoice |
| Observability | Structured JSON logs (pino) with request id; `/healthz`; job run logs |
| Auditability | `audit_log` for all Business Owner config changes, staff changes, transitions, credits |
| Portability | Runs as two deployables (static console + Node API) with one Postgres; hosting choice is an open question (OQ-18) |

---

## 6. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Domain unit | Vitest | Every function in §2.4, incl. IST boundaries (04:59:59/05:00:00/05:00:01), Haversine known distances, state machine table |
| API integration | Vitest + Supertest against real Postgres (Docker `postgres:16` locally, service container in CI) | Each endpoint: happy path, validation, persona 403, cross-hub 403, integrity 409 |
| Contract | zod schemas shared; tests assert responses parse with domain schemas | Prevent console/API drift |
| Frontend component | Vitest + Testing Library | Forms, guards, nav filtering per persona |
| E2E | Playwright (desktop + Pixel 7 viewport) | MVP journeys: login/stranger lockout, invite onboarding, create venue+ground, menu + availability, board progression with dispatch, prep sheet print view, rainout auto-cancel visible in Cancelled tab, ticket soft credit |
| Lint / types / build | `pnpm turbo run lint build --filter=...` | Required on every task |
| Persona lint | `rg` check in CI script for banned misnomers in `apps/innings-break-*`, `packages/innings-break-domain`, `specs/innings-break` | AGENTS.md §5 |

Adding CI workflow files under `.github/workflows` requires a human (the agent token lacks `workflow` scope); tasks prepare the job definition for the human to add.

---

## 7. Acceptance Criteria

- [ ] **AC-01** (US-01): Given an unregistered or suspended mobile, When OTP is requested, Then 403 with the exact access-denied message and no SMS adapter call.
- [ ] **AC-02** (US-01): Given the Business Owner or Active/Invited Operations Manager mobile, When the correct OTP is verified, Then a session is created and they land on the persona-appropriate dashboard.
- [ ] **AC-03** (US-02): Given the Business Owner, When inviting with name/mobile/email/hub, Then the number is whitelisted, a shareable invite link is returned, and first OTP verify via link sets status `Active` bound to the hub.
- [ ] **AC-04** (US-02): Given the Business Owner, When reassigning or suspending an Operations Manager, Then hub scope changes on the next request / all sessions are revoked immediately.
- [ ] **AC-05** (US-02, US-03): Given an Operations Manager, When calling any Team Members, Presences, Locations-write, Menu-write, Cutoff or bulk Calendar endpoint, Then 403; and those nav entries are absent.
- [ ] **AC-06** (US-03, Metric 8): Given an Operations Manager of hub A, When requesting orders/prep/tickets/availability of hub B, Then 403 `FORBIDDEN_HUB`.
- [ ] **AC-07** (US-04): Given an existing active Primary hub, When creating another active Primary, Then 409.
- [ ] **AC-08** (US-05): Given the Business Owner, When the switcher selects a hub or "All", Then board, prep sheet, and staff lists filter accordingly.
- [ ] **AC-09** (US-06, US-11): Given hub radius 10 km, When a venue is 7.2 km / 14.5 km away, Then serviceability is Deliverable / Out of Range with distance shown.
- [ ] **AC-10** (US-07): Given a configured cutoff, When `now` passes it, Then `GET /cutoffs` reports `isOpen=false` for that date+slot.
- [ ] **AC-11** (US-08): Calendar renders Mon–Sun with status, order pills, tags; month/week actions work for Business Owner only; day toggles scoped by persona.
- [ ] **AC-12** (US-09): Given an unconfigured week, When the job runs after Sunday 14:00 IST, Then the week is locked with Sat/Sun active; active-days endpoint reflects only active days.
- [ ] **AC-13** (US-10): Area CRUD, search/sort, coordinate copy, status toggle, confirm-delete.
- [ ] **AC-14** (US-11): Venue CRUD with type, media, video URL; delete blocked (409) when any order references its grounds; inactive venue hides grounds.
- [ ] **AC-15** (US-12): Ground CRUD under venue with type→surface validation, mandatory gate notes, inherited coords; only leather turf/matting grounds are `orderable`.
- [ ] **AC-16** (US-13): Every Area/Venue/Ground can be toggled inactive without losing historical orders.
- [ ] **AC-17** (US-14): Business Owner creates items with nutrition, dietary, category, price, photo; availability toggles per hub by persona scope.
- [ ] **AC-18** (US-15): Bundle with item quantities, price, photo can be published; unpublishable if any item inactive.
- [ ] **AC-19** (US-16): Board shows 5 columns + Cancelled tab for selected date/slot with full card anatomy, polls every 15–30 s, manual refresh, date switcher with counts.
- [ ] **AC-20** (US-17): Prep sheet sums units per item (bundles expanded) across grounds including Confirmed-not-Accepted orders; print view and copy work.
- [ ] **AC-21** (US-18): Only valid transitions succeed; Accept creates customer notification; In Transit auto-completes after 24 h; staff cancel requires reason.
- [ ] **AC-22** (US-19): Invoice shows header, team/destination, lines, subtotal, GST (if configured), wallet deduction, paid amount, UPI ref; print and copy work.
- [ ] **AC-23** (US-20): In Transit requires partner + booking ref + ETA; Direct Courier accepts generated `DIRECT-<timestamp>` or driver mobile.
- [ ] **AC-24** (US-21): Customer-raised ticket appears in Support tab with all listed fields, hub-scoped.
- [ ] **AC-25** (US-22, US-24): Resolve with notes, or with soft credit (amount + reason + staff + timestamp) → ledger credit and balance update.
- [ ] **AC-26** (US-23): Given an order and `now` ≤ slot − 90 min, When auto-cancel runs, Then status `CANCELLED_REFUNDED (RAINOUT_AUTO)`, 100 % credit to team wallet, removed from board/prep sheet, visible in Cancelled tab + notification; after cutoff it is refused (422) and routed to a ticket.
- [ ] **AC-27** (US-24): `applyWallet` deducts `min(balance, total)` and writes a redemption entry.
- [ ] **AC-28** (AGENTS.md §5): Banned-misnomer scan finds zero hits in Innings Break code and specs.

---

## 8. Traceability Matrix (PRD → Spec → Tasks)

| PRD Story | Persona(s) | Spec sections | Tasks | AC |
|---|---|---|---|---|
| US-01 Whitelisted OTP sign-in | Business Owner, Operations Manager | 1.3 ADR-12, 2.2-A, 2.3 Identity, 3 `/login`, 5 Security | T-1.4, T-2.1, T-2.2, T-4.2 | AC-01, AC-02 |
| US-02 Team Members & invites | Business Owner | 1.4, 2.2-B, 2.3 StaffInvite, 3 `/team-members`, `/invite/:token` | T-2.3, T-4.10 | AC-03, AC-04, AC-05 |
| US-03 Hub-scoped Operations Manager dashboard | Operations Manager | 1.4, ADR-13, 2.1 headers, 3 App shell | T-2.4, T-4.3 | AC-05, AC-06 |
| US-04 Business Presences | Business Owner | 2.2-C, 2.3 City/KitchenHub, 3 `/settings/presences` | T-3.1, T-4.11 | AC-07 |
| US-05 Hub switcher | Business Owner | 2.1 `X-Hub-Id`, 3 `HubSwitcher` | T-2.4, T-4.3 | AC-08 |
| US-06 Haversine geofencing | Business Owner | 2.2-C serviceability, 2.4 `haversineKm` | T-1.3, T-3.1 | AC-09 |
| US-07 Slots & pre-order cutoff | Business Owner | 2.2-D, 2.3 MatchSlot, 2.4 `preOrderCutoffAt` | T-1.3, T-3.2, T-4.11 | AC-10 |
| US-08 Active Month Calendar | Business Owner, Operations Manager | 2.2-E, 2.3 OperatingDayOverride, 3 `/dashboard` | T-3.3, T-4.4 | AC-11 |
| US-09 Default fallback, Sunday lock, gating | Business Owner, Operations Manager | 2.2-E, 2.2-L job, 2.4 `resolveDayStatus`/`weekLockAt` | T-1.3, T-3.3, T-3.9 | AC-12 |
| US-10 Areas | Business Owner | 2.2-F Areas, 3 `/locations/areas` | T-3.4, T-4.5 | AC-13 |
| US-11 Venues | Business Owner | 2.2-F Venues/media, ADR-11 MediaStorage, 3 `/locations/venues` | T-3.4, T-3.10, T-4.5 | AC-14, AC-09 |
| US-12 Ground facilities | Business Owner | 2.2-F grounds, 2.4 `isOrderableGround` | T-1.3, T-3.4, T-4.5 | AC-15 |
| US-13 Status control | Business Owner | ADR-14, 2.2-F status endpoints | T-3.4, T-4.5 | AC-16 |
| US-14 Menu & hub availability | Business Owner, Operations Manager | 2.2-G, 2.3 Menu, 3 `/menu` | T-3.5, T-4.6 | AC-17 |
| US-15 Bundles | Business Owner, Operations Manager | 2.2-G bundles, 3 `/bundles` | T-3.5, T-4.6 | AC-18 |
| US-16 Kanban board | Business Owner, Operations Manager | ADR-09, 2.2-H board/date-switcher, 3 `/orders` | T-3.6, T-4.7 | AC-19 |
| US-17 Prep sheet | Business Owner, Operations Manager | 2.2-H prep-sheet, 2.4 `aggregatePrepSheet`, 3 `/prep-sheet` | T-1.3, T-3.6, T-4.8 | AC-20 |
| US-18 Lifecycle & auto-complete | Business Owner, Operations Manager | ADR-08, ADR-10, 2.2-H transitions, 2.4 `transitionOrder` | T-1.3, T-3.6, T-3.9 | AC-21 |
| US-19 Invoice | Business Owner, Operations Manager | 2.2-H invoice, 3 invoice modal | T-3.6, T-4.8 | AC-22 |
| US-20 Dispatch logging | Business Owner, Operations Manager | ADR-11 DispatchProvider, 2.2-I, 2.3 Dispatch | T-3.7, T-4.7 | AC-23 |
| US-21 Support tab | Business Owner, Operations Manager | 2.2-J tickets, 2.3 SupportTicket, 3 `/support` | T-3.8, T-4.9 | AC-24 |
| US-22 Resolve with credit/notes | Business Owner, Operations Manager | 2.2-J resolve, ADR-07 | T-3.8, T-4.9 | AC-25 |
| US-23 Rainout cancellation engine | Business Owner, Operations Manager (Console visibility); action initiated by Team Manager in customer app | 2.2-J cancelled-orders, 2.2-K, 2.4 rainout transaction | T-1.3, T-3.8, T-4.9 | AC-26 |
| US-24 Soft credits only, team wallet | Business Owner, Operations Manager | ADR-05, ADR-07, 2.3 wallet, 2.4 `applyWallet` | T-1.3, T-3.8 | AC-25, AC-27 |
| Success Metric 9 / AGENTS.md §5 | — | 5 Authorization, 6 Persona lint | T-1.5, T-5.2 | AC-28 |

---

## 9. Open Questions (need Business Owner decision; no requirement invented)

**Rainout / cancellation (raised in PR #19 review)**
1. **OQ-01 Exact 90-minute boundary**: PRD says "≥ 1.5 h" and "up to 1.5 hours before". Is a cancellation at exactly 05:00:00 for the 6:30 slot allowed? *Spec default: inclusive (allowed at 05:00:00, refused from 05:00:01).*
2. **OQ-02 Status label wording**: Console PRD uses `Cancelled (Rainout)` and `Cancelled / Refunded`; customer PRD uses `Cancelled (Rainout / Refunded)`. Which label is shown? *Spec stores one enum `CANCELLED_REFUNDED` + `cancellationKind`; label is display-only.*
3. **OQ-03 Delegated Match-Week Manager**: May a `Delegated Match-Week Manager` trigger rainout cancellation (credit goes to the Team wallet)? Customer PRD grants "full operational parity" but doesn't name cancellation.
4. **OQ-04 Cancellation reason**: Is a reason captured for Team Manager auto-cancellations (US-18 mentions "cancellation rationale")? Free text or fixed list? *Spec: optional field, `MATCH_RAINOUT` default.*

**Other ambiguities found while writing this spec**
5. **OQ-05 Completed vs Delivered**: PRD uses both `Delivered` and `Completed / Delivered`. Confirm a single terminal state `COMPLETED` labelled "Delivered / Completed".
6. **OQ-06 Pre-order cutoff defaults**: PRD gives both "Friday 8:00 PM for Saturday morning" and "X hours prior". Default per slot? Does "Friday 8 PM" apply to all Saturday slots or only 6:30 AM? Sunday equivalent?
7. **OQ-07 Global vs hub day override precedence**: If the Business Owner sets a day globally Closed and an Operations Manager sets it Active for their hub, which wins? *Spec default: hub override wins for that hub.*
8. **OQ-08 Edits after the Sunday 14:00 lock**: Can staff still close a locked day (e.g. kitchen emergency) or activate a holiday? *Spec default: Business Owner may edit locked weeks with confirmation; Operations Manager may not.* PRD is silent.
9. **OQ-09 Closing a day that already has paid orders**: Block, auto-cancel with credit, or warn only? PRD is silent.
10. **OQ-10 "Clear Month Schedule"**: Reset unlocked weeks to the default weekend, or to all-closed?
11. **OQ-11 Bundles by Operations Manager**: US-15 lets Operations Managers build/publish bundles, while personas.md bars them from "core business configurations". Are bundles global or per hub?
12. **OQ-12 Operations Manager and Areas/Venues/Grounds**: PRD gives these to the Business Owner only. Should Operations Managers have read-only access (needed to read gate notes outside order cards)?
13. **OQ-13 Area delete guard**: PRD US-10 only requires confirmation; memory Session 9 mentions a guard "against active venues/orders", but Areas have no links in the decoupled model. Confirm confirmation-only.
14. **OQ-14 100 % credit base**: For orders partly paid with wallet credits, does the rainout credit equal UPI paid amount or full order value (UPI + wallet applied)? *Spec default: full order value.*
15. **OQ-15 GST**: Is GST applicable at launch? Rate(s), GSTIN on invoice, invoice-number format/series?
16. **OQ-16 Customer notifications**: "Accepted" notification to the customer app — in-app status only (polling) or also SMS/WhatsApp? PRD says "notification to the customer app".
17. **OQ-17 Late-cancellation / grievance credit cap**: Can discretionary credit exceed the order's value (e.g. goodwill)?
18. **OQ-18 Providers & hosting**: SMS OTP provider (e.g. MSG91 / 2Factor / Twilio — DLT registration needed in India), media storage (S3-compatible / Cloudinary / Supabase Storage), and hosting for API + Postgres. Free tiers preferred per memory.
19. **OQ-19 ETA mandatory?**: US-20 marks tracking link and driver as optional but doesn't mark ETA. *Spec default: required.*
20. **OQ-20 Venue delete guard scope**: US-11 says "active grounds with unfulfilled or past match orders". *Spec default: any order on any ground (past or future) blocks delete.*
21. **OQ-21 Business Owner bootstrap**: Seed the Business Owner mobile from an env var at first migration — acceptable?
22. **OQ-22 Order source before the customer app exists**: For MVP testing of the Console, orders will come from a seed/fixture script (non-production). Is a staff-side "manual order entry" wanted? (Not in PRD; not planned.)
23. **OQ-23 Team ownership of shared tables**: `Team`, `TeamWallet`, `Order` creation are defined fully in the (Draft) customer spec later; this spec defines the minimum columns the Console needs. OK to evolve them in the customer spec?

---

## 10. Out of Scope (from PRD §5, restated so tasks can't creep)
Public sign-up; multiple Business Owners; cash/bank refunds; concurrent multi-kitchen operations and automated routing; floodlight slots; customer ordering on tennis-ball grounds/nets; same-venue courier batching; Dunzo/Porter API integration; ingredient-level inventory/ERP; cities beyond Chennai; native apps; the Team Manager app itself.
