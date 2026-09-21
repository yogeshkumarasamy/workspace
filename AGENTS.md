# Agent Operating System & Repository Directives

> **Authority**: Absolute  
> **Target Audience**: All AI Coding Assistants, Subagents, and Automated Tools  
> **Reference**: [Constitution](file:///.specify/memory/constitution.md)

This document contains non-negotiable operational rules and constraints for this repository. Every agent turn must strictly adhere to these directives.

---

## 1. Package Management & Tooling (Zero Tolerance)

* **STRICTLY FORBIDDEN**: NEVER invoke `npm`, `npx`, `yarn`, or `bun`.
* **MANDATORY**: ALWAYS use `pnpm` and `pnpm dlx`.
  * Package installation: `pnpm add <pkg>` or `pnpm install`
  * Workspace execution: `pnpm --filter <pkg> <script>` or `pnpm turbo run <task> --filter=<pkg>`
  * Remote binary execution: `pnpm dlx <pkg>` (NEVER `npx`)
* **Monorepo Task Runner**: All builds, lints, tests, and formatting runs must be orchestrated via `turbo` through `pnpm` (e.g., `pnpm turbo run build`).

---

## 2. Methodology: BMAD & Spec-Driven Development (SDD)

* **No Code Without a Spec**:
  * NEVER write production code, scaffold new applications, or make architectural changes without an approved specification (`spec.md`) and task breakdown (`tasks.md`).
* **The 4-Stage Lifecycle**:
  ```
  1. PRD (Why & What) ──> 2. Tech Spec (How) ──> 3. Tasks (Checklist) ──> 4. Execution & QA
  ```
* **Approval Gates**:
  * An agent must NEVER skip ahead across lifecycle phases without explicit human approval.
  * Human approval is required before transitioning from PRD to Architecture, from Architecture to Tasks, and from Tasks to Code Execution.

---

## 3. Monorepo Architecture & Isolation

* **Applications**: Standalone, deployable user-facing apps and services live exclusively in `apps/`.
* **Shared Packages**: Reusable utilities, configs, types, and UI components live in `packages/`.
* **Specs & Documentation**:
  * Specifications live in `specs/<project-domain>/<feature-or-app>/`.
  * High-level architectural and ecosystem memory lives in `.specify/memory/`.
  * Framework agent templates and personas live in `.bmad-core/` and `.specify/templates/`.
* **Config Inheritance**:
  * TypeScript packages must extend `@repo/typescript-config`.
  * ESLint configs must extend `@repo/eslint-config`.

---

## 4. Execution & Verification Standards

* **Atomic Execution**: When implementing tasks from `tasks.md`, implement them one task at a time.
* **Verification Proof**:
  * Every task must be verified using actual `pnpm` commands (e.g., `pnpm test`, `pnpm build`, `pnpm lint`).
  * An agent must never mark a task complete `[x]` without stating or showing the verification result.
* **Documentation Integrity**:
  * Keep specifications, memory files, and code comments updated when decisions change.
  * Always reference files using clickable markdown links (e.g. `[filename](file:///path/to/file)`).

---

## 5. Domain Scoping & Persona Anti-Drift (Innings Break)

* **Domain Isolation**:
  * **Innings Break Domain** (`apps/innings-break-*`, `specs/innings-break/**`): Strictly governed by the Canonical Persona Glossary in [innings-break-personas.md](file:///.specify/memory/innings-break-personas.md).
  * **Portfolio Domain** (`apps/portfolio`, `specs/portfolio/**`): Independent personal portfolio site; completely exempt from Innings Break persona constraints.
* **Canonical Persona Enforcement (Innings Break Only)**:
  * Only two active personas exist: `Team Manager` (user of **Innings Break**, located at `apps/innings-break`) and `Business Owner` (user of **Innings Break Console**, located at `apps/innings-break-console`).
  * `Player` and `Delivery` are passive/third-party with **strictly ZERO app access**.
  * Banned misnomers (Captain, Admin, Vendor, User) are strictly forbidden in all Innings Break PRDs, specs, tasks, and code.
* **Traceability Mandate**:
  * Every Innings Break user story in `prd.md` must start with `As a [Team Manager | Business Owner]`.
  * Every API endpoint and UI screen in `spec.md` must declare `Authorized Persona: [Team Manager | Business Owner]`.
  * Every task in `tasks.md` must declare its target persona.
* **Anti-Drift Guard**:
  * If a user prompt, agent suggestion, or spec attempt introduces unauthorized permissions (e.g., player login, vendor portals, individual player ordering), the agent must **HALT and flag the drift immediately**.

