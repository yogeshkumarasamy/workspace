# Tasks

> Every task names its target persona (AGENTS.md §5). Verification uses pnpm / turbo only (AGENTS.md §1, §4).
> No implementation task may start until group 0 is checked by the repository owner.

## 0. Approval gates (repository owner)

- [ ] 0.1 [Persona: Team Manager, Business Owner, Operations Manager] Repository owner approves this proposal and the two spec deltas, and answers proposal Open Questions 1–4. Verify: approval recorded as a PR review or comment
- [ ] 0.2 [Persona: n/a, process] Promote the design into an approved Spec Kit Tech Spec (`specs/innings-break/customer/spec.md` + `plan.md`) or approve this design.md as the Tech Spec. Verify: approval recorded on the PR

## 1. API: cancellation cutoff and wallet ledger (`apps/innings-break-api`)

- [ ] 1.1 [Persona: Team Manager] Implement the slot → rainout cutoff rule (slot − 90 min) with unit tests for 6:30/10:30/2:30 slots and the exact-boundary case. Verify: `pnpm turbo run test --filter=innings-break-api`
- [ ] 1.2 [Persona: Team Manager] Add the Team-scoped `TeamWallet` with deposit and redemption ledger entries keyed by Team ID. Verify: tests show the balance stays with the Team across different Team Manager accounts
- [ ] 1.3 [Persona: Team Manager] Add a rainout cancellation operation that re-checks the cutoff on the server and, in one transaction, sets `Cancelled (Rainout)` and deposits 100% of the paid value. Verify: tests for the before-cutoff (success) and after-cutoff (rejected, no balance change) paths
- [ ] 1.4 [Persona: Team Manager] Apply credit at checkout using min(WalletBalance, OrderTotal), covering the full, partial and zero-balance cases. Verify: unit tests for all three scenarios in `team-wallet` spec

## 2. Customer app (`apps/innings-break`)

- [ ] 2.1 [Persona: Team Manager] Show the persistent header wallet pill on the Calendar, Menu, Orders and Profile screens, and refresh it after a deposit. Verify: component tests plus `pnpm turbo run build --filter=innings-break`
- [ ] 2.2 [Persona: Team Manager] Show the "Cancel Order (Rainout / Match Called Off)" action on active order cards until the cutoff, and route late attempts to an urgent support ticket. Verify: component tests for the before- and after-cutoff states
- [ ] 2.3 [Persona: Team Manager] Add the wallet ledger to the Team Profile tab (deposits and redemptions with timestamps). Verify: component test with seeded ledger entries
- [ ] 2.4 [Persona: Team Manager] Add the zero-payable one-click confirmation at checkout (no UPI launch when the wallet covers 100%). Verify: component test plus `pnpm turbo run lint --filter=innings-break`

## 3. Console (`apps/innings-break-console`)

- [ ] 3.1 [Persona: Business Owner, Operations Manager] Exclude `Cancelled (Rainout)` orders from the active kitchen prep queue and the aggregated prep sheet. Verify: tests on prep aggregation with a cancelled order present
- [ ] 3.2 [Persona: Business Owner, Operations Manager] List rainout cancellations and their automated credit issuance in the Cancelled Orders tab and notification stream, scoped to the Operations Manager's assigned hub. Verify: component tests for both personas

## 4. Integration

- [ ] 4.1 [Persona: Team Manager, Operations Manager] End-to-end check: cancel before the cutoff, then confirm the Console drops the order from the prep queue within one polling interval and the header pill shows the refund. Verify: E2E suite via `pnpm turbo run test` plus `pnpm lint`

## Workflow follow-up

- Run `openspec archive add-rainout-cancellation-engine` only after implementation is merged and the repository owner signs off.
