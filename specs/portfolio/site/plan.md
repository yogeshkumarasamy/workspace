# Technical Implementation Plan: Portfolio Rebuild + shadcn @repo/ui

> **Ref Spec**: [spec.md](./spec.md)  
> **Ref PRD**: [prd.md](./prd.md) (Approved)  
> **Status**: Ready for Execution  
> **Author**: Colleague (agent)  
> **Date**: 2026-09-28  
> **Scope**: `apps/portfolio` + `packages/ui`  
> **Tooling**: pnpm only (`pnpm dlx` for shadcn CLI; never npm/npx/yarn/bun)  
> **Filters**: `@apps/portfolio`, `@repo/ui`  
> **Decisions locked**: Remove ChatSupport; full PDF experience array; no invented bullets/About

---

## 1. Prerequisites & Dependencies

* **Package manager**: `pnpm@8.15.6` (root `packageManager`); workspace packages `apps/*`, `packages/*`.  
* **shadcn into packages/ui**: `pnpm dlx shadcn@latest init` (and `add`) from `packages/ui`, configuring Tailwind + CSS variables for a shared UI package.  
* **Likely new deps in `@repo/ui`** (exact set after shadcn init): `tailwindcss`, `postcss`, `autoprefixer`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, Radix primitives as pulled by selected components.  
* **Portfolio**: already depends on `@repo/ui`, `react`, `react-dom`, Vite 5. Wire Tailwind entry CSS from `@repo/ui` or local `@tailwind` layers per chosen monorepo pattern.  
* **Config discipline**: Prefer changes confined to `packages/ui` and `apps/portfolio`. Avoid unrelated root config churn; only touch root/tsconfig/tailwind if shadcn monorepo setup strictly requires it — call out in PR.  
* **Content**: Populate from [content-inventory.md](./content-inventory.md) only.

---

## 2. File Changes & Structure

### Current state (baseline)

* `apps/portfolio/src/main.tsx` — only mounts `Banner` with upgrade copy.  
* `apps/portfolio/src/style.css` — Vite starter + `color-scheme: light dark`.  
* `apps/portfolio/index.html` — title “Vite + React”; **ChatSupport** script (remove).  
* `packages/ui` — exports only `Banner` (`banner.tsx`); export map lists `./components/banner.ts` while file is `.tsx`.  
* No Tailwind / shadcn / `components.json` in repo today.  
* `specs/portfolio/` — only `.gitkeep`.

### New files

* `packages/ui/components.json`, Tailwind/PostCSS configs, `src/lib/utils.ts`, `components/ui/{button,card,badge,separator}.tsx` (paths per shadcn init).  
* `apps/portfolio/src/content/{types,profile}.ts` — typed module with **full** PDF experience array.  
* `apps/portfolio/src/components/*Section.tsx`, `App.tsx`.  
* Repo path after PR: `specs/portfolio/site/{prd,spec,plan,tasks,content-inventory}.md`.

### Modified files

* `packages/ui/package.json`, `index.ts`, `components/index.ts` — new exports; drop Banner.  
* `apps/portfolio/package.json` — lint globs `src/**/*.{ts,tsx}`; any Tailwind wiring.  
* `apps/portfolio/src/main.tsx`, `style.css`, `index.html` — real shell; update title; **remove ChatSupport**.  
* Remove unused `public/vite.svg`, `public/typescript.svg` if unused.

### Untouched

* Other `apps/*`, other `packages/*` (except `@repo/ui`), Innings Break specs, root scripts beyond unavoidable shadcn wiring.

---

## 3. Implementation Steps (Logical Order)

1. **Content contract** — `types.ts` + `profile.ts` from inventory (full experience; empty bullets; about null; email set; 3 skills).  
2. **shadcn foundation in `@repo/ui`** — `pnpm dlx` init; Tailwind; `cn`; package exports.  
3. **MVP components** — Button, Card, Badge, Separator; export from `@repo/ui`.  
4. **Clear stub UI** — Remove Banner + ChatSupport + Vite starter chrome.  
5. **Portfolio sections** — Compose Hero, Experience, Education, Skills, Projects, Writing, Contact.  
6. **Theme & a11y** — Responsive; landmarks; focus; light/dark.  
7. **Verify** — turbo build + lint for both filters; manual smoke.  
8. **Specs in repo** — Ensure `specs/portfolio/site/` contains the promoted SDD set when opening the PR.

---

## 4. Risks & Decisions (locked / remaining)

| Item | Decision |
| --- | --- |
| ChatSupport widget | **Remove** (approved default) |
| About / bio | Omit until Owner writes |
| Role bullets | Empty arrays — never invent |
| Certifications | Omit (not confirmed in PDF) |
| Skills | Show PDF Top Skills (3) |
| Overlapping Accenture/Pearson dates | Keep as on LinkedIn |
| Banner component | Delete after replacement |
| Export map `.ts` vs `.tsx` | Fix during ui cleanup |
| Phone / photo | Omit |

---

## 5. Verification Commands

```bash
pnpm turbo run build --filter=@apps/portfolio --filter=@repo/ui
pnpm turbo run lint --filter=@apps/portfolio --filter=@repo/ui
```
