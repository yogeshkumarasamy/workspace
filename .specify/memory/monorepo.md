# Monorepo Architecture & Setup Memory

> **Purpose**: Persistent knowledge regarding repository structure, workspace setup, and tooling.

---

## Workspace Layout

```
workspace/
├── apps/
│   ├── portfolio/                      # Personal website (@apps/portfolio)
│   ├── innings-break/                  # Team Manager app (@apps/innings-break); depends on the contract
│   ├── innings-break-console/          # Console (@apps/innings-break-console); depends on the contract
│   ├── innings-break-console-api/      # Scaffold — Worker ib-console-api-<env>; depends on the contract
│   ├── innings-break-customer-api/     # Scaffold — Worker ib-customer-api-<env>; depends on the contract
│   └── cron-hub/                       # Scaffold only — Worker cron-hub-<env> (pending T17 approval)
├── packages/
│   ├── innings-break-contract/    # Shared API contract (@contracts/innings-break)
│   ├── ui/                        # Shared UI component library (@repo/ui)
│   ├── eslint-config/             # Shared ESLint configuration (@repo/eslint-config)
│   └── typescript-config/         # Shared TypeScript configuration (@repo/typescript-config)
├── .specify/               # GitHub Spec Kit: memory, templates, and constitution
├── specs/                  # Domain-specific specifications
├── scripts/                # Repo checks (check-ib-wrangler.mjs)
├── pnpm-workspace.yaml     # Workspace definition (apps/* and packages/*)
├── turbo.json              # Turborepo task pipeline
└── package.json            # Root configuration
```

Innings Break services stay under `apps/` (see AGENTS.md). The runtime decision is pending approval in [specs/innings-break/runtime.md](file:///specs/innings-break/runtime.md). The console API, customer API, and cron hub directories are Wrangler scaffolding: no handlers and no deploy. Shared D1 migrations live in [packages/innings-break-contract/migrations](file:///packages/innings-break-contract/migrations) and are applied once per environment. `pnpm check:ib-wrangler` still refuses a `migrations_dir` on the Wrangler files.

The overall CI/CD target architecture, deploy safety engine, and environment matrix are specified in [specs/ci/plan.md](file:///specs/ci/plan.md).

---

## Tooling & Execution Conventions

* **Install dependencies**: `pnpm install`
* **Run all apps in dev mode**: `pnpm dev`
* **Build all apps**: `pnpm build`
* **Lint all apps**: `pnpm lint`
* **Check the Innings Break OpenAPI document for drift**: `pnpm contract:check`
* **Check the Innings Break contract for breaking changes**: `pnpm contract:breaking`
* **Check Innings Break Wrangler scaffolding**: `pnpm check:ib-wrangler`
* **Filter to a single app**: `pnpm turbo run <task> --filter=<package-name>`
  * Example: `pnpm turbo run dev --filter=@apps/portfolio`
