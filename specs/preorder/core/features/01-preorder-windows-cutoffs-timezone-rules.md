> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.1 Pre-Order Windows, Cutoffs & Timezone Rules

Defines **when** orders may be placed and fulfilled. All rules are authored in the fulfilment location's local time and IANA timezone; all stored instants are UTC.

## User Stories

* **US-PM-01**: As an `owner`, I want to define a weekly **operating calendar** (default operating weekdays) per fulfilment location, with per-date overrides (open/closed), so that customers only see dates the business actually serves.
  * **Given** location `L1` with `timezone=Europe/London` and default weekdays `[SAT, SUN]`, **When** a customer requests available dates for the next 14 days, **Then** only Saturdays and Sundays are returned, minus any date with an override `closed`, plus any date with an override `open`.
  * **Given** a date override is added for a date that already has confirmed orders, **When** it sets the date `closed`, **Then** the request is rejected with `409 DATE_HAS_ORDERS` unless `force=true`, in which case the cancellation policy `merchant_closure` is applied to each affected order (see [3.5](./05-cancellations-policies.md)).
* **US-PM-02**: As an `owner`, I want each slot's pre-order window to be **derived from rules** (e.g. "opens 7 days before fulfilment at 09:00 local; cutoff 12 hours before fulfilment start", or "cutoff the previous day at 20:00 local"), so that I don't hand-enter instants.
  * **Given** slot fulfilment start `2026-10-24 06:30 Asia/Kolkata` and rule `cutoff = start − PT12H`, **When** the window is materialised, **Then** `cutoffAt = 2026-10-23T13:00:00Z`.
  * **Given** rule `cutoff = previous day 20:00 local` in `Europe/London` for a slot on `2026-10-25` (the day clocks go back), **When** materialised, **Then** `cutoffAt = 2026-10-24T19:00:00Z` (BST, UTC+1).
* **US-PM-03**: As a `customer`, I want the system to refuse orders outside the window and tell me exactly when it opens or closed, so that I am never charged for an order that cannot be fulfilled.
  * **Given** `now < opensAt`, **When** I create a hold or place an order for the slot, **Then** I get `409 WINDOW_NOT_OPEN` with `details.opensAt`.
  * **Given** `now ≥ cutoffAt`, **When** I place an order, **Then** I get `409 WINDOW_CLOSED` with `details.cutoffAt`. The check uses the server `Clock`, never client time.
  * **Given** a hold created before cutoff, **When** payment confirms after cutoff but within `cutoffGrace` (default `PT0S`, configurable up to `PT15M`), **Then** the order is confirmed; beyond grace it transitions to `Expired` and any captured payment is refunded per [3.6](./06-credits-wallet-ledger-refunds.md).
* **US-PM-04**: As an `owner`, I want a **fallback lock**: at a configured local time (e.g. Thursday 12:00), if I have not confirmed the upcoming operating dates, the default template is locked in automatically, so that customers always have a dependable schedule.
  * **Given** fallback lock rule `weekday=THU, time=12:00` and the upcoming period is unconfirmed, **When** the scheduled job runs at or after that instant, **Then** the period is marked `locked` with `lockedBy=system`, event `CalendarPeriodLocked` is emitted, and an `owner` notification is queued.
  * **Given** the period is already `confirmed` or `locked`, **When** the job runs again, **Then** nothing changes (idempotent).

## Timezone Rules (normative)

1. Each fulfilment location has exactly one IANA `timezone`. Offsets (`+05:30`) are not accepted as timezones.
2. Rules are expressed as **local wall-clock** values; materialisation converts to UTC using the tz database at materialisation time and stores both `*_at` (UTC) and `rule_snapshot` (JSON).
3. **Gap** (local time does not exist, spring-forward): shift **forward** by the gap length (02:30 → 03:30).
4. **Overlap** (local time occurs twice, fall-back): use the **earlier** instant (first occurrence).
5. Duration-based rules (`start − PT12H`) are applied on the UTC instant (absolute duration). Calendar-based rules ("previous day 20:00") are applied in local time then converted.
6. Windows are re-materialised when a rule changes, but only for slots with **no** orders; slots with orders keep their stored instants.
7. Window predicates: `isOpen(now) = opensAt ≤ now < cutoffAt`. Intervals are half-open `[start, end)`.

## Data Model

| Entity | Field | Type | Notes |
|---|---|---|---|
| `FulfilmentLocation` | `id` | string | |
| | `name` | string | |
| | `timezone` | string (IANA) | required |
| | `lat`, `lng` | number? | used by eligibility rules |
| | `status` | `active \| inactive` | |
| `CalendarTemplate` | `locationId` | string | one per location |
| | `defaultWeekdays` | `Weekday[]` | `MON..SUN` |
| | `fallbackLock` | `{ weekday: Weekday, time: "HH:mm", horizonDays: int }?` | |
| `CalendarOverride` | `locationId`, `date` | string, `YYYY-MM-DD` (local) | PK pair |
| | `state` | `open \| closed` | |
| | `reason` | string? | |
| `CalendarPeriod` | `id`, `locationId` | string | e.g. ISO week |
| | `startDate`, `endDate` | local date | |
| | `state` | `draft \| confirmed \| locked` | |
| | `lockedBy` | `owner \| system`? | |
| `WindowRule` | `id`, `locationId` | string | |
| | `opens` | `RuleExpr` | |
| | `cutoff` | `RuleExpr` | |
| | `cutoffGrace` | ISO 8601 duration | default `PT0S` |
| `PreorderWindow` | `slotId` | string | 1:1 with slot |
| | `opensAt`, `cutoffAt` | UTC instant | |
| | `fulfilmentStart`, `fulfilmentEnd` | UTC instant | copied from slot |
| | `timezone` | IANA | denormalised |
| | `ruleSnapshot` | JSON | |

`RuleExpr` = `{ "kind": "relative", "duration": "-PT12H", "anchor": "fulfilmentStart" }` **or** `{ "kind": "calendar", "dayOffset": -1, "time": "20:00", "anchor": "fulfilmentStart" }`.

### Suggested SQL (Postgres; D1 notes inline)
```sql
CREATE TABLE fulfilment_location (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,                 -- IANA
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, -- D1: REAL
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- D1: TEXT ISO-8601
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE calendar_template (
  location_id TEXT PRIMARY KEY REFERENCES fulfilment_location(id),
  default_weekdays TEXT NOT NULL,         -- JSON array, e.g. '["SAT","SUN"]'
  fallback_lock JSONB,                    -- D1: TEXT (JSON)
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE calendar_override (
  location_id TEXT NOT NULL REFERENCES fulfilment_location(id),
  local_date DATE NOT NULL,               -- D1: TEXT 'YYYY-MM-DD'
  state TEXT NOT NULL CHECK (state IN ('open','closed')),
  reason TEXT,
  PRIMARY KEY (location_id, local_date)
);
CREATE TABLE calendar_period (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES fulfilment_location(id),
  start_date DATE NOT NULL, end_date DATE NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','confirmed','locked')),
  locked_by TEXT CHECK (locked_by IN ('owner','system')),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (location_id, start_date)
);
CREATE TABLE window_rule (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES fulfilment_location(id),
  opens JSONB NOT NULL, cutoff JSONB NOT NULL,
  cutoff_grace TEXT NOT NULL DEFAULT 'PT0S'
);
CREATE TABLE preorder_window (
  slot_id TEXT PRIMARY KEY,               -- FK slot(id), see 3.2
  opens_at TIMESTAMPTZ NOT NULL,
  cutoff_at TIMESTAMPTZ NOT NULL,
  fulfilment_start TIMESTAMPTZ NOT NULL,
  fulfilment_end TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  rule_snapshot JSONB NOT NULL,
  CHECK (opens_at < cutoff_at AND cutoff_at <= fulfilment_start AND fulfilment_start < fulfilment_end)
);
CREATE INDEX preorder_window_cutoff_idx ON preorder_window (cutoff_at);
```

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `GET /v1/locations/{locationId}/calendar?from=YYYY-MM-DD&days=N` | any | — | `200 { timezone, dates: [{ date, state: "open"\|"closed", source: "template"\|"override", periodState }] }` | `404 LOCATION_NOT_FOUND`, `400 INVALID_RANGE` (days > 62) |
| `PUT /v1/locations/{locationId}/calendar/template` | owner | `{ defaultWeekdays: Weekday[], fallbackLock?: { weekday, time, horizonDays } }` | `200 CalendarTemplate` | `400 INVALID_WEEKDAY`, `400 INVALID_TIME`, `412 VERSION_CONFLICT` |
| `PUT /v1/locations/{locationId}/calendar/overrides/{date}` | owner | `{ state: "open"\|"closed", reason?, force?: boolean }` | `200 CalendarOverride` | `409 DATE_HAS_ORDERS`, `409 PERIOD_LOCKED` |
| `POST /v1/locations/{locationId}/calendar/periods/{periodId}:confirm` | owner | — | `200 CalendarPeriod` | `409 PERIOD_ALREADY_LOCKED` |
| `PUT /v1/locations/{locationId}/window-rule` | owner | `{ opens: RuleExpr, cutoff: RuleExpr, cutoffGrace?: Duration }` | `200 WindowRule` + `{ rematerialisedSlots: int, skippedSlotsWithOrders: int }` | `400 INVALID_RULE`, `422 CUTOFF_AFTER_FULFILMENT` |
| `GET /v1/slots/{slotId}/window` | any | — | `200 { opensAt, cutoffAt, fulfilmentStart, fulfilmentEnd, timezone, isOpen, serverNow }` | `404 SLOT_NOT_FOUND` |

`serverNow` lets clients render countdowns without trusting device clocks.

## Domain Events
`CalendarTemplateChanged`, `CalendarOverrideSet`, `CalendarPeriodConfirmed`, `CalendarPeriodLocked { lockedBy }`, `WindowMaterialised { slotId, opensAt, cutoffAt }`, `WindowOpened`, `WindowClosed` (the last two emitted by the scheduler at the instants, see [3.9](./09-scheduled-jobs.md)).

## Invariants
* `opensAt < cutoffAt ≤ fulfilmentStart < fulfilmentEnd` for every window.
* A window with ≥ 1 non-terminal order is never re-materialised.
* A `locked` period cannot be edited except by an override with `force=true` by `owner`.
* All "is open" decisions use `Clock.now()` on the server.

## Codegen Notes
* **Module**: `core/schedule` (pure). Depends on a tz library through a tiny `TimeZoneResolver` helper (e.g. `Temporal` or `date-fns-tz`); no I/O.
* **Types**:
  ```ts
  type Weekday = 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN';
  type RuleExpr =
    | { kind: 'relative'; anchor: 'fulfilmentStart'; duration: string /* ISO 8601, signed */ }
    | { kind: 'calendar'; anchor: 'fulfilmentStart'; dayOffset: number; time: `${number}:${number}` };
  interface PreorderWindow { slotId: string; opensAt: Date; cutoffAt: Date; fulfilmentStart: Date; fulfilmentEnd: Date; timezone: string; }
  function materialiseWindow(slot: Slot, rule: WindowRule, tz: string): PreorderWindow;
  function isWindowOpen(w: PreorderWindow, now: Date): boolean;
  function resolveCalendar(t: CalendarTemplate, overrides: CalendarOverride[], from: LocalDate, days: number): CalendarDay[];
  ```
* **Tests to generate**: half-open boundaries (`now == opensAt` open, `now == cutoffAt` closed); `Asia/Kolkata` relative & calendar rules; `Europe/London` and `America/New_York` spring-forward gap and fall-back overlap; grace period accept/expire; override precedence over template; fallback lock idempotency; re-materialise skips slots with orders.
