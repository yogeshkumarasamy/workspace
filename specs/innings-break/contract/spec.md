# T18 · `@contracts/innings-break`

> **Status**: Approved for implementation by [issue #84](https://github.com/yogeshkumarasamy/workspace/issues/84) (epic [#82](https://github.com/yogeshkumarasamy/workspace/issues/82), plan [#93](https://github.com/yogeshkumarasamy/workspace/issues/93) §5.3 and §8.1).
> **Tasks**: [tasks.md](file:///workspace/specs/innings-break/contract/tasks.md)

## Problem

The Innings Break customer app, the console, and both Workers must share one request and response shape. A schema change has to show up in the Turborepo graph for both APIs and both apps, and a breaking change has to fail the gate unless it is acknowledged.

## Non-goals

- Editing `.github/workflows`. Open pull requests already change those files. The checks are `pnpm` / `turbo` scripts a later workflow can call.
- `deploy/targets.json` and `deploy/plan.mjs`. The planner already treats `packages/innings-break-contract` as the root of `@contracts/innings-break`.
- Wrangler files and `scripts/check-ib-wrangler.mjs`. Those come from the runtime scaffold. This change only adds the workspace dependency on the two API packages.
- The rest of the order, menu, and payment routes. Those land with the API work. This package is the shared contract and the checks around it.

## Package

[packages/innings-break-contract](file:///workspace/packages/innings-break-contract) is `@contracts/innings-break`.

- Zod schemas and route types live in `src/`.
- `openapi.json` is generated from those routes and committed.
- `migrations/` is the shared D1 folder. [runtime.md](file:///workspace/specs/innings-break/runtime.md) applies migrations once per environment from one folder and does not set `migrations_dir` on the Wrangler files. Files are expand-only.
- The Team Manager app, the console, and both API Workers depend on it with `workspace:*`:
  - `@apps/innings-break`
  - `@apps/innings-break-console`
  - `@apps/innings-break-console-api`
  - `@apps/innings-break-customer-api`

The two API packages are the Wrangler scaffolds from the runtime spec. This change adds the dependency and a no-op `build` so Turbo can see them. It does not change `wrangler.jsonc` or `src/index.js`.

A contract-only change therefore marks both APIs and both apps affected (plan §5.2 row 5).

## API

| Method and path                     | Authorized Persona                               | Response                                                                           |
| ----------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `GET /health`                       | Team Manager, Business Owner, Operations Manager | `HealthResponse` (`ok`, `service`, `sha`). Deploy smoke tests call the same probe. |
| `GET /customer/v1/orders/{orderId}` | Team Manager                                     | `Order`                                                                            |
| `GET /console/v1/orders/{orderId}`  | Business Owner, Operations Manager               | `Order`                                                                            |

`Order.status` is `Confirmed`, `Accepted`, `Preparing`, `InTransit`, `Delivered`, `Completed`, or `Cancelled`. `totalMinor` is paise. `slot` is `06:30`, `10:30`, or `14:30`. Each operation sets `x-authorized-personas` to the personas in this table.

Player and Delivery have no routes.

## `contract:check`

`pnpm contract:check` runs `turbo run contract:check`. The package script regenerates `openapi.json` and then runs `git diff --exit-code` on that file. A drift, including an untracked spec, exits non-zero. Labels do not waive it.

## Breaking-change gate

`pnpm contract:breaking` runs `turbo run contract:breaking`. It is not cached. The script:

1. Runs `oasdiff breaking <base> <head> --format json --fail-on ERR` (oasdiff 1.33.0). The base defaults to `origin/main:packages/innings-break-contract/openapi.json`. A missing base file means the spec is new, which is not breaking.
2. Lints every `apps/*/migrations/**/*.sql` file and every file under [migrations](file:///workspace/packages/innings-break-contract/migrations). `DROP TABLE`, `DROP COLUMN`, `RENAME TABLE`, and `RENAME COLUMN` fail. `DROP INDEX`, `CREATE TABLE`, `CREATE INDEX`, and `ADD COLUMN` stay expand-only. Comments and string literals are ignored.
3. Prints a JSON report. `addLabels` is `["api-breaking"]` when the OpenAPI diff is breaking or a migration is destructive.

The process exits 0 only when all of these hold:

- The OpenAPI diff is not breaking, or both UI packages that depend on `@contracts/innings-break` (`apps/innings-break` and `apps/innings-break-console`) have a changed file, or the label `breaking-ack` is set. A Worker package change does not waive the break.
- There are no destructive migrations, or `breaking-ack` is set. Updating an app does not waive a destructive migration.

`--label`, `CONTRACT_LABELS`, `--base-openapi`, `--head-openapi`, `--changed-file`, and `--migrations-dir` cover local runs and tests. A later workflow can add `api-breaking` from `addLabels` and fail `ci-gate` on the exit code. This spec does not add that workflow.
