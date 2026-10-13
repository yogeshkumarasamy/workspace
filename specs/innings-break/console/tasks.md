# Task Checklist: Innings Break Console

> **Ref Plan**: [plan.md](file:///specs/innings-break/console/plan.md)  
> **Ref Spec**: [spec.md](file:///specs/innings-break/console/spec.md)  
> **Ref PRD**: [prd.md](file:///specs/innings-break/console/prd.md) (Approved)  
> **Status**: Draft - Awaiting Approval

**Rules for execution** ([AGENTS.md](file:///AGENTS.md) §2, §4): one task at a time, in dependency order; a task is ticked `[x]` only with the verification output shown; `pnpm` / `pnpm dlx` only; no `.github/workflows` edits by the agent.

**Legend**: `MVP-1` = first shippable slice (a Business Owner and an Operations Manager can run a match day end to end). `MVP-2` = rest of the approved PRD MVP scope. Every task lists **App / Persona**, **Stories**, **Depends on**, **Acceptance**, **Verification**.

Common verification shorthand:
* `V-DOMAIN` = `pnpm turbo run lint build test --filter=@repo/innings-break-domain`
* `V-API` = `pnpm turbo run lint build test --filter=@apps/innings-break-api`
* `V-CONSOLE` = `pnpm turbo run lint build test --filter=@apps/innings-break-console`
* `V-E2E` = `pnpm --filter @apps/innings-break-console test:e2e`
* `V-PERSONA` = `pnpm lint:personas`

---

## Dependency DAG

```
T-0.1 ─► T-0.2 ─► T-0.3
                    │
          ┌─────────┼──────────────┬──────────┐
          ▼         ▼              ▼          ▼
        T-1.3     T-1.1          T-1.2      T-1.5
          │         │              │
          └──► T-1.4 ◄─────────────┘(types)
                 │
        T-2.1 ─► T-2.2 ─► T-2.4 ─► T-2.3
                                  │
   ┌──────┬──────┬──────┬────────┼──────┬──────┬──────┐
   ▼      ▼      ▼      ▼        ▼      ▼      ▼      ▼
 T-3.1  T-3.2  T-3.3  T-3.4◄T-3.10 T-3.5  T-3.6◄T-3.7  T-3.8
   │              └──────────────┬───────────┘    │
   │                           T-3.9 ◄────────────┘
   ▼
 T-4.1 ─► T-4.2 ─► T-4.3 ─► { T-4.4 … T-4.11 } ─► T-4.12
                                   │
                         T-5.1 ─► T-5.2 ─► T-5.3
```
(UI task `T-4.n` additionally depends on its API task, listed per task.)

---

## Group 0 — Human Approval Gate (BLOCKING)

- [ ] **T-0.1: Approve Tech Spec & Plan** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner — as approver of product scope; human repo owner signs off)
  - **Stories**: all (US-01 – US-24)
  - [ ] Human reviews [spec.md](file:///specs/innings-break/console/spec.md) ADR-01…ADR-14, data model, API contracts
  - [ ] Human reviews [plan.md](file:///specs/innings-break/console/plan.md) dependencies
  - **Acceptance**: PR approved or explicit "approved" comment from the repo owner; spec/plan Status changed to `Approved`.
  - **Verification**: link to approval comment/review recorded here.

- [ ] **T-0.2: Approve this Task Breakdown & MVP slicing** — `MVP-1`
  - **App / Persona**: Innings Break Console (human approver)
  - **Depends on**: T-0.1
  - **Acceptance**: tasks.md Status → `Approved`; MVP-1 / MVP-2 split confirmed.
  - **Verification**: approval link recorded.

- [ ] **T-0.3: Resolve blocking Open Questions** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner decisions)
  - **Depends on**: T-0.1
  - [ ] Decide OQ-01–OQ-04 (rainout) before T-3.8
  - [ ] Decide OQ-06, OQ-07, OQ-08, OQ-09, OQ-10 before T-3.2/T-3.3
  - [ ] Decide OQ-11, OQ-12 before T-2.4 permission table
  - [ ] Decide OQ-15 (GST) before T-3.6 invoice; OQ-18 (providers/hosting) before T-3.10 and production SMS
  - [ ] Decide OQ-21 before T-1.4 seed
  - **Acceptance**: each answer written back into spec.md §9 (and requirement sections) in a follow-up docs PR; unanswered OQs keep the spec's stated defaults only if the human explicitly accepts them.
  - **Verification**: diff of spec.md §9 showing resolutions.

---

## Group 1 — Foundations

- [ ] **T-1.1: Scaffold `apps/innings-break-api`** — `MVP-1`
  - **App / Persona**: Innings Break API (serves Business Owner, Operations Manager)
  - **Stories**: enabling (all)
  - **Depends on**: T-0.2
  - [ ] Express + TS app extending `@repo/typescript-config`, `@repo/eslint-config`; `helmet`, `pino-http`, error envelope (spec §2.1), `/healthz`
  - [ ] Vitest + Supertest harness; `docker-compose.yml` with `postgres:16`; `.env.example`
  - **Acceptance**: `GET /healthz` → 200; unknown route → 404 error envelope.
  - **Verification**: `V-API` green; Supertest output shown.

- [ ] **T-1.2: Scaffold `apps/innings-break-console` + extend `@repo/ui`** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner, Operations Manager)
  - **Stories**: enabling (all)
  - **Depends on**: T-0.2
  - [ ] Vite + React 18 + TS app (`@apps/innings-break-console`), React Router, TanStack Query
  - [ ] Tailwind preset + shadcn primitives (Button, Input, Dialog, Sheet, Table, Tabs, Badge, Select, Switch, Calendar, Toast, Skeleton) added to `@repo/ui` via `pnpm dlx shadcn@latest add`
  - **Acceptance**: app builds and renders a placeholder using `@repo/ui` Button; `apps/portfolio` still builds.
  - **Verification**: `V-CONSOLE` and `pnpm turbo run build --filter=@apps/portfolio` green.

- [ ] **T-1.3: `packages/innings-break-domain` — schemas & pure rules** — `MVP-1`
  - **App / Persona**: shared package (Business Owner, Operations Manager; later Team Manager)
  - **Stories**: US-06, US-07, US-09, US-12, US-17, US-18, US-23, US-24
  - **Depends on**: T-0.2 (rule defaults per T-0.3)
  - [ ] zod schemas for every request/response in spec §2.2 and enums in §2.3
  - [ ] `ist` time helpers, `haversineKm`, `effectiveGroundCoords`, `isOrderableGround`, `slotStartAt`, `preOrderCutoffAt`, `cancellationCutoffAt`, `canAutoCancel`, `transitionOrder`, `autoCompleteDue`, `resolveDayStatus`, `weekLockAt`, `aggregatePrepSheet`, `applyWallet`
  - [ ] Table-driven tests incl. 04:59:59 / 05:00:00 / 05:00:01 boundaries, known Chennai distances, full transition matrix
  - **Acceptance**: AC-09, AC-10, AC-12 (rule level), AC-21 (state machine), AC-26 (cutoff rule), AC-27; 100 % line coverage on `rules/`.
  - **Verification**: `V-DOMAIN` with coverage report.

- [ ] **T-1.4: Database schema, migrations, seed** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner, Operations Manager)
  - **Stories**: US-01, US-04, US-07 (seed), all entities in spec §2.3
  - **Depends on**: T-1.1, T-1.3, T-0.3 (OQ-21)
  - [ ] Drizzle schema for all tables; partial unique indexes (one Business Owner, one active Primary hub); unique(date, hubId) on overrides; ledger table without UPDATE/DELETE for app role
  - [ ] Seed: Chennai city, "Chennai Central Kitchen Hub [Primary]", Business Owner from env, 5 match slots (3 enabled)
  - [ ] Non-production fixture script for sample teams/orders (OQ-22) used by tests and demo only
  - **Acceptance**: migrate up/down clean on empty DB; seed idempotent; constraint tests (second Primary / second Business Owner rejected).
  - **Verification**: `pnpm --filter @apps/innings-break-api db:migrate && pnpm --filter @apps/innings-break-api db:seed` output + `V-API`.

- [ ] **T-1.5: Persona-term guard & test conventions** — `MVP-1`
  - **App / Persona**: repo tooling (all Innings Break personas)
  - **Stories**: AGENTS.md §5, PRD Success Metric 9
  - **Depends on**: T-0.2
  - [ ] `scripts/check-persona-terms.mjs` scanning `apps/innings-break-*`, `packages/innings-break-domain`, `specs/innings-break` for banned misnomers (case-insensitive word match, allowlist for third-party identifiers if needed); root script `lint:personas`
  - **Acceptance**: AC-28; script fails on a seeded fixture containing a banned word.
  - **Verification**: `V-PERSONA` output (pass) + negative test output.

---

## Group 2 — Authentication & Authorization

- [ ] **T-2.1: OTP request/verify + `SmsOtpProvider` adapter** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner, Operations Manager)
  - **Stories**: US-01
  - **Depends on**: T-1.4
  - [ ] `POST /auth/otp/request`, `POST /auth/otp/verify`; hashed codes, TTL, attempts, rate limits
  - [ ] `SmsOtpProvider` interface + `console` dev adapter (+ real provider stub behind env per OQ-18)
  - **Acceptance**: AC-01, AC-02 (API level); stranger → exact message and adapter spy not called.
  - **Verification**: `V-API`.

- [ ] **T-2.2: Sessions, logout, `GET /auth/session`** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner, Operations Manager)
  - **Stories**: US-01, US-03
  - **Depends on**: T-2.1
  - **Acceptance**: httpOnly cookie set; logout invalidates; expired session → 401.
  - **Verification**: `V-API`.

- [ ] **T-2.4: Authorization middleware (`requirePersona`, `scopeToHub`) + permission table** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner, Operations Manager)
  - **Stories**: US-02, US-03, US-05, Success Metrics 8 & 9
  - **Depends on**: T-2.2, T-0.3 (OQ-11, OQ-12)
  - [ ] Encodes spec §1.4 matrix; `X-Hub-Id` handling; audit-log helper
  - [ ] Generated test: every registered route has a declared persona; Operations Manager gets 403 on Business-Owner-only routes and on foreign hub ids
  - **Acceptance**: AC-05, AC-06.
  - **Verification**: `V-API` (route-coverage test listed).

- [ ] **T-2.3: Team Members & invite links** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner)
  - **Stories**: US-02
  - **Depends on**: T-2.4
  - [ ] Endpoints spec §2.2-B + `GET /invites/:token`; invite verify path in T-2.1 flow; suspend revokes sessions
  - **Acceptance**: AC-03, AC-04.
  - **Verification**: `V-API`.

---

## Group 3 — Console API Features

- [ ] **T-3.1: Business Presences, hubs, serviceability** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner; Operations Manager read own hub)
  - **Stories**: US-04, US-05, US-06
  - **Depends on**: T-2.4
  - **Acceptance**: AC-07, AC-09 (API).
  - **Verification**: `V-API`.

- [ ] **T-3.2: Match slots & pre-order cutoffs** — `MVP-2`
  - **App / Persona**: Innings Break API (Business Owner)
  - **Stories**: US-07
  - **Depends on**: T-2.4, T-0.3 (OQ-06)
  - **Acceptance**: AC-10.
  - **Verification**: `V-API`.

- [ ] **T-3.3: Operational calendar (month/week/day, tags, active-days)** — `MVP-2`
  - **App / Persona**: Innings Break API (Business Owner: global/month/week; Operations Manager: own-hub day toggles)
  - **Stories**: US-08, US-09
  - **Depends on**: T-2.4, T-0.3 (OQ-07–OQ-10)
  - **Acceptance**: AC-11 (API), AC-12 (with T-3.9).
  - **Verification**: `V-API`.

- [ ] **T-3.10: `MediaStorage` adapter** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner)
  - **Stories**: US-11, US-14, US-15 (photos)
  - **Depends on**: T-1.1, T-0.3 (OQ-18)
  - [ ] Interface + `local` dev adapter; size/type validation (≤ 5 MB, jpg/png/webp)
  - **Acceptance**: oversized/wrong type → 400; stored key resolvable to URL.
  - **Verification**: `V-API`.

- [ ] **T-3.4: Areas, Venues (+media), Ground facilities** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner)
  - **Stories**: US-10, US-11, US-12, US-13
  - **Depends on**: T-2.4, T-3.1 (serviceability column), T-3.10
  - **Acceptance**: AC-13, AC-14, AC-15, AC-16 (API).
  - **Verification**: `V-API`.

- [ ] **T-3.5: Menu items, hub availability, bundles** — items/availability `MVP-1`, bundles `MVP-2`
  - **App / Persona**: Innings Break API (Business Owner: items; Business Owner & Operations Manager: availability, bundles)
  - **Stories**: US-14, US-15
  - **Depends on**: T-2.4, T-3.10, T-0.3 (OQ-11)
  - **Acceptance**: AC-17, AC-18.
  - **Verification**: `V-API`.

- [ ] **T-3.7: `DispatchProvider` adapters (manual logging)** — `MVP-1`
  - **App / Persona**: Innings Break API (Business Owner, Operations Manager)
  - **Stories**: US-20
  - **Depends on**: T-1.3
  - [ ] `dunzo`, `porter`, `direct`, `other` adapters: `validate()` + `normalizeRef()` only, no outbound calls; `DIRECT-<timestamp>` generator
  - **Acceptance**: AC-23 (unit level).
  - **Verification**: `V-API`.

- [ ] **T-3.6: Orders — board, date switcher, transitions, prep sheet, invoice** — board/transitions/prep `MVP-1`, invoice `MVP-2`
  - **App / Persona**: Innings Break API (Business Owner, Operations Manager — hub-scoped)
  - **Stories**: US-16, US-17, US-18, US-19, US-20
  - **Depends on**: T-3.4, T-3.5, T-3.7, T-0.3 (OQ-05, OQ-15 for invoice)
  - [ ] ETag on board; optimistic `expectedVersion`; status events; Accepted → customer notification record; staff cancel with reason
  - **Acceptance**: AC-19 (API), AC-20, AC-21 (except 24 h job), AC-22, AC-23.
  - **Verification**: `V-API`.

- [ ] **T-3.8: Support tickets, soft credits, team wallet ledger, rainout engine, cancelled orders, notifications** — `MVP-2`
  - **App / Persona**: Innings Break API (Business Owner, Operations Manager); rainout service is invoked by the Team Manager app later
  - **Stories**: US-21, US-22, US-23, US-24
  - **Depends on**: T-3.6, T-0.3 (OQ-01–OQ-04, OQ-14, OQ-17)
  - [ ] `cancelOrderForRainout` transactional service + concurrency test against `PREPARING` transition
  - [ ] `applyWallet` redemption service; `createSupportTicket` service (incl. `LATE_CANCELLATION`)
  - **Acceptance**: AC-24, AC-25, AC-26, AC-27.
  - **Verification**: `V-API`.

- [ ] **T-3.9: Scheduled jobs (24 h auto-complete, Sunday 14:00 IST week lock)** — `MVP-1` (auto-complete) / `MVP-2` (week lock)
  - **App / Persona**: Innings Break API (system on behalf of Business Owner, Operations Manager)
  - **Stories**: US-09, US-18
  - **Depends on**: T-3.3, T-3.6
  - [ ] In-process interval + `POST /internal/jobs/tick` (Bearer `JOBS_SECRET`), idempotent with `SKIP LOCKED`
  - **Acceptance**: AC-12, AC-21 (auto-complete).
  - **Verification**: `V-API` with fake clock tests.

---

## Group 4 — Console Frontend (each screen declares its Authorized Persona)

- [ ] **T-4.1: API client, query setup, error/toast handling** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner, Operations Manager)
  - **Depends on**: T-1.2, T-1.3
  - **Acceptance**: typed client parses responses with domain schemas; 401 → redirect to `/login`.
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.2: Login, OTP, invite landing** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner, invited Operations Manager)
  - **Stories**: US-01, US-02
  - **Depends on**: T-4.1, T-2.3
  - **Acceptance**: AC-01, AC-02, AC-03 (UI).
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.3: App shell, persona-filtered nav, Hub switcher** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner: switcher; Operations Manager: fixed hub)
  - **Stories**: US-03, US-05
  - **Depends on**: T-4.2, T-3.1
  - **Acceptance**: AC-05 (nav), AC-08.
  - **Verification**: `V-CONSOLE` (component tests per persona).

- [ ] **T-4.4: Active Month Calendar dashboard** — `MVP-2`
  - **App / Persona**: Innings Break Console (Business Owner: month/week toolbars; Operations Manager: own-hub day toggles)
  - **Stories**: US-08, US-09
  - **Depends on**: T-4.3, T-3.3
  - **Acceptance**: AC-11 (UI), lock indicators.
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.5: Areas, Venues (+media), Grounds screens** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner)
  - **Stories**: US-10 – US-13
  - **Depends on**: T-4.3, T-3.4
  - **Acceptance**: AC-13 – AC-16 (UI); PRD metric "multi-ground venue onboarded in < 2 min" checked manually.
  - **Verification**: `V-CONSOLE` + timed manual run noted.

- [ ] **T-4.6: Menu & availability; Bundle builder** — menu `MVP-1`, bundles `MVP-2`
  - **App / Persona**: Innings Break Console (Business Owner: item CRUD; Business Owner & Operations Manager: availability, bundles)
  - **Stories**: US-14, US-15
  - **Depends on**: T-4.3, T-3.5
  - **Acceptance**: AC-17, AC-18 (UI).
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.7: Kanban order board, order detail, dispatch & cancel dialogs** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner, Operations Manager)
  - **Stories**: US-16, US-18, US-20
  - **Depends on**: T-4.3, T-3.6
  - [ ] 5 columns + Cancelled tab, slot tabs, date switcher with counts, 20 s polling + Refresh Board, card anatomy, version-conflict handling, mobile tab layout
  - **Acceptance**: AC-19, AC-21, AC-23 (UI).
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.8: Prep sheet (print/copy) & Invoice modal (print/copy)** — prep `MVP-1`, invoice `MVP-2`
  - **App / Persona**: Innings Break Console (Business Owner, Operations Manager)
  - **Stories**: US-17, US-19
  - **Depends on**: T-4.7
  - **Acceptance**: AC-20, AC-22 (UI, print CSS screenshot).
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.9: Support & Issues, soft credit dialog, Cancelled Orders tab, notification bell** — `MVP-2`
  - **App / Persona**: Innings Break Console (Business Owner, Operations Manager)
  - **Stories**: US-21 – US-24
  - **Depends on**: T-4.3, T-3.8
  - **Acceptance**: AC-24, AC-25, AC-26 (UI visibility).
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.10: Team Members screen** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner only)
  - **Stories**: US-02
  - **Depends on**: T-4.3, T-2.3
  - **Acceptance**: AC-03, AC-04 (UI); route absent for Operations Manager.
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.11: Settings — Business Presences & slot cutoffs** — presences `MVP-1`, cutoffs `MVP-2`
  - **App / Persona**: Innings Break Console (Business Owner only)
  - **Stories**: US-04, US-07
  - **Depends on**: T-4.3, T-3.1, T-3.2
  - **Acceptance**: AC-07, AC-10 (UI).
  - **Verification**: `V-CONSOLE`.

- [ ] **T-4.12: PWA (manifest, service worker, offline screen, update prompt)** — `MVP-1`
  - **App / Persona**: Innings Break Console (Business Owner, Operations Manager)
  - **Stories**: innings-break.md §3.4 (platform), PRD §5 (PWA)
  - **Depends on**: T-4.3
  - **Acceptance**: Lighthouse/Chrome installability passes on `vite preview`; `/api/*` network-only/first (no stale orders).
  - **Verification**: `V-CONSOLE` + installability check output.

---

## Group 5 — Integration, QA & Handover

- [ ] **T-5.1: Playwright E2E for MVP journeys** — `MVP-1` journeys first, MVP-2 journeys after
  - **App / Persona**: Innings Break Console (Business Owner, Operations Manager)
  - **Depends on**: all MVP-1 tasks (then MVP-2)
  - [ ] Stranger lockout; Business Owner invites Operations Manager → OM onboards; venue+ground create; menu availability; board Confirmed→Completed with dispatch; prep sheet totals include unaccepted orders; (MVP-2) rainout auto-cancel shows in Cancelled tab with credit; ticket soft credit
  - **Acceptance**: all listed journeys pass on desktop + mobile viewports.
  - **Verification**: `V-E2E` report.

- [ ] **T-5.2: Authorization & persona audit** — `MVP-1`
  - **App / Persona**: Innings Break Console + API (Business Owner, Operations Manager)
  - **Depends on**: T-5.1
  - **Acceptance**: AC-05, AC-06, AC-28 re-verified across all routes and screens; zero banned-term hits.
  - **Verification**: `V-API` route-coverage test + `V-PERSONA`.

- [ ] **T-5.3: Docs, memory updates, CI job proposal, deploy notes** — `MVP-1`
  - **App / Persona**: repo (Business Owner as reader of runbook)
  - **Depends on**: T-5.2
  - [ ] Update `.specify/memory/monorepo.md` and constitution amendment log (Postgres/Drizzle, Express, TanStack Query adopted)
  - [ ] App READMEs (env, local Postgres, seed, demo fixtures, job tick)
  - [ ] Ready-to-paste GitHub Actions job (lint/build/test + Postgres service + E2E) delivered in the PR description for the **human** to add under `.github/workflows`
  - **Acceptance**: a fresh clone can run console + API locally from README steps.
  - **Verification**: `pnpm install && pnpm turbo run lint build test --filter=...innings-break...` from clean checkout.

---

## Summary

| Group | Tasks | MVP-1 | MVP-2 / partial |
|---|---|---|---|
| 0 Approval gate | 3 | 3 | – |
| 1 Foundations | 5 | 5 | – |
| 2 Auth & authz | 4 | 4 | – |
| 3 API features | 10 | T-3.1, T-3.4, T-3.7, T-3.10 (+ parts of T-3.5, T-3.6, T-3.9) | T-3.2, T-3.3, T-3.8 (+ bundles, invoice, week lock) |
| 4 Frontend | 12 | T-4.1, 4.2, 4.3, 4.5, 4.7, 4.10, 4.12 (+ parts of 4.6, 4.8, 4.11) | T-4.4, T-4.9 (+ bundles, invoice, cutoffs) |
| 5 QA & handover | 3 | 3 | – |
| **Total** | **37** | | |

**MVP-1 outcome**: Business Owner signs in, sets up the Primary hub, venues/grounds and menu, invites an Operations Manager; both run the day's board from Confirmed to Completed with courier references and print the prep sheet — installable as a PWA.  
**MVP-2 outcome**: calendar governance and cutoffs, bundles, invoices, support/soft credits, rainout engine, week-lock job — completing the approved PRD MVP scope.
