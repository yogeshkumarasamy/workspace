# Technical Implementation Plan: Innings Break Console

> **Ref Spec**: [spec.md](file:///specs/innings-break/console/spec.md)  
> **Ref PRD**: [prd.md](file:///specs/innings-break/console/prd.md)  
> **Status**: Draft - Awaiting Approval (becomes "Ready for Execution" only after human approval of spec.md and tasks.md)

---

## 1. Prerequisites & Dependencies (installed only during execution, never before approval)

* **New workspaces**: `apps/innings-break-console`, `apps/innings-break-api`, `packages/innings-break-domain` (all matched by existing `pnpm-workspace.yaml` globs).
* **Console** (`pnpm --filter @apps/innings-break-console add ...`): `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `vite-plugin-pwa`, `date-fns`, `date-fns-tz`.
* **@repo/ui**: `tailwindcss`, shadcn/ui primitives (Radix), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` — added via `pnpm dlx shadcn@latest add ...` (never `npx`).
* **API**: `express`, `helmet`, `cookie-parser`, `pino`, `pino-http`, `drizzle-orm`, `pg`, `zod`, `multer`; dev: `drizzle-kit`, `tsx`, `vitest`, `supertest`.
* **Domain**: `zod`, `date-fns-tz`; dev `vitest`.
* **E2E**: `@playwright/test` in the console app.
* **Local infra**: Docker `postgres:16` (compose file in `apps/innings-break-api/`).
* **Env vars** (`.env.example`, no secrets committed): `DATABASE_URL`, `SESSION_SECRET`, `JOBS_SECRET`, `BUSINESS_OWNER_MOBILE`, `BUSINESS_OWNER_NAME`, `SMS_PROVIDER` (`console` in dev), `MEDIA_STORAGE` (`local` in dev), `CONSOLE_ORIGIN`.
* **Node**: pin via `engines` + `.nvmrc` to Node 20 LTS (Tailwind v4 oxide needs ≥ 20).
* **turbo.json**: add `test` and `test:e2e` tasks (`dependsOn: ["^build"]`).

## 2. File Changes & Structure

### New Files
* `packages/innings-break-domain/src/{schemas,rules,time,money}/*.ts` — zod schemas + pure rules (spec §2.4).
* `apps/innings-break-api/src/{app.ts,server.ts}`, `src/db/{schema.ts,migrations/,seed.ts}`, `src/auth/*`, `src/authz/*`, `src/routes/console/*`, `src/services/*`, `src/adapters/{sms,media,dispatch}/*`, `src/jobs/*`, `test/**`.
* `apps/innings-break-console/src/{main.tsx,routes/,features/<area>/,lib/api.ts}`, `public/manifest icons`, `e2e/**`.
* `scripts/check-persona-terms.mjs` (run via `pnpm`), invoked by a `lint:personas` script.

### Modified Files
* `packages/ui/*` — add Tailwind preset + shadcn primitives (exports added, existing `banner` untouched).
* `turbo.json`, root `package.json` (scripts only), `.specify/memory/monorepo.md` (layout), `.specify/memory/constitution.md` (amendment log: Postgres + Drizzle, Express, TanStack Query adopted).
* **Not modified by the agent**: `.github/workflows/**` (token lacks workflow scope; a ready-to-paste job is delivered in T-5.3 for the human).

## 3. Implementation Steps (Logical Order)
1. **Data contracts & rules** — `packages/innings-break-domain` (T-1.3).
2. **Backend** — scaffold, schema/migrations/seed, auth, authz, feature routes, adapters, jobs (T-1.1, T-1.4, T-2.x, T-3.x).
3. **Frontend** — scaffold + `@repo/ui`, shell, feature screens, PWA (T-1.2, T-4.x).
4. **Integration & verification** — E2E, authz audit, persona scan, docs, CI job proposal (T-5.x).
