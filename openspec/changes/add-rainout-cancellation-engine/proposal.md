# Proposal: Rainout Cancellation Engine & Persistent Team Wallet (Innings Break)

> **Status**: Trial conversion for evaluating OpenSpec. Not approved for implementation.
> **Source PRD**: [`specs/innings-break/customer/prd.md`](../../../specs/innings-break/customer/prd.md) §3.10, **US-13** (PRD status: *Draft*)
> **Cross-referenced (authority for the engine)**: [`specs/innings-break/console/prd.md`](../../../specs/innings-break/console/prd.md) §3.9, **US-23** (PRD status: *Approved*)
> **Supporting references in the same PRDs**: customer US-01 (Team-level wallet), US-10 (credit application formula), US-12 (order status list); console US-24 (soft-credit-only compensation)
> **Persona rules**: [`.specify/memory/innings-break-personas.md`](../../../.specify/memory/innings-break-personas.md)

Per [AGENTS.md](../../../AGENTS.md) §2, this proposal is a planning artifact only. Human approval is required before
moving to a tech spec, tasks or code. `/opsx:apply` must not be run against this change until the repository owner
approves it.

## Why

Early-morning coastal rain can wash out a match. The customer PRD lists "worries about losing money if rain washes out
the match" as a Team Manager pain point (§2.1). Console US-23 adds that late cancellations waste ingredients. US-13 and
console US-23 define a self-service cancellation window (at least 1.5 hours before the slot) that halts kitchen prep
and refunds 100% of the order value as Team soft credit. That credit stays visible and is applied automatically to the
next order.

## What Changes

- Add a self-service **"Cancel Order (Rainout / Match Called Off)"** action on active order cards in the Orders page.
  It is available only until the slot's automated rainout cutoff (90 minutes before the slot: 5:00 AM / 9:00 AM /
  1:00 PM for the 6:30 AM / 10:30 AM / 2:30 PM slots).
- On cancellation, the order moves to `Cancelled (Rainout)`, leaves the Console's active kitchen prep queue, is logged
  in the Console's Cancelled Orders tab and notification stream, and 100% of the paid value is deposited instantly into
  the Team Soft Credit Wallet.
- Late cancellations (less than 1.5 hours before the slot) cannot be done self-service. The Team Manager is routed to
  submit an urgent support ticket instead.
- Show the Team Soft Credit Wallet balance at all times: a header pill on the Calendar, Menu, Orders and Profile screens,
  plus a wallet ledger on the Team Profile tab.
- Apply the wallet balance automatically at checkout on the next pre-order. If the wallet covers 100%, the order
  confirms with one click and no UPI. If it covers part of the total, only the difference is paid by UPI.

## Capabilities

### New Capabilities

- `innings-break/rainout-cancellation`: The cancellation cutoff window, self-service rainout cancellation, kitchen-prep
  halting and Console visibility, the 100% soft-credit refund, and late-cancellation escalation.
- `innings-break/team-wallet`: The Team-entity-bound soft credit wallet: persistent balance visibility, the profile
  ledger, and automatic deduction at checkout.

### Modified Capabilities

- None. `openspec/specs/` is empty; this is the first OpenSpec change in the repo.

## Out of Scope (per source PRDs)

- Cash or bank refunds. Compensation is soft credit only (console US-24; customer §5 Out of Scope).
- How Console staff resolve late-cancellation tickets, including discretionary credit (console US-22 / US-23). This
  belongs to a future support capability.
- The dedicated Team Credits & Wallet History page with order-linked ledger entries (customer US-15) and the Help &
  Support screen (customer US-14). These are separate changes.
- Floodlight slots (6:00 PM / 10:00 PM).

## Open Questions (from the source, not resolved here)

1. **Cutoff boundary**: US-13 says the button is available "prior to the 1.5-hour cutoff", while the heading and
   console US-23 say "≥ 1.5h". The specs treat exactly 90 minutes before the slot as still allowed (≥). Please confirm.
2. **Status label**: US-13 and console US-23 use `Cancelled (Rainout)`, but customer US-12 lists
   `Cancelled (Rainout / Refunded)`. The specs use `Cancelled (Rainout)`.
3. **Delegated Match-Week Manager**: US-03 grants "full operational parity" for the assigned week but doesn't
   explicitly list cancellation. The specs scope the action to the `Team Manager` persona and leave delegation
   unspecified.
4. **Cancellation reason**: console US-18 mentions a "cancellation rationale" for `Cancelled / Refunded`. US-13 doesn't
   say whether the Team Manager supplies one.

## Impact

- **Apps (planned, none exist yet)**: `apps/innings-break` (Orders page, header, Team Profile, checkout),
  `apps/innings-break-console` (kitchen prep queue, Cancelled Orders tab, notification stream), and
  `apps/innings-break-api` (cancellation endpoint, wallet ledger).
- **Data**: A `TeamWallet` bound to the Team entity, with ledger entries for deposits and redemptions.
- **No code changes in this PR.** It contains spec artifacts only.
