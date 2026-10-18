# Monorepo Architecture & Setup Memory

> **Purpose**: Persistent knowledge regarding repository structure, workspace setup, and tooling.

---

## Workspace Layout

```
workspace/
├── apps/
│   ├── portfolio/                      # Personal website (@apps/portfolio)
│   ├── innings-break-console-api/      # Scaffold only — Worker ib-console-api-<env> (pending T17 approval)
│   ├── innings-break-customer-api/     # Scaffold only — Worker ib-customer-api-<env> (pending T17 approval)
│   └── cron-hub/                       # Scaffold only — Worker cron-hub-<env> (pending T17 approval)
├── packages/
│   ├── ui/                 # Shared UI component library (@repo/ui)
│   ├── eslint-config/      # Shared ESLint configuration (@repo/eslint-config)
│   └── typescript-config/  # Shared TypeScript configuration (@repo/typescript-config)
├── .specify/               # GitHub Spec Kit: memory, templates, and constitution
├── specs/                  # Domain-specific specifications
├── scripts/                # Repo checks (check-ib-wrangler.mjs)
├── pnpm-workspace.yaml     # Workspace definition (apps/* and packages/*)
├── turbo.json              # Turborepo task pipeline
└── package.json            # Root configuration
```

Innings Break services stay under `apps/` (see AGENTS.md). The runtime decision is pending approval in [specs/innings-break/runtime.md](file:///specs/innings-break/runtime.md). Those three app directories are Wrangler scaffolding: no handlers, no migrations, no deploy.

---

## Tooling & Execution Conventions

* **Install dependencies**: `pnpm install`
* **Run all apps in dev mode**: `pnpm dev`
* **Build all apps**: `pnpm build`
* **Lint all apps**: `pnpm lint`
* **Filter to a single app**: `pnpm turbo run <task> --filter=<package-name>`
  * Example: `pnpm turbo run dev --filter=@apps/portfolio`
