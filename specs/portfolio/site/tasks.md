# Task Checklist: Portfolio Rebuild + shadcn @repo/ui

> **Ref Plan**: [plan.md](./plan.md)  
> **Ref Spec**: [spec.md](./spec.md)  
> **Ref PRD**: [prd.md](./prd.md) (Approved)  
> **Status**: Ready for Execution  
> **Author**: Colleague (agent)  
> **Date**: 2026-09-28  
> **Scope**: `apps/portfolio` + `packages/ui`  
> **Content rule**: PDF inventory only — no invented About or achievement bullets. ChatSupport: remove.

---

## Dependency DAG

```
T1 Content module (full PDF experience)
 └─► T2 shadcn init + utils in @repo/ui
      └─► T3 Add & export MVP shadcn components
           ├─► T4 Clear Banner / stub UI / ChatSupport
           └─► T5 Portfolio page sections (needs T1 + T3)
                └─► T6 Theme, responsive, a11y polish
                     └─► T7 Build/lint verification
                          └─► T8 Specs under specs/portfolio/site/ + open PR
```

Prefer serial T1→T7 for clarity. T4 may start once T3 provides replacements.

---

## Tasks

- [ ] **Task 1: Typed content module**  
  - [ ] Add `apps/portfolio/src/content/types.ts` and `profile.ts` per Tech Spec schemas.  
  - [ ] Populate **full** experience array from content-inventory.md (FULL Creative → Design Factory); keep overlapping Accenture/Pearson dates; all `bullets: []`.  
  - [ ] Set email, 3 Top Skills, both education entries, vitest-portfolio project, Medium SSH writing, links.  
  - [ ] Leave `about: null`, `certifications: []`, `phone: null`.  
  - **Depends on**: nothing (execution kickoff).  
  - **Verification**: Module typechecks; every field traced to inventory or marked gap.

- [ ] **Task 2: shadcn foundation in `@repo/ui`**  
  - [ ] From `packages/ui`, run shadcn init via `pnpm dlx` (never npx).  
  - [ ] Configure Tailwind/PostCSS/CSS variables for a shared Vite-consumed UI package.  
  - [ ] Add `cn()` util; prepare package.json exports.  
  - **Depends on**: lifecycle Ready for Execution.  
  - **Verification**: `pnpm turbo run lint --filter=@repo/ui` (and build if applicable).

- [ ] **Task 3: MVP shadcn components + exports**  
  - [ ] `pnpm dlx shadcn@latest add` Button, Card, Badge, Separator (adjust if Spec adds helpers).  
  - [ ] Export from `packages/ui` index / package exports map.  
  - **Depends on**: T2.  
  - **Verification**: Importable as `@repo/ui`; lint clean.

- [ ] **Task 4: Clear dummy / stub UI**  
  - [ ] Remove `Banner` usage from `apps/portfolio`.  
  - [ ] Delete `banner.tsx` and `./banner` export; fix export map.  
  - [ ] Update `index.html` title to owner name; **remove ChatSupport script**.  
  - [ ] Remove unused Vite starter public assets.  
  - **Depends on**: T3.  
  - **Verification**: No upgrade-banner copy; no ChatSupport; grep clean for Banner / chatsupport.

- [ ] **Task 5: Portfolio sections composing `@repo/ui`**  
  - [ ] Add `App.tsx` + section components: Hero, Experience, Education, Skills, Projects, Writing, Contact.  
  - [ ] Use `@repo/ui` for shared primitives only.  
  - [ ] Hide About body when null; hide bullet lists when empty; omit certs/phone sections.  
  - **Depends on**: T1, T3.  
  - **Verification**: Preview shows all in-scope sections with PDF content only.

- [ ] **Task 6: Responsive, accessible, light/dark**  
  - [ ] Mobile + desktop layout.  
  - [ ] Semantic landmarks/headings; focus styles; external link attributes.  
  - [ ] Preserve/improve light/dark via color-scheme or shadcn CSS variables.  
  - **Depends on**: T5.  
  - **Verification**: Manual a11y/responsive smoke.

- [ ] **Task 7: Integration verification**  
  - [ ] `pnpm turbo run build --filter=@apps/portfolio --filter=@repo/ui`  
  - [ ] `pnpm turbo run lint --filter=@apps/portfolio --filter=@repo/ui` (`.tsx` covered).  
  - [ ] Confirm PRD success metrics / Spec ACs.  
  - **Depends on**: T4, T5, T6.  
  - **Verification**: Commands exit 0; AC checklist evidenced.

- [ ] **Task 8: Specs in repo + PR**  
  - [ ] Ensure `specs/portfolio/site/` contains prd.md, spec.md, plan.md, tasks.md, content-inventory.md (from promote folder).  
  - [ ] Open PR for portfolio rebuild + SDD (when repo access available).  
  - **Depends on**: T7.  
  - **Verification**: Specs present; PR opened/ready.

---

## Out of this checklist

* CMS, blog engine, auth, Innings Break work, inventing LinkedIn history, root-wide refactors unrelated to shadcn wiring, cloning without auth.
