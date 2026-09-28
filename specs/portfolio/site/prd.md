# PRD: Portfolio Site Rebuild (apps/portfolio + packages/ui)

> **Status**: Approved  
> **Approval basis**: Original user rebuild request (BMAD/Specify SDD → open a PR) + LinkedIn PDF export attached; PRD approval widget was skipped — treat that ask as authorization through the lifecycle. **Default decision**: remove ChatSupport script from `apps/portfolio/index.html`.  
> **Author**: Colleague (agent)  
> **Date**: 2026-09-28  
> **Scope**: `apps/portfolio` + `packages/ui`  
> **Domain note**: Portfolio is exempt from Innings Break persona rules (see AGENTS.md §5).  
> **Content source**: LinkedIn PDF → `/workspace/linkedin-profile/resume-or-export.txt` + prior verified Medium / GitHub / full.io facts (see [content-inventory.md](./content-inventory.md)).

---

## 1. Problem Statement

* **What problem are we solving?**  
  `apps/portfolio` is still a Vite + React starter stub: a single typing `Banner` from `@repo/ui` that says the site is being upgraded. It does not present Yogesh Kumarasamy’s verified professional profile, experience, education, projects, or public writing.

* **Why is it important?**  
  Recruiters and hiring managers need a credible, fast personal site. The monorepo already has the right shape (Vite app + shared `@repo/ui`), but dummy UI and missing content block that use case.

* **Pain points**  
  - Visitors see an upgrade message, not experience/education/projects.  
  - Owner needs a typed content module populated from the LinkedIn PDF (no invented bullets).  
  - `@repo/ui` only exports a demo `Banner`; there is no shadcn-based component set for a real site.  
  - `index.html` embeds a third-party ChatSupport script that should be removed for MVP.

* **Content constraint (non-negotiable)**  
  Use **only** facts from the LinkedIn PDF export and prior verified Medium / GitHub / full.io links. **Never invent** About/bio copy, role achievement bullets, certification full names, phone, or photo. Empty `bullets: []` is correct until the Owner fills them.

---

## 2. Target Personas

* **Visitor (recruiter / hiring manager)**  
  - Goals: Quickly understand who Yogesh is, career history, education, skills, public projects/writing, and how to reach him.  
  - Pain points: Incomplete or placeholder-looking sites; slow/cluttered pages; unclear contact paths.

* **Owner (Yogesh maintaining content)**  
  - Goals: Ship a real personal site from PDF-verified facts; fill About/bullets later in one content module; keep UI consistent via `@repo/ui` + shadcn.  
  - Pain points: Dummy starter UI; risk of agents inventing achievement bullets or bio.

---

## 3. User Stories & Key Requirements

* **US-01**: As a **Visitor**, I want to see a Hero/About section with name, headline, and location, so that I know whose site this is.  
  * Requirement: Render **Yogesh Kumarasamy** (alias yogesh kumar), headline **“Senior software engineer at FULL Creative”**, location **Chennai, Tamil Nadu, India**.  
  * Requirement: About body is `null` / omitted until Owner provides copy — **no fabricated bio**.

* **US-02**: As a **Visitor**, I want to see full Experience history, so that I understand career progression.  
  * Requirement: Render **all** PDF experience entries (FULL Creative current; Trimble Lead UI + Senior; BI WORLDWIDE Associate Specialist + Senior; Accenture; Pearson; ISGN; The Design Factory) with titles, companies, dates, and locations **exactly as on LinkedIn**.  
  * Requirement: Keep overlapping Accenture / Pearson dates as listed.  
  * Requirement: Role bullets stay empty; do not invent achievements. FULL Creative may show the LinkedIn sub-line “Senior software engineer at FULL Creative” as a note, not as invented bullets.  
  * Requirement: Link FULL Creative to https://full.io/.

* **US-03**: As a **Visitor**, I want to see Education, so that I can verify academic background.  
  * Requirement: **RVS College of Engineering and Technology** — Bachelor of Technology (B.Tech.), Information Technology — (2008 – 2012).  
  * Requirement: **A V Higher Secondary School** — (1996 – 2008).

* **US-04**: As a **Visitor**, I want to see Skills, Projects, and Writing, so that I can sample capabilities and work.  
  * Requirement: Skills from PDF Top Skills: CI/CD, Css in js, Vitest.  
  * Requirement: Project — `yogeshkumarasamy/vitest-portfolio` (TypeScript; volume of browser test files to stress Vitest test runs and performance).  
  * Requirement: Writing — “How SSH Makes Managing Multiple Git Accounts Easy and Secure” (FULL Creative Medium, Apr 17, 2025) with canonical URL.  
  * Requirement: Omit certifications until Owner confirms full names.

* **US-05**: As a **Visitor**, I want Links/Contact, so that I can follow up.  
  * Requirement: Email **yogeshkumarasamy@gmail.com**; LinkedIn; Medium; GitHub user; company (full.io). Phone remains placeholder / omit.

* **US-06**: As an **Owner**, I want profile content in a typed data module, so that I can fill About/bullets without touching layout code.  
  * Requirement: Single content module (e.g. `apps/portfolio/src/content/profile.ts`) with typed fields, full experience array, and explicit `TODO` / `null` / empty `bullets` for gaps (see content-inventory.md).

* **US-07**: As an **Owner**, I want UI built from shadcn components in `@repo/ui`, so that portfolio and future apps share one design system.  
  * Requirement: Install/configure shadcn into `packages/ui` via `pnpm dlx`; export components used by portfolio; portfolio composes `@repo/ui` only (no one-off shadcn copies inside the app for MVP primitives).

* **US-08**: As a **Visitor**, I want a responsive, accessible page with light/dark support if already in stack, so that the site works on phone and desktop.  
  * Requirement: Responsive layout; semantic headings/landmarks; keyboard-focusable links; retain or improve existing `prefers-color-scheme` / dark-light behavior.

* **US-09**: As an **Owner**, I want dummy/stub UI and ChatSupport removed, so that the live page never shows the upgrade banner, Vite starter chrome, or third-party chat widget.  
  * Requirement: Remove/replace `Banner` usage, starter logos/titles (“Vite + React”), unused public SVGs as appropriate.  
  * Requirement: **Remove** the ChatSupport script from `apps/portfolio/index.html` (approved default).

---

## 4. Success Metrics

* `pnpm turbo run build --filter=@apps/portfolio --filter=@repo/ui` succeeds.  
* `pnpm turbo run lint --filter=@apps/portfolio --filter=@repo/ui` succeeds (adjust lint globs to cover `.tsx` if needed).  
* No dummy lorem / “upgrading the website” banner / Vite starter title / ChatSupport script on the rendered home page.  
* Sections render: Hero/About, Experience (full PDF list), Education, Skills, Projects (+ Writing), Links/Contact.  
* Content module documents sources; no invented About or achievement bullets.  
* Manual smoke: page usable at mobile and desktop widths; links open correct URLs.

---

## 5. Scope & Out-of-Scope

### In Scope (MVP)

* Rebuild `apps/portfolio` home page from PDF-verified profile + projects + Medium writing.  
* Introduce shadcn into `packages/ui` (`pnpm dlx`); export MVP primitives (Button, Card, Badge, Separator, and layout helpers as needed).  
* Typed content module with full experience array and placeholders only for true gaps (About, bullets, phone, photo, certs).  
* Clear dummy `Banner` / stub UI; **remove ChatSupport**.  
* Responsive, accessible single-page portfolio.  
* Dark/light: keep/improve existing CSS color-scheme support.  
* Specs under `specs/portfolio/site/` (promoted from staging).

### Out of Scope (Deferred)

* CMS, MDX blog engine, or Medium sync.  
* Auth, admin, analytics products, or contact form backend.  
* Innings Break apps/specs/personas or any other monorepo apps/packages beyond `apps/portfolio` + `packages/ui`.  
* Inventing About copy, role bullets, certs, phone, or photo.  
* Changing root monorepo tooling beyond what shadcn in `packages/ui` strictly requires.  
* Private monorepo details on the public site (only public `vitest-portfolio` as a project).

---

## 6. Content Gaps / Placeholders (Owner must fill)

See [content-inventory.md](./content-inventory.md). Summary:

| Field | Status |
| --- | --- |
| About / bio | Missing — omit / null |
| Experience role bullets | Missing for all roles — empty arrays |
| Certifications | Not confirmed in PDF — omit |
| Phone | Unknown — omit / null |
| Profile photo | Not retrieved — omit |
| The Design Factory location | Not on PDF — null / omit |

---

## 7. Lifecycle

```
PRD (Approved) ──> Tech Spec (Draft ready for execution after tasks) ──> Plan/Tasks (Ready for Execution) ──> Execution
```

Authoritative copies for the repo live under `promote/specs/portfolio/site/` (then `specs/portfolio/site/` in the workspace repo when the PR lands).
