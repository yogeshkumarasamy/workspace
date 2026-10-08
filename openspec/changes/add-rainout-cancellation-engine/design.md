# Design

> Trial artifact. In this repo's lifecycle (AGENTS.md §2), the approved **Tech Spec** stage is still owned by the
> Spec Kit / BMAD flow (`spec.md` + `plan.md` from `.specify/templates/`). This design note records only constraints
> that the PRDs and `.specify/memory/` already state. It doesn't pick libraries, schemas or endpoints.

## Context

- See [proposal.md](./proposal.md) for motivation. Requirements are in `specs/innings-break/rainout-cancellation` and
  `specs/innings-break/team-wallet`.
- No Innings Break app exists in the repo yet. Only `apps/portfolio` does. The planned apps are `apps/innings-break`
  (Team Manager PWA), `apps/innings-break-console` (Business Owner / Operations Manager PWA) and `apps/innings-break-api`
  (Node.js + Express REST), per [`.specify/memory/innings-break.md`](../../../.specify/memory/innings-break.md) §3.
- The customer app gets status changes from the Console through lightweight background polling (15–30 s) plus a manual
  "Refresh Status" action (customer US-12, console US-16). There is no push channel.

## Goals / Non-Goals

**Goals:**
- One cutoff rule (slot time − 90 min), evaluated the same way by the API, the customer app and the Console.
- Cancelling the order and depositing the refund happen together. An order is never `Cancelled (Rainout)` without the
  matching wallet deposit.

**Non-Goals:**
- Console-side resolution of late-cancellation tickets (a future support capability).
- The full Team Credits & Wallet History page (customer US-15).
- Choosing a database, ORM or payment provider (constitution §1.3: decided during feature planning).

## Decisions

- **The server enforces the cutoff.** The customer app hides or disables the button after the cutoff, but the API
  re-checks the cutoff on every cancellation request, so a stale client can't cancel late. *Alternative considered*:
  client-only gating. Rejected because cancelling triggers a money-equivalent credit.
- **The cancellation and the wallet ledger entry are one transaction.** This meets the "zero delay, zero manual
  intervention" rule in US-13 and console US-23, and the < 1 s refund latency metric. *Alternative considered*: an async
  job that deposits the credit later. Rejected because it would make the header pill update late.
- **The wallet is keyed by Team ID, not Team Manager ID** (customer US-01, console US-24).

## Risks / Trade-offs

- [Clock or timezone drift at the boundary] → Evaluate the cutoff on the server in a single declared timezone. The
  PRDs imply IST for Chennai; this needs to be confirmed in the Tech Spec.
- [Ambiguity at exactly 90 minutes before the slot] → See proposal Open Question 1. The specs assume ≥ 90 min is
  allowed.
- [Polling lag makes the Console see the cancellation 15–30 s late] → Accepted for MVP per the PRD. The kitchen prep
  sheet is driven from server state, so a cancelled order is dropped from it as soon as it's cancelled.

## Open Questions

- See the proposal's Open Questions 1–4. Questions 1 and 3 could change the specs and must be answered by the
  repository owner before tasks are approved.
