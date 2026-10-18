# PRD: Portfolio Retro Redesign — "YK-OS"

> **Status**: Draft — awaiting Owner approval  
> **Date**: 2026-10-16  
> **App**: `apps/portfolio` (`@apps/portfolio`) in `yogeshkumarasamy/workspace`  
> **Epic**: "Portfolio retro redesign (epic)" issue · stories labelled `portfolio` + `retro-redesign`  
> **Base assumption**: planned against `origin/main` (Vite 5 + React 18 + TS, `@repo/ui` Banner only). PR #18 (`feat/portfolio-shadcn-rebuild`, shadcn rebuild) is **still open and unmerged**; this redesign **supersedes its UI**. Only its verified content inventory (`specs/portfolio/site/content-inventory.md`) is reused (facts copied into §4). If PR #18 merges first, story S01 rebases and replaces its `src/` UI.

## 1. Summary

Rebuild Yogesh Kumarasamy's personal site as a playful **"old computer" developer OS**: a short BIOS-style boot, a classic desktop with draggable windows (About, Experience, Projects, Writing, Contact, Terminal), CRT scanline styling and a working terminal with commands. A fast, accessible **Classic view** (plain semantic one-page résumé) is always one click / one keypress away, and is the default for reduced-motion users, small screens that opt in, crawlers and no-JS.

## 2. Goals / non-goals

**Goals**

1. Memorable first impression that signals "senior frontend engineer who cares about craft".
2. A recruiter finds name, role, experience and contact in **≤ 10 s** (Classic view or Experience window).
3. WCAG 2.2 AA, full keyboard operation, `prefers-reduced-motion` respected.
4. Lighthouse ≥ 95 Performance/Accessibility/Best Practices/SEO on the Classic view; ≥ 90 Performance on desktop OS view.
5. Content is typed data, editable without touching UI.
6. Work splits into independent stories that parallel agents can implement without file conflicts.

**Non-goals**: CMS/backend, blog engine, contact form backend, analytics vendor lock-in, games/easter-egg apps beyond the terminal, i18n.

## 3. Audience / personas

| Persona                                              | Need                            | Default path                                  |
| ---------------------------------------------------- | ------------------------------- | --------------------------------------------- |
| Recruiter / hiring manager (mobile or desktop, 30 s) | Role, years, companies, contact | Boot skip → Experience window or Classic view |
| Engineer / tech lead                                 | Craft signals, code, writing    | Terminal, Projects, GitHub                    |
| Peer / community                                     | Article, socials                | Writing window                                |
| Screen-reader / keyboard / reduced-motion user       | Same info without the gimmick   | Classic view (auto for reduced motion)        |
| Crawler / link preview                               | Title, description, OG          | Static HTML in `index.html` + Classic markup  |

## 4. Content (verified facts only — never invent)

Source: LinkedIn PDF export (`/workspace/linkedin-profile/resume-or-export.txt`) and PR #18 `content-inventory.md`.

- **Name**: Yogesh Kumarasamy (alias "yogesh kumar")
- **Headline**: Senior Software Engineer at FULL Creative · **Location**: Chennai, Tamil Nadu, India
- **Email**: yogeshkumarasamy@gmail.com
- **Links**: LinkedIn https://www.linkedin.com/in/yogeshkumarasamy · Medium https://medium.com/@yogeshkumarasamy · GitHub https://github.com/yogeshkumarasamy · FULL Creative https://full.io/
- **Top skills**: HTML5, CSS3, JavaScript, ES6, React.js, Redux, Webpack, Vite, Vitest, Playwright, Node.js, Express, Mongoose, GCP, CI/CD, Caching and remote task caching in CI, Docker, Design system (EDS), shadcn, TypeScript, ESLint, Prettier, Package managers. Groups: Monorepos (Moonrepo, Turborepo), Design tools (Figma), Agentic tools (Claude, Grok, Antigravity).

**Experience** (order as on LinkedIn, overlaps kept, `bullets: []` until Owner supplies)

| Company                            | Title                                  | Dates             | Location                   |
| ---------------------------------- | -------------------------------------- | ----------------- | -------------------------- |
| FULL Creative                      | Senior Software Engineer               | 2024-07 – present | Chennai, Tamil Nadu, India |
| Trimble Inc.                       | Lead UI Engineer                       | 2023-01 – 2024-07 | Chennai, Tamil Nadu, India |
| Trimble Inc.                       | Senior Software Engineer               | 2021-02 – 2023-01 | Chennai, Tamil Nadu, India |
| BI WORLDWIDE                       | Associate Specialist                   | 2020-09 – 2021-02 | Chennai, Tamil Nadu, India |
| BI WORLDWIDE                       | Senior Software Engineer               | 2018-05 – 2020-09 | Chennai, Tamil Nadu, India |
| Accenture                          | Application Development Senior Analyst | 2016-07 – 2018-04 | Chennai Area, India        |
| Pearson English Business Solutions | UI Developer                           | 2016-01 – 2017-07 | Chennai Area, India        |
| ISGN                               | UI Developer                           | 2014-05 – 2015-01 | Chennai Area, India        |
| The Design Factory                 | Front end web developer                | 2012-10 – 2014-04 | _(null)_                   |

**Education**: RVS College of Engineering and Technology — B.Tech., Information Technology (2008–2012).  
**Projects** (company groups; descriptions not supplied): Full Creative — Booking page https://anywhere.setmore.com/kevin-payne, BaseApp https://go.setmore.com/, ChatSupport https://chatsupport.co/; Trimble — Kuebix; BI WORLDWIDE — Daymaker, Goodman, Recognition TV, Ecards UI, Delivery customizations; Accenture — AusNet, CMHC, Volvo; Pearson English — Dashboard, Digital Classroom.
**Writing**: "How SSH Makes Managing Multiple Git Accounts Easy and Secure" — FULL Creative blog on Medium, 2025-04-17 — https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071

**TODO placeholders (Owner)** — render as clearly marked placeholders in dev, hidden in prod: About/bio (`about: null`), role achievements (`bullets: []`), profile photo (`photo: null`), certifications (`[]`), phone (`null`). The private `workspace` repo must **not** be listed publicly.

## 5. Information architecture

```
Boot (skippable, once per session)
└─ Desktop "YK-OS"
   ├─ Icons: About.txt · Experience.exe · Projects/ · Writing/ · Contact.lnk · Terminal · Classic View
   ├─ Windows (one per app, multiple open, focus/z-order)
   └─ Taskbar: Start menu (same apps) · open windows · clock (Asia/Kolkata local) · theme toggle
Classic view  (#/classic) — single semantic page: header, about, experience, projects, writing, skills, education, contact
```

Routing: hash-based (`#/`, `#/classic`, `#/app/<id>`) — deep links open a specific window; no router dependency.

## 6. Retro UX spec

- **Boot**: ≤ 2.5 s typed BIOS/POST lines (`YK-OS BIOS v2026 … Memory test OK … Loading portfolio.sys`), then desktop. Skip with any key/click/tap; shown once per session (`sessionStorage`); **never** shown with reduced motion, on `#/classic`, or to bots (render nothing that blocks LCP).
- **Desktop**: classic OS look (Win95/98 + Mac OS classic hybrid), teal/pixel wallpaper, bevelled windows, title bar with minimise/maximise/close, drag by title bar (pointer events), keyboard move, cascade placement, focus brings to front. Double-click/Enter opens icon.
- **Terminal**: green/amber phosphor; prompt `yogesh@yk-os:~$`; commands: `help`, `whoami`, `about`, `experience`, `projects`, `writing`, `contact`, `skills`, `open <app>`, `classic`, `theme <green|amber|light>`, `clear`, `history`, `date`, `echo`, `sudo hire-me` (easter egg → contact). Tab completion, ↑/↓ history, unknown command → `command not found: x. Try 'help'`. Output region `aria-live="polite"`.
- **CRT**: scanlines + slight vignette/glow via CSS overlay (`pointer-events:none`), flicker **off** by default; a "CRT effect" toggle in taskbar; disabled under reduced motion & `prefers-contrast: more`.
- **Mobile (< 768 px)**: no free dragging; apps open full-screen as "cards" with a bottom dock; terminal gets on-screen command chips. Banner offers Classic view.
- **Themes**: `green` (default phosphor), `amber`, `light` (beige 90s desktop). Persist in `localStorage`.

## 7. Design tokens (owned by S02, consumed as CSS custom properties)

```
--yk-font-mono: "IBM Plex Mono", ui-monospace, monospace   (self-hosted woff2, subset, font-display: swap)
--yk-font-ui:   "Pixelify Sans", system-ui, sans-serif       (headings / title bars only)
--yk-bg, --yk-fg, --yk-accent, --yk-muted, --yk-desktop, --yk-window-bg, --yk-titlebar-bg, --yk-titlebar-fg,
--yk-bevel-light, --yk-bevel-dark, --yk-focus (≥3:1 vs adjacent), --yk-danger
--yk-space-1..6 (4px scale) · --yk-radius: 0 · --yk-shadow-window · --yk-z-desktop/window/taskbar/overlay/boot
```

Theme switch = `data-theme="green|amber|light"` on `<html>`. CRT = `data-crt="on|off"`. All text/background pairs ≥ 4.5:1.

## 8. Accessibility (WCAG 2.2 AA)

- Skip link "Skip to Classic view" as first focusable element.
- Every window: `role="dialog"` (non-modal), `aria-labelledby` title; focus moves into window on open and returns to icon on close; `Esc` closes focused window; `Alt+Tab`-style cycling via `Ctrl+\``; move with arrow keys when title bar focused (`M` mode).
- Desktop icons: roving tabindex grid; Taskbar is `role="toolbar"`.
- Reduced motion ⇒ no boot, no flicker/typing animation, Classic view suggested (auto when `#/` first visit + reduce).
- No information only in colour; focus ring always visible (2.4.11/2.4.13); target size ≥ 24px (2.5.8); dragging has a non-drag alternative (2.5.7).
- Classic view is the canonical accessible rendering of all content; axe has 0 serious/critical violations on both views.

## 9. Performance budgets

| Metric                                                         | Budget                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Initial JS (gzip)                                              | ≤ 90 KB (React incl.); each app window lazy-loaded ≤ 15 KB |
| CSS (gzip)                                                     | ≤ 20 KB                                                    |
| Fonts                                                          | ≤ 2 woff2, ≤ 60 KB total, preloaded                        |
| LCP (mobile, 4G)                                               | ≤ 2.0 s · CLS ≤ 0.05 · INP ≤ 200 ms                        |
| Images                                                         | wallpaper as CSS/SVG pattern, OG image ≤ 150 KB            |
| No terminal library (xterm.js ≈ 300 KB) — custom DOM terminal. |

## 10. SEO / sharing

Static `<title>`, meta description, canonical, Open Graph + Twitter card, `og.png` (1200×630 retro screenshot), JSON-LD `Person` (name, jobTitle, worksFor FULL Creative, sameAs LinkedIn/GitHub/Medium), `robots.txt`, `sitemap.xml`, `<noscript>` summary with contact links. Analytics: optional, privacy-friendly, behind `VITE_ANALYTICS_*` env, off by default (out of scope for v1 stories).

## 11. NFRs

Evergreen browsers (last 2), Safari iOS 16+. Node 18 compatible build (CI uses Node 18). pnpm only. No secrets. `localStorage`/`sessionStorage` failures handled. Strict TS, ESLint clean.

## 12. Stack decision

| Area           | Choice                                                        | Why                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | **React 18 + Vite 5 + TS 5.5** (existing)                     | Already in `apps/portfolio`; static output works with existing preview workflow (`pnpm --filter @apps/portfolio... build`). No Next.js: no SSR need, SEO handled by static head + Classic `<noscript>`.                                     |
| Styling        | **Plain CSS + CSS Modules + custom properties** (no Tailwind) | Retro bevel/scanline styles are bespoke; avoids Tailwind v4 oxide native-binding break on CI's Node 18 seen earlier; zero runtime. 98.css/system.css used as **visual reference only** (not dependencies) to keep bundle and licence clean. |
| Window manager | **Custom, ~300 LOC** (`useReducer` store + pointer events)    | react-rnd/react-draggable add weight and weak keyboard a11y.                                                                                                                                                                                |
| Terminal       | **Custom DOM terminal**                                       | xterm.js is canvas/heavy, poor SR support; we only need a line REPL.                                                                                                                                                                        |
| Content        | **Typed TS data module** (`src/content`)                      | Single source for windows, terminal, Classic view, JSON-LD.                                                                                                                                                                                 |
| Routing        | Hash routing, ~30 LOC                                         | No dependency, works on static preview hosts.                                                                                                                                                                                               |
| Unit tests     | **Vitest + @testing-library/react + jsdom**                   | Matches Owner's Vitest skill.                                                                                                                                                                                                               |
| E2E / a11y     | **Playwright + @axe-core/playwright**                         | Real browser, keyboard + reduced-motion emulation.                                                                                                                                                                                          |
| `@repo/ui`     | Not used by the redesign                                      | Retro components stay app-local; avoids touching shared package.                                                                                                                                                                            |
| Deploy         | Existing GitHub preview workflow, unchanged                   | `.github/workflows/**` is off-limits.                                                                                                                                                                                                       |

## 13. Architecture & file-ownership map (fixed contracts)

All paths are under `apps/portfolio/`. **Each path has exactly one owning story.** A story may only create/modify its own paths. Cross-story integration happens only through the contracts below.

| Story                                    | Owns                                                                                                                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 Shell, contracts & tooling           | `package.json`, `vite.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `vitest.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/style.css` (delete), `src/contracts/**`, `src/router/**`, `src/apps/registry.ts`, `src/test/setup.ts` |
| S02 Design tokens & CRT theme            | `src/styles/**`, `public/fonts/**`                                                                                                                                                                                                |
| S03 Window manager                       | `src/os/window-manager/**`                                                                                                                                                                                                        |
| S04 Desktop, icons, taskbar & start menu | `src/os/desktop/**`                                                                                                                                                                                                               |
| S05 Boot sequence                        | `src/os/boot/**`                                                                                                                                                                                                                  |
| S06 Terminal app                         | `src/apps/terminal/**`                                                                                                                                                                                                            |
| S07 Content data module                  | `src/content/**`                                                                                                                                                                                                                  |
| S08 About app                            | `src/apps/about/**`                                                                                                                                                                                                               |
| S09 Experience app                       | `src/apps/experience/**`                                                                                                                                                                                                          |
| S10 Projects app                         | `src/apps/projects/**`                                                                                                                                                                                                            |
| S11 Writing app                          | `src/apps/writing/**`                                                                                                                                                                                                             |
| S12 Contact app                          | `src/apps/contact/**`                                                                                                                                                                                                             |
| S13 Classic view (a11y fallback)         | `src/classic/**`                                                                                                                                                                                                                  |
| S14 SEO, meta & static assets            | `index.html`, `public/og.png`, `public/robots.txt`, `public/sitemap.xml`, `public/favicon.svg`, `src/seo/**` (delete `public/vite.svg`, `public/typescript.svg`)                                                                  |
| S15 E2E & a11y test harness              | `playwright.config.ts`, `e2e/**`                                                                                                                                                                                                  |

Never touched by any story: `.github/**`, root `package.json`, `pnpm-lock.yaml` (except via S01's install), `turbo.json`, `packages/**`, other `apps/**`, `AGENTS.md`, `specs/**`.

### 13.1 Contracts (S01 writes these verbatim; everyone else imports them)

`src/contracts/content.ts`

```ts
export type ISODateMonth = `${number}-${number}`; // "2024-07"
export interface Link {
  label: string;
  href: string;
}
export interface Role {
  company: string;
  companyUrl?: string;
  title: string;
  start: ISODateMonth;
  end: ISODateMonth | null;
  location: string | null;
  bullets: string[];
}
export interface Project {
  name: string;
  description: string;
  href: string;
  language?: string;
}
export interface Article {
  title: string;
  publication: string;
  date: string;
  href: string;
}
export interface Education {
  institution: string;
  credential: string | null;
  start: number;
  end: number;
}
export interface Profile {
  name: string;
  aliases: string[];
  headline: string;
  location: string;
  email: string;
  about: string | null;
  photo: string | null;
  phone: string | null;
  links: { linkedin: string; github: string; medium: string };
  skills: string[];
  experience: Role[];
  projects: Project[];
  writing: Article[];
  education: Education[];
  certifications: string[];
}
```

`src/contracts/apps.ts`

```ts
import type { ComponentType, LazyExoticComponent } from "react";
export type AppId =
  "about" | "experience" | "projects" | "writing" | "contact" | "terminal";
export interface AppDefinition {
  id: AppId;
  title: string;
  icon: string /* emoji or /public path */;
  order: number;
  defaultSize: { w: number; h: number };
  component: LazyExoticComponent<ComponentType<AppProps>>;
}
export interface AppProps {
  windowId: string;
}
```

`src/contracts/os.ts`

```ts
import type { AppId } from "./apps";
export interface WindowState {
  id: string;
  appId: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}
export interface OSApi {
  open(appId: AppId): void;
  close(id: string): void;
  focus(id: string): void;
  windows: WindowState[];
}
export type Theme = "green" | "amber" | "light";
export interface PrefsApi {
  theme: Theme;
  setTheme(t: Theme): void;
  crt: boolean;
  setCrt(on: boolean): void;
  reducedMotion: boolean;
}
export type Route =
  { view: "desktop" } | { view: "classic" } | { view: "app"; appId: AppId };
```

`src/contracts/terminal.ts`

```ts
import type { Profile } from "./content";
import type { OSApi, PrefsApi } from "./os";
export interface TerminalContext {
  profile: Profile;
  os: OSApi;
  prefs: PrefsApi;
  navigate(to: "classic" | "desktop"): void;
}
export interface TerminalCommand {
  name: string;
  summary: string;
  run(args: string[], ctx: TerminalContext): string | string[];
}
```

### 13.2 Module entry points (each owner exports exactly this)

| Path                             | Export                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/index.ts`           | `export const profile: Profile`                                                                                                  |
| `src/styles/index.css`           | imported once by `main.tsx`; defines §7 tokens + `.yk-crt` overlay class                                                         |
| `src/os/window-manager/index.ts` | `WindowManagerProvider`, `useOS(): OSApi`, `Window` component (`{ state: WindowState; title: string; children }`), `WindowLayer` |
| `src/os/desktop/index.ts`        | `Desktop` (`{ apps: AppDefinition[] }`) — icons + taskbar + start menu, uses `useOS`, `usePrefs`                                 |
| `src/os/boot/index.ts`           | `BootScreen` (`{ onDone(): void }`)                                                                                              |
| `src/apps/<id>/index.ts`         | `export default` an `AppDefinition` (component via `React.lazy`)                                                                 |
| `src/apps/terminal/index.ts`     | default `AppDefinition` + `export const commands: TerminalCommand[]`                                                             |
| `src/classic/index.ts`           | `ClassicView` (`{ profile: Profile }`)                                                                                           |
| `src/seo/index.ts`               | `personJsonLd(profile): object` (S14 also inlines static JSON-LD in `index.html`)                                                |
| `src/router/index.ts` (S01)      | `useRoute(): Route`, `navigate(r: Route)`                                                                                        |
| `src/App.tsx` (S01)              | `PrefsProvider` + `usePrefs` (exported from `src/router/prefs.tsx`), route switch: boot → desktop, classic                       |

**Registry (no cross-story edits):** `src/apps/registry.ts` uses `import.meta.glob("./*/index.ts", { eager: true })` and sorts by `order`. Adding an app = creating its folder; nobody edits the registry.

**Independence rule:** stories other than S01 must code against §13.1/13.2. Until S01 has merged, a story may add a local `__fixtures__`/test stub inside its **own** folder; it must never create `src/contracts/**` itself. Recommended merge order for the watcher: S01 and S07 first, others any order.

## 14. Acceptance (epic-level)

- [ ] All 15 stories merged; `pnpm --filter @apps/portfolio build`, `lint`, `test`, `test:e2e` green.
- [ ] Lighthouse targets (§2.4), budgets (§9) met on preview deploy.
- [ ] Content matches §4 exactly; no invented facts.

## 15. Out of scope

Contact form backend, blog/MDX, CMS, i18n, games (Minesweeper, Paint), sounds (future, off by default), dark-pattern analytics, changes to CI workflows or shared packages.

## 16. Success metrics

Recruiter task (find role + email) ≤ 10 s in hallway test (5/5); Lighthouse scores per §2; axe 0 serious; bounce rate/visit length if Owner enables analytics; Owner sign-off on look & feel.

## 17. Open questions (defaults chosen)

1. Custom domain? — default: existing preview host. 2. Bio/achievements/photo copy — Owner TODO. 3. Default theme green vs amber — green. 4. Show Classic view by default on mobile? — no, show banner offering it.

## 18. Research references (links verified 2026-10-16)

| Site                                                                                                            | Pattern taken                                                              |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| https://poolsuite.net                                                                                           | Retro Mac OS desktop, windows as "apps", strong brand mood                 |
| https://www.dustinbrett.com                                                                                     | Full Win-style desktop OS in the browser, taskbar/start menu, deep links   |
| https://www.henryheffernan.com                                                                                  | Retro computer as a portfolio frame + simple fallback site                 |
| https://98.js.org · https://jspaint.app                                                                         | Faithful Win98 chrome, keyboard behaviour                                  |
| https://jdan.github.io/98.css/ · https://botoxparty.github.io/XP.css/ · https://sakofchit.github.io/system.css/ | Bevel/title-bar CSS techniques with semantic HTML (reference only)         |
| https://os-js.org                                                                                               | Window-manager behaviour model                                             |
| https://brittanychiang.com                                                                                      | Gold-standard dev portfolio content hierarchy — the model for Classic view |
| https://www.joshwcomeau.com · https://www.leerob.com                                                            | Delight + performance, reduced-motion care, minimal fast pages             |
| https://xtermjs.org                                                                                             | Evaluated and rejected for size/a11y                                       |
| https://www.w3.org/TR/WCAG22/ · https://www.webaim.org/standards/wcag/checklist                                 | Accessibility criteria                                                     |
