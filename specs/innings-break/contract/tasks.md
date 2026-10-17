# Task Checklist: `@contracts/innings-break`

> **Ref Plan**: [CI/CD revamp plan #93](https://github.com/yogeshkumarasamy/workspace/issues/93) §5.3  
> **Ref Spec**: [spec.md](file:///workspace/specs/innings-break/contract/spec.md)

---

## Tasks

- [x] **Task 1: Shared contract package**

  - Target persona: Team Manager, Business Owner, Operations Manager
  - [x] Add `@contracts/innings-break` with Zod schemas, route types, and a generated `openapi.json`
  - [x] Depend on it from both apps and both APIs with `workspace:*`
  - **Verification**: `pnpm --filter @contracts/innings-break test` — affected-graph test passed. `turbo run build --filter=...@contracts/innings-break --dry-run=json` lists `@apps/innings-break`, `@apps/innings-break-console`, `@services/ib-console-api`, and `@services/ib-customer-api`.

- [x] **Task 2: Drift check**

  - Target persona: Team Manager, Business Owner, Operations Manager
  - [x] `contract:check` regenerates `openapi.json` and runs `git diff --exit-code`
  - **Verification**: `pnpm contract:check` exited 0 (`openapi.json matches the generated contract`). The drift test exits non-zero when the file changes.

- [x] **Task 3: Breaking-change gate and expand-only migrations**

  - Target persona: Team Manager, Business Owner, Operations Manager
  - [x] `oasdiff breaking` feeds a gate that reports `api-breaking` and fails unless the affected apps changed or `breaking-ack` is set
  - [x] Migration lint rejects `DROP` / `RENAME` of tables and columns unless `breaking-ack` is set
  - **Verification**: `pnpm --filter @contracts/innings-break test` — 22 passed, 0 failed. `pnpm contract:breaking` exited 0 on this branch (the spec is new relative to `main`).

- [x] **Task 4: Leave surrounding PRs alone**
  - Target persona: Team Manager, Business Owner, Operations Manager
  - [x] Do not edit `.github/workflows`, `deploy/targets.json`, or Innings Break runtime specs
  - **Verification**: the diff does not touch `.github/workflows`, `deploy/`, or `.specify/memory/innings-break.md`.
