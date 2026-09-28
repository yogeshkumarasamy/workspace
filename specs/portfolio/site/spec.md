# Technical Specification: Portfolio Site Rebuild + shadcn `@repo/ui`

> **Ref PRD**: [prd.md](./prd.md) (Approved)  
> **Ref Inventory**: [content-inventory.md](./content-inventory.md)  
> **Status**: Draft — ready for execution after tasks  
> **Scope**: `@apps/portfolio` + `@repo/ui`  
> **Tooling**: pnpm only (`pnpm dlx` for shadcn CLI; never npm/npx/yarn/bun)  
> **Filters**: `--filter=@apps/portfolio --filter=@repo/ui`  
> **Date**: 2026-09-28

---

## 1. System Architecture & Overview

### 1.1 Goal

Replace the Vite starter stub in `apps/portfolio` with a single-page professional portfolio composed from a typed content module and shared shadcn primitives exported by `packages/ui` (`@repo/ui`).

### 1.2 Current baseline (real paths)

| Path | Role today |
| --- | --- |
| `apps/portfolio/package.json` | `@apps/portfolio`; scripts `dev`/`build`/`preview`/`lint`; depends on `@repo/ui`, React 18, Vite 5 |
| `apps/portfolio/index.html` | Title “Vite + React”; mounts `#app`; **embeds ChatSupport** (`app.chatsupport.co`, projectId `LS-570d5d3d`) — **remove** |
| `apps/portfolio/src/main.tsx` | Only mounts demo `Banner` (“We are upgrading the website”) |
| `apps/portfolio/src/style.css` | Vite starter CSS + `color-scheme: light dark` / `prefers-color-scheme` |
| `apps/portfolio/src/vite-env.d.ts` | Vite client types |
| `apps/portfolio/vite.config.ts` | `base: "./"`, `@vitejs/plugin-react` |
| `apps/portfolio/public/vite.svg`, `typescript.svg` | Starter assets — remove if unused |
| `packages/ui/package.json` | `@repo/ui`; exports `"."` → `./index.ts`, `"./banner"` → `./components/banner.ts` (**mismatch**: file is `banner.tsx`) |
| `packages/ui/index.ts` | Re-exports `./components` |
| `packages/ui/components/index.ts` | `export * from "./banner"` |
| `packages/ui/components/banner.tsx` | Typing demo Banner — **delete after replacement** |
| `specs/portfolio/` | Only `.gitkeep` today — promote SDD to `specs/portfolio/site/` |

### 1.3 Target architecture

```
┌─────────────────────────────────────────────────────────┐
│  apps/portfolio (Vite + React SPA)                      │
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │ content/     │  │ components/ (section composers)  │  │
│  │  profile.ts  │─►│  Hero, Experience, Education,    │  │
│  │  types.ts    │  │  Skills, Projects, Writing,      │  │
│  └─────────────┘  │  Contact                          │  │
│                   └──────────────┬───────────────────┘  │
│  App.tsx ◄───────────────────────┘                      │
│  main.tsx → createRoot(#app)                            │
└───────────────────────────┬─────────────────────────────┘
                            │ imports
┌───────────────────────────▼─────────────────────────────┐
│  packages/ui (@repo/ui)                                 │
│  components/ui/*  (shadcn: Button, Card, Badge, …)      │
│  src/lib/utils.ts (cn)                                  │
│  styles (Tailwind + CSS variables)                      │
└─────────────────────────────────────────────────────────┘
```

* **No backend / API** for MVP — static content module only.  
* Portfolio section components are app-local; shared look-and-feel comes from `@repo/ui`.  
* pnpm workspace; turbo verification scoped to the two packages.

---

## 2. API & Data Contracts

### 2.1 Endpoints

None for MVP. Contact is `mailto:` and external links only. No form backend, CMS, or Medium sync.

### 2.2 Data Models / TypeScript Schemas

Place in `apps/portfolio/src/content/types.ts` (or co-located with `profile.ts`):

```typescript
export interface ExperienceEntry {
  title: string;
  company: string;
  companyUrl?: string | null;
  /** Optional company-group duration label from LinkedIn (e.g. "3 years 6 months") */
  companyGroupTotal?: string | null;
  location?: string | null;
  /** ISO-ish month string YYYY-MM for sorting/display helpers */
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  /** Always empty until Owner provides — never invent */
  bullets: string[];
  /** Optional LinkedIn sub-line (FULL Creative headline echo) — not a bullet list */
  note?: string | null;
}

export interface EducationEntry {
  school: string;
  degree: string | null;
  years: string;
}

export interface ProjectEntry {
  name: string;
  url: string;
  language?: string;
  description: string;
}

export interface WritingEntry {
  title: string;
  venue: string;
  date: string; // YYYY-MM-DD
  url: string;
}

export interface Profile {
  name: string;
  nameAliases: string[];
  headline: string;
  location: string;
  about: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications: { name: string; issuer?: string; url?: string }[];
  projects: ProjectEntry[];
  writing: WritingEntry[];
  links: {
    linkedIn: string;
    medium: string;
    github: string;
    company: string;
    email: string | null;
    phone: string | null;
  };
}
```

**Population rules** (must match content-inventory.md):

* `experience`: full PDF array (9 role rows across 7 employers), overlapping Accenture/Pearson dates preserved, all `bullets: []`.  
* `about: null`, `certifications: []`, `links.phone: null`.  
* `skills`: exactly the three PDF Top Skills.  
* `links.email`: `yogeshkumarasamy@gmail.com`.

---

## 3. Component Breakdown (Frontend)

### 3.1 `@repo/ui` — shadcn architecture

| Item | Spec |
| --- | --- |
| Init | From `packages/ui`: `pnpm dlx shadcn@latest init` (Vite / non-RSC library settings) |
| Config | `packages/ui/components.json` — aliases for components, utils, CSS variables |
| Util | `packages/ui/src/lib/utils.ts` — `cn()` via `clsx` + `tailwind-merge` |
| Primitives (MVP) | `Button`, `Card` (+ Header/Title/Description/Content), `Badge`, `Separator` — add via `pnpm dlx shadcn@latest add …` |
| Location | Prefer `packages/ui/components/ui/*` (shadcn default) or document if CLI places under `src/components/ui` |
| Exports | Update `packages/ui/index.ts` and `package.json` `exports` for new components; **remove** `./banner` export and `banner.tsx` |
| Lint | Expand `@repo/ui` lint glob to include `**/*.{ts,tsx}` |
| Tailwind | Tailwind + PostCSS in `packages/ui`; portfolio imports shared CSS (e.g. `@repo/ui` style entry or documented CSS path). Prefer confining root config churn; document any unavoidable root touch in the PR |

### 3.2 Portfolio section components

App-local under `apps/portfolio/src/components/`:

| Component | Props / data | Behavior |
| --- | --- | --- |
| `HeroSection` | `name`, `headline`, `location`, `about` | H1 name; headline; location; render About paragraph only if `about` non-null |
| `ExperienceSection` | `experience[]` | Chronological list (PDF order). Company grouping optional (Trimble / BI WORLDWIDE totals). Omit bullet `<ul>` when `bullets` empty. Show `note` if present |
| `EducationSection` | `education[]` | School, degree (if any), years |
| `SkillsSection` | `skills[]` | Badges for CI/CD, Css in js, Vitest |
| `ProjectsSection` | `projects[]` | Card + external link to vitest-portfolio |
| `WritingSection` | `writing[]` | Card/link to Medium SSH article |
| `ContactSection` | `links` | mailto email, LinkedIn, Medium, GitHub, company. Omit phone when null |
| `App` | — | Landmark structure: `<header>`, `<main>` sections, `<footer>` optional |

`apps/portfolio/src/main.tsx` only bootstraps `App` + CSS. Expand portfolio lint to `"src/**/*.{ts,tsx}"`.

### 3.3 Planned file structure

```
packages/ui/
  components.json
  components/ui/button.tsx
  components/ui/card.tsx
  components/ui/badge.tsx
  components/ui/separator.tsx
  src/lib/utils.ts
  index.ts                    # export ui primitives (no Banner)
  package.json                # fixed exports; Tailwind deps
  # + tailwind/postcss/css as required by shadcn init

apps/portfolio/
  index.html                  # title e.g. "Yogesh Kumarasamy"; NO ChatSupport
  src/
    main.tsx
    App.tsx
    style.css                 # Tailwind layers / import @repo/ui CSS; keep color-scheme
    content/
      types.ts
      profile.ts
    components/
      HeroSection.tsx
      ExperienceSection.tsx
      EducationSection.tsx
      SkillsSection.tsx
      ProjectsSection.tsx
      WritingSection.tsx
      ContactSection.tsx
  public/                     # drop unused vite.svg / typescript.svg if unused

specs/portfolio/site/         # promoted SDD (prd, spec, plan, tasks, content-inventory)
```

### 3.4 Accessibility & theme

* Semantic landmarks and heading hierarchy (one H1 in Hero).  
* External links: sensible `rel` (`noopener noreferrer`) where `target="_blank"`.  
* Focus-visible styles on interactive elements (shadcn defaults + polish).  
* Preserve/improve light/dark via CSS variables / existing `prefers-color-scheme`; optional explicit toggle only if cheap.  
* Responsive: readable single column on mobile; constrained max-width on desktop.

### 3.5 ChatSupport removal

Delete the entire ChatSupport `<script data-no-bundle>…</script>` block from `apps/portfolio/index.html`. Do not re-add unless Owner explicitly requests.

### 3.6 Tooling constraints

* **pnpm only** — `pnpm dlx shadcn@latest …`  
* Verify with:  
  `pnpm turbo run build --filter=@apps/portfolio --filter=@repo/ui`  
  `pnpm turbo run lint --filter=@apps/portfolio --filter=@repo/ui`

---

## 4. Error Handling & Edge Cases

| Case | Handling |
| --- | --- |
| `about === null` | Hide About body; Hero still shows name/headline/location |
| `bullets.length === 0` | Hide bullet list for that role (do not show “TODO” in UI) |
| `certifications` empty | Omit Certifications section entirely |
| `phone === null` | Omit phone from Contact |
| Missing location on an entry | Omit location line for that entry |
| Overlapping employment dates | Display as stored — no “conflict” UI |
| Broken external image/photo | N/A — no photo in MVP |
| Network / API failures | N/A — no runtime API |
| Empty skills (future) | Hide Skills section if array empty (MVP has 3 skills) |

---

## 5. Acceptance Criteria

- [ ] **AC-01**: Given a fresh install, when `pnpm turbo run build --filter=@apps/portfolio --filter=@repo/ui` runs, then both packages build successfully.  
- [ ] **AC-02**: Given the same filters, when lint runs (with `.tsx` covered), then lint exits 0.  
- [ ] **AC-03**: Given the home page, when a visitor loads it, then they see Hero (name, headline, location), full Experience list from the PDF, Education (both schools), Skills (3), Projects (vitest-portfolio), Writing (SSH article), and Contact (email + social links) — and **no** upgrade Banner, Vite starter title, or ChatSupport script.  
- [ ] **AC-04**: Given Experience entries, when rendered, then titles/companies/dates/locations match the inventory and **no** invented achievement bullets appear.  
- [ ] **AC-05**: Given `about` is null, when Hero renders, then no fabricated bio paragraph is shown.  
- [ ] **AC-06**: Given `@repo/ui`, when portfolio imports primitives, then they come from shadcn components in `packages/ui` (Banner removed).  
- [ ] **AC-07**: Given mobile and desktop widths, when smoke-tested, then layout remains usable and links open the correct URLs (LinkedIn, Medium, GitHub, full.io, mailto).  
- [ ] **AC-08**: Given light/dark OS preference, when viewing the page, then theme remains readable (CSS variables / color-scheme).

---

## 6. Out of scope (Tech Spec)

* Implementing production code before Plan/Tasks execution kickoff.  
* Cloning the private repo via unauthenticated `gh`.  
* Inventing About text, role bullets, certs, phone, or photo.  
* Other monorepo apps/packages beyond `@apps/portfolio` and `@repo/ui`.
