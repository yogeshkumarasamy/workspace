# Repository Constitution

> **Status**: Living Document  
> **Scope**: Repository-Wide (Portfolio, Innings Break, Shared Packages, and future projects)

This constitution defines the foundational principles, workflows, and standards for this repository. It is a living document that must be consulted by developers and AI coding agents before planning or writing code.

---

## 1. Core Principles

### 1.1 Spec-Driven Development (SDD) First
* **No code without a spec**: No feature or non-trivial architectural change may be implemented without an approved specification (`spec.md`) and task breakdown (`tasks.md`).
* **Iterative & Living**: When requirements evolve during implementation, update the specification first, then adapt the code.
* **Traceability**: Every task and commit should map back to its feature specification.

### 1.2 Simplicity Over Cleverness
* Choose simple, readable, standard solutions over complex or speculative abstractions.
* Do not introduce libraries, microservices, or complex patterns until there is a concrete, present need.

### 1.3 Living Architecture
* Architectural decisions (database ORM, UI component styling, API routers, state management) are evaluated during feature planning and codified into this constitution as they are adopted.

---

## 2. Monorepo Standards

* **Package Manager**: Strictly `pnpm`. Do not use `npm` or `yarn`.
* **Task Orchestration**: All build, lint, dev, and test tasks are orchestrated via `turbo`.
* **Workspace Isolation**:
  * User-facing and standalone services live in `apps/`.
  * Shared code, configs, types, and component libraries live in `packages/`.
* **Shared Configs**: All packages must extend root/shared configs:
  * TypeScript: `@repo/typescript-config`
  * ESLint: `@repo/eslint-config`

---

## 3. Specification Lifecycle

Every feature in the repository moves through four clear stages:

```
┌──────────────┐      ┌───────────────┐      ┌──────────────┐      ┌──────────────┐
│    1. PRD    │ ───> │  2. Tech Spec │ ───> │   3. Tasks   │ ───> │ 4. Execution │
│(Why & What)  │      │    (How)      │      │ (Checklist)  │      │(Verification)│
└──────────────┘      └───────────────┘      └──────────────┘      └──────────────┘
```

1. **PRD (`prd.md`)**: Defines the problem statement, user personas, requirements, and scope.
2. **Technical Specification (`spec.md` & `plan.md`)**: Defines API contracts, data models, component breakdowns, and failure handling.
3. **Tasks (`tasks.md`)**: An atomic, verifiable checklist with unambiguous acceptance criteria.
4. **Execution & Verification**: Code is written against the tasks and verified against each acceptance criterion.

---

## 4. Amendment Process

* Any developer or AI agent may propose additions or modifications to this constitution when new architectural standards are decided.
* Amendments are recorded in this document with the rationale and date.

### Amendments Log
* **2026-09-21 (BMAD Framework & Strict Tooling Guardrails)**:
  - Codified absolute `pnpm` and `pnpm dlx` enforcement in [AGENTS.md](file:///AGENTS.md). Strictly zero tolerance for `npm`, `npx`, or `yarn`.
  - Added physical package manager lock (`"preinstall": "pnpm dlx only-allow pnpm"`).
  - Formalized BMAD agent persona definitions in `.bmad-core/agents/` (`pm.md`, `architect.md`, `scrum-master.md`, `dev.md`, `qa.md`).

