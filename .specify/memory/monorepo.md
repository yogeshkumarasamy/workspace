# Monorepo Architecture & Setup Memory

> **Purpose**: Persistent knowledge regarding repository structure, workspace setup, and tooling.

---

## Workspace Layout

```
workspace/
├── apps/
│   └── portfolio/          # Personal website (@apps/portfolio)
├── packages/
│   ├── ui/                 # Shared UI component library (@repo/ui)
│   ├── eslint-config/      # Shared ESLint configuration (@repo/eslint-config)
│   └── typescript-config/  # Shared TypeScript configuration (@repo/typescript-config)
├── .specify/               # GitHub Spec Kit: memory, templates, and constitution
├── specs/                  # Domain-specific specifications
├── pnpm-workspace.yaml     # Workspace definition (apps/* and packages/*)
├── turbo.json              # Turborepo task pipeline
└── package.json            # Root configuration
```

---

## Tooling & Execution Conventions

* **Install dependencies**: `pnpm install`
* **Run all apps in dev mode**: `pnpm dev`
* **Build all apps**: `pnpm build`
* **Lint all apps**: `pnpm lint`
* **Filter to a single app**: `pnpm turbo run <task> --filter=<package-name>`
  * Example: `pnpm turbo run dev --filter=@apps/portfolio`
