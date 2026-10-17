# Task Checklist: `@contracts/innings-break`

> **Ref Plan**: [CI/CD revamp plan #93](https://github.com/yogeshkumarasamy/workspace/issues/93) §5.3  
> **Ref Spec**: [spec.md](file:///workspace/specs/innings-break/contract/spec.md)

---

## Tasks

- [ ] **Task 1: Shared contract package**

  - Target persona: Team Manager, Business Owner, Operations Manager
  - [ ] Add `@contracts/innings-break` with Zod schemas, route types, and a generated `openapi.json`
  - [ ] Depend on it from both apps and both APIs with `workspace:*`
  - **Verification**: `pnpm turbo run build --filter=...@contracts/innings-break --dry-run=json` lists both APIs and both apps.

- [ ] **Task 2: Drift check**

  - Target persona: Team Manager, Business Owner, Operations Manager
  - [ ] `contract:check` regenerates `openapi.json` and runs `git diff --exit-code`
  - **Verification**: `pnpm contract:check` exits 0 on a clean tree and the drift test exits non-zero when the spec changes.

- [ ] **Task 3: Breaking-change gate and expand-only migrations**

  - Target persona: Team Manager, Business Owner, Operations Manager
  - [ ] `oasdiff breaking` feeds a gate that reports `api-breaking` and fails unless the affected apps changed or `breaking-ack` is set
  - [ ] Migration lint rejects `DROP` / `RENAME` of tables and columns unless `breaking-ack` is set
  - **Verification**: `pnpm --filter @contracts/innings-break test` and `pnpm contract:breaking`.

- [ ] **Task 4: Leave surrounding PRs alone**
  - Target persona: Team Manager, Business Owner, Operations Manager
  - [ ] Do not edit `.github/workflows`, `deploy/targets.json`, or Innings Break runtime specs
  - **Verification**: `git diff --name-only main` stays inside the contract package, its four dependents, Turbo/pnpm wiring, and this spec.
