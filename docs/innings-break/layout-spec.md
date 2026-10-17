# Innings Break — Layout Spec (AI hand-off)

> Source of truth: Figma file **Innings Break — UX Design** (https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj). All values in the token tables (§1), component tables (§2.1–2.4) and frame tables (§4–5) were read back programmatically from the Figma nodes (variables, text styles, effect styles, auto-layout properties) on 2026-10-17. The rules in §0 and the spatial-rules and mapping tables summarise those values. Feature PRDs: `specs/innings-break/console|customer/features/*.md` on branch `docs/innings-break-restructure` ([PR #59](https://github.com/yogeshkumarasamy/workspace/pull/59)).

## 0. How to use this spec with an AI

Paste this file (or one frame section plus §1 and §2) into the coding agent and give it these rules verbatim:

1. **Stack**: React + Tailwind CSS v4 + shadcn/ui (New York style, Zinc base colour, CSS variables on). Install components with `npx shadcn@latest add <name>` using the names in §2 "shadcn source". Font: Geist + Geist Mono (`next/font` or `@fontsource`).
2. **Never use a value outside the token scale.** Spacing must be one of §1.3; radius one of §1.4; colour one of §1.2 (as the CSS variable, e.g. `bg-background`, `text-muted-foreground`, `border-border`); type one of §1.5. If a value in a table is marked `(literal)`, use the literal exactly and do not invent a new token.
3. **Token → Tailwind mapping**: `spacing/N` → Tailwind `N` (e.g. `spacing/2-5` = `2.5` = 10px → `p-2.5`); semantic aliases (`padding/*`, `gap/*`) resolve to the value shown in parentheses. `radius/md` → `rounded-md` (8px), `radius/lg` → `rounded-lg` (10px), `radius/xl` → `rounded-xl` (14px), `radius/full` → `rounded-full`.
4. **Auto-layout → flexbox**: `horizontal` = `flex flex-row`, `vertical` = `flex flex-col`; `gap` = `gap-*`; main `start|center|end|space-between` = `justify-*`; cross = `items-*`; wrap = `flex-wrap`.
5. **Sizing**: `fixed N` = `w-[N]`/`h-[N]` only when N is listed; `fill` = `flex-1` / `w-full` (self-stretch on the cross axis); `hug` = no width (content-sized). Numbers in brackets after hug/fill are the measured result at the design width, for verification only — do not hard-code them.
6. **Padding** is given as T · R · B · L (top, right, bottom, left) or `all X` when equal. Coordinates `x,y` are relative to the frame top-left and are for verification only; build with flex, never absolute positioning (exception: Dialog/Sheet overlays).
7. **Components**: render every instance with the shadcn component + variant named in the frame table. Do not restyle shadcn primitives; Innings Break domain components (§2.3) are compositions of primitives — build them as local components with exactly the listed spacing.
8. **Text**: use the style name (`type/sm-medium` etc.) → the Tailwind classes in §1.5. Colour is the token in the table.
9. **Header rule (hard requirement)**: both headers use 10px padding on all four sides (`p-2.5`), logo left, menu links right (`justify-between items-center`).
10. If anything is ambiguous, prefer the frame table over prose, and the token table over the frame table. Do not add elements that are not in the frame.

Viewport targets: **Console** desktop 1440 px wide (min-height 1024); **Customer** mobile 390 × 844 (PWA, single column, bottom nav).

## 1. Tokens

### 1.1 Collections

| Collection | Modes | Variables |
|---|---|---|
| Primitives | Value | 41 |
| shadcn Theme | Light | 45 |
| Spacing | Value | 33 |
| Radius | Value | 7 |

> Note: the shadcn Theme collection currently contains the **Light** mode only (Dark not yet authored in Figma). Implement dark mode from the shadcn Zinc defaults only if requested.

### 1.2 Colour tokens (shadcn Theme → CSS variable → hex)

| Token | CSS variable | Alias (primitive) | Hex (Light) |
|---|---|---|---|
| `color/background` | `var(--background)` | white | #ffffff |
| `color/foreground` | `var(--foreground)` | zinc/950 | #09090b |
| `color/card` | `var(--card)` | white | #ffffff |
| `color/card-foreground` | `var(--card-foreground)` | zinc/950 | #09090b |
| `color/popover` | `var(--popover)` | white | #ffffff |
| `color/popover-foreground` | `var(--popover-foreground)` | zinc/950 | #09090b |
| `color/primary` | `var(--primary)` | zinc/900 | #18181b |
| `color/primary-foreground` | `var(--primary-foreground)` | zinc/50 | #fafafa |
| `color/secondary` | `var(--secondary)` | zinc/100 | #f4f4f5 |
| `color/secondary-foreground` | `var(--secondary-foreground)` | zinc/900 | #18181b |
| `color/muted` | `var(--muted)` | zinc/100 | #f4f4f5 |
| `color/muted-foreground` | `var(--muted-foreground)` | zinc/500 | #71717b |
| `color/accent` | `var(--accent)` | zinc/100 | #f4f4f5 |
| `color/accent-foreground` | `var(--accent-foreground)` | zinc/900 | #18181b |
| `color/destructive` | `var(--destructive)` | red/600 | #e7000b |
| `color/destructive-foreground` | `var(--destructive-foreground)` | white | #ffffff |
| `color/border` | `var(--border)` | zinc/200 | #e4e4e7 |
| `color/input` | `var(--input)` | zinc/200 | #e4e4e7 |
| `color/ring` | `var(--ring)` | zinc/400 | #9f9fa9 |
| `color/chart-1` | `var(--chart-1)` | orange/600 | #f54900 |
| `color/chart-2` | `var(--chart-2)` | teal/600 | #009689 |
| `color/chart-3` | `var(--chart-3)` | cyan/900 | #104e64 |
| `color/chart-4` | `var(--chart-4)` | amber/400 | #ffb900 |
| `color/chart-5` | `var(--chart-5)` | amber/500 | #fe9a00 |
| `color/sidebar` | `var(--sidebar)` | zinc/50 | #fafafa |
| `color/sidebar-foreground` | `var(--sidebar-foreground)` | zinc/950 | #09090b |
| `color/sidebar-primary` | `var(--sidebar-primary)` | zinc/900 | #18181b |
| `color/sidebar-primary-foreground` | `var(--sidebar-primary-foreground)` | zinc/50 | #fafafa |
| `color/sidebar-accent` | `var(--sidebar-accent)` | zinc/100 | #f4f4f5 |
| `color/sidebar-accent-foreground` | `var(--sidebar-accent-foreground)` | zinc/900 | #18181b |
| `color/sidebar-border` | `var(--sidebar-border)` | zinc/200 | #e4e4e7 |
| `color/sidebar-ring` | `var(--sidebar-ring)` | zinc/400 | #9f9fa9 |
| `ib/brand` | `var(--ib-brand)` | emerald/600 | #009966 |
| `ib/status-new` | `var(--ib-status-new)` | amber/500 | #fe9a00 |
| `ib/status-new-subtle` | `var(--ib-status-new-subtle)` | amber/50 | #fffbeb |
| `ib/status-accepted` | `var(--ib-status-accepted)` | blue/600 | #155dfc |
| `ib/status-accepted-subtle` | `var(--ib-status-accepted-subtle)` | blue/50 | #eff6ff |
| `ib/status-preparing` | `var(--ib-status-preparing)` | violet/600 | #7f22fe |
| `ib/status-preparing-subtle` | `var(--ib-status-preparing-subtle)` | violet/50 | #f5f3ff |
| `ib/status-transit` | `var(--ib-status-transit)` | indigo/600 | #4f39f6 |
| `ib/status-transit-subtle` | `var(--ib-status-transit-subtle)` | indigo/50 | #eef2ff |
| `ib/success` | `var(--ib-success)` | green/600 | #00a63e |
| `ib/success-subtle` | `var(--ib-success-subtle)` | green/50 | #f0fdf4 |
| `ib/warning` | `var(--ib-warning)` | amber/700 | #bb4d00 |
| `ib/destructive-subtle` | `var(--ib-destructive-subtle)` | red/50 | #fef2f2 |

Primitive palette (hidden from pickers, scopes `[]`; reference only through theme tokens):

| Primitive | Hex |
|---|---|
| `zinc/50` | #fafafa |
| `zinc/100` | #f4f4f5 |
| `zinc/200` | #e4e4e7 |
| `zinc/300` | #d4d4d8 |
| `zinc/400` | #9f9fa9 |
| `zinc/500` | #71717b |
| `zinc/600` | #52525c |
| `zinc/700` | #3f3f46 |
| `zinc/800` | #27272a |
| `zinc/900` | #18181b |
| `zinc/950` | #09090b |
| `white` | #ffffff |
| `white/10` | #ffffff a0.1 |
| `white/15` | #ffffff a0.15 |
| `red/50` | #fef2f2 |
| `red/400` | #ff6467 |
| `red/600` | #e7000b |
| `red/700` | #c10007 |
| `amber/50` | #fffbeb |
| `amber/400` | #ffb900 |
| `amber/500` | #fe9a00 |
| `amber/700` | #bb4d00 |
| `green/50` | #f0fdf4 |
| `green/600` | #00a63e |
| `green/700` | #008236 |
| `blue/50` | #eff6ff |
| `blue/600` | #155dfc |
| `blue/700` | #1447e6 |
| `violet/50` | #f5f3ff |
| `violet/600` | #7f22fe |
| `violet/700` | #7008e7 |
| `indigo/50` | #eef2ff |
| `indigo/600` | #4f39f6 |
| `indigo/700` | #432dd7 |
| `orange/600` | #f54900 |
| `teal/600` | #009689 |
| `cyan/900` | #104e64 |
| `emerald/500` | #00bc7d |
| `emerald/600` | #009966 |
| `purple/500` | #ad46ff |
| `rose/500` | #ff2056 |

### 1.3 Spacing (Tailwind scale, px)

| Token | px | Tailwind | Alias of |
|---|---|---|---|
| `spacing/0` | 0 | 0 | — |
| `spacing/0-5` | 2 | 0.5 | — |
| `spacing/1` | 4 | 1 | — |
| `spacing/2` | 8 | 2 | — |
| `spacing/2-5` | 10 | 2.5 | — |
| `spacing/3` | 12 | 3 | — |
| `spacing/4` | 16 | 4 | — |
| `spacing/5` | 20 | 5 | — |
| `spacing/6` | 24 | 6 | — |
| `spacing/8` | 32 | 8 | — |
| `spacing/10` | 40 | 10 | — |
| `spacing/12` | 48 | 12 | — |
| `spacing/16` | 64 | 16 | — |
| `padding/header` | 10 | — | spacing/2-5 |
| `padding/page-desktop` | 24 | — | spacing/6 |
| `padding/page-mobile` | 16 | — | spacing/4 |
| `padding/card` | 24 | — | spacing/6 |
| `padding/card-compact` | 16 | — | spacing/4 |
| `padding/button-x` | 16 | — | spacing/4 |
| `padding/button-y` | 8 | — | spacing/2 |
| `padding/input-x` | 12 | — | spacing/3 |
| `padding/input-y` | 4 | — | spacing/1 |
| `padding/badge-x` | 8 | — | spacing/2 |
| `padding/badge-y` | 2 | — | spacing/0-5 |
| `padding/dialog` | 24 | — | spacing/6 |
| `padding/sheet` | 24 | — | spacing/6 |
| `padding/table-cell` | 8 | — | spacing/2 |
| `gap/stack-sm` | 8 | — | spacing/2 |
| `gap/stack-md` | 16 | — | spacing/4 |
| `gap/stack-lg` | 24 | — | spacing/6 |
| `gap/inline` | 8 | — | spacing/2 |
| `gap/section` | 32 | — | spacing/8 |
| `spacing/1-5` | 6 | 1.5 | — |

Allowed spacing values: **0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64** px. Nothing else.

### 1.4 Radius

| Token | px | Tailwind |
|---|---|---|
| `radius/none` | 0 | `rounded-none` |
| `radius/sm` | 6 | `rounded-sm` |
| `radius/md` | 8 | `rounded-md` |
| `radius/lg` | 10 | `rounded-lg` |
| `radius/xl` | 14 | `rounded-xl` |
| `radius/full` | 9999 | `rounded-full` |
| `radius/xs` | 4 | `rounded-xs` |

### 1.5 Typography (text styles)

| Style | Family | Weight (style name) | Size px | Line height px | Letter spacing px | Tailwind |
|---|---|---|---|---|---|---|
| `type/h1` | Geist | ExtraBold | 36 | 40 | -0.9 | `text-4xl font-extrabold tracking-tight` |
| `type/h2` | Geist | SemiBold | 30 | 36 | -0.75 | `text-3xl font-semibold tracking-tight` |
| `type/h3` | Geist | SemiBold | 24 | 32 | -0.6 | `text-2xl font-semibold tracking-tight` |
| `type/h4` | Geist | SemiBold | 20 | 28 | -0.5 | `text-xl font-semibold tracking-tight` |
| `type/lead` | Geist | Regular | 20 | 28 | 0 | `text-xl` |
| `type/large` | Geist | SemiBold | 18 | 28 | 0 | `text-lg font-semibold` |
| `type/p` | Geist | Regular | 16 | 24 | 0 | `text-base` |
| `type/sm` | Geist | Regular | 14 | 20 | 0 | `text-sm` |
| `type/sm-medium` | Geist | Medium | 14 | 20 | 0 | `text-sm font-medium` |
| `type/sm-semibold` | Geist | SemiBold | 14 | 20 | 0 | `text-sm font-semibold` |
| `type/xs` | Geist | Regular | 12 | 16 | 0 | `text-xs` |
| `type/xs-medium` | Geist | Medium | 12 | 16 | 0 | `text-xs font-medium` |
| `type/xs-semibold` | Geist | SemiBold | 12 | 16 | 0 | `text-xs font-semibold` |
| `type/mono-sm` | Geist Mono | Regular | 14 | 20 | 0 | `font-mono text-sm` |

### 1.6 Elevation (effect styles)

| Style | Layers (x, y, blur, spread, colour @ alpha) | Tailwind |
|---|---|---|
| `shadow/xs` | 0,1,2,0 #000000@0.05 | `shadow-xs` |
| `shadow/sm` | 0,1,3,0 #000000@0.1 + 0,1,2,-1 #000000@0.1 | `shadow-sm` |
| `shadow/md` | 0,4,6,-1 #000000@0.1 + 0,2,4,-2 #000000@0.1 | `shadow-md` |
| `shadow/lg` | 0,10,15,-3 #000000@0.1 + 0,4,6,-4 #000000@0.1 | `shadow-lg` |

## 2. Components (atomic layers, shadcn mapping, spatial rules)

Every component lives on page **1 · Index · Design Tokens · Components** (Components frame) with a spec card beside it. Values below are the base variant read back from Figma.

### 2.1 Atoms (shadcn primitives)

| Component (Figma) | shadcn source | Props / variants | Size | Padding | Gap | Alignment | Fill · stroke · radius |
|---|---|---|---|---|---|---|---|
| [atoms/Button](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=6-3) | `button` | Label: TEXT; Variant: default/secondary/outline/ghost/destructive/link; Size: default/sm/lg | W hug (76) · H fixed 36 | T `spacing/2` (8) · R `spacing/4` (16) · B `spacing/2` (8) · L `spacing/4` (16) | `spacing/2` (8) | horizontal · main center · cross center | fill `color/primary` #18181b; radius `radius/md` (8) |
| [atoms/Badge](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=7-2) | `badge` | Label: TEXT; Variant: default/secondary/outline/destructive/status-new/status-accepted/status-preparing/status-transit/status-delivered/status-cancelled | W hug (53) · H hug (20) | T `padding/badge-y` (2) · R `padding/badge-x` (8) · B `padding/badge-y` (2) · L `padding/badge-x` (8) | `spacing/1` (4) | horizontal · main start · cross center | fill `color/primary` #18181b; radius `radius/md` (8) |
| [atoms/Input](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=7-23) | `input` | Value: TEXT; State: default/focus/error/disabled/filled | W fixed 280 · H fixed 36 | T `padding/input-y` (4) · R `padding/input-x` (12) · B `padding/input-y` (4) · L `padding/input-x` (12) | 0 | horizontal · main start · cross center | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| [atoms/Label](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=7-32) | `label` | Text: TEXT | W hug (37) · H hug (20) | all 0 | 0 | horizontal · main start · cross start | fill literal #ffffff |
| [atoms/Textarea](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=7-34) | `textarea` | Value: TEXT | W fixed 280 · H fixed 80 | T `spacing/2` (8) · R `spacing/3` (12) · B `spacing/2` (8) · L `spacing/3` (12) | 0 | vertical · main start · cross start | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| [atoms/Separator](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=7-36) | `separator` | Orientation: horizontal/vertical | W fixed 240 · H fixed 1 | — | — | — | fill `color/border` #e4e4e7 |
| [atoms/Skeleton](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=7-39) | `skeleton` | Shape: line/circle/card | W fixed 240 · H fixed 16 | — | — | — | fill `color/accent` #f4f4f5; radius `radius/md` (8) |
| [atoms/Avatar](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=7-43) | `avatar` | Initials: TEXT; Size: default/lg | W fixed 32 · H fixed 32 | all 0 | 0 | horizontal · main center · cross center | fill `color/muted` #f4f4f5; radius `radius/full` (9999) |
| [atoms/Checkbox](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=8-3) | `checkbox` | Checked: false/true | W fixed 16 · H fixed 16 | all 0 | 0 | horizontal · main center · cross center | stroke `color/input` #e4e4e7 1px; radius `radius/xs` (4); effect `shadow/xs` |
| [atoms/Switch](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=8-8) | `switch` | Checked: false/true | W fixed 32 · H fixed 18 | T 0 · R `spacing/0-5` (2) · B 0 · L `spacing/0-5` (2) | 0 | horizontal · main start · cross center | fill `color/input` #e4e4e7; radius `radius/full` (9999) |
| [atoms/RadioGroupItem](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=8-13) | `radio-group` | Checked: false/true | W fixed 16 · H fixed 16 | all 0 | 0 | horizontal · main center · cross center | stroke `color/input` #e4e4e7 1px; radius `radius/full` (9999); effect `shadow/xs` |
| [atoms/Select](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=8-17) | `select` | Value: TEXT; State: placeholder/filled | W fixed 280 · H fixed 36 | T `spacing/2` (8) · R `spacing/3` (12) · B `spacing/2` (8) · L `spacing/3` (12) | `spacing/2` (8) (auto: SPACE_BETWEEN) | horizontal · main space-between · cross center | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| [atoms/TabsTrigger](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=9-2) | `tabs (TabsTrigger)` | Label: TEXT; Active: true/false | W hug (40) · H hug (28) | T `spacing/1` (4) · R `spacing/2` (8) · B `spacing/1` (4) · L `spacing/2` (8) | `spacing/1-5` (6) | horizontal · main center · cross center | fill `color/background` #ffffff; radius `radius/md` (8); effect `shadow/sm` |
| [atoms/NavigationMenuLink](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=10-10) | `navigation-menu (NavigationMenuLink)` | Label: TEXT; Active: true/false | W hug (77) · H fixed 36 | T `spacing/2` (8) · R `spacing/4` (16) · B `spacing/2` (8) · L `spacing/4` (16) | `spacing/2` (8) | horizontal · main center · cross center | fill `color/accent` #f4f4f5; radius `radius/md` (8) |
| [atoms/TableCell](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=10-15) | `table (TableHead/TableCell)` | Text: TEXT; Type: head/cell/cell-muted | W fixed 160 · H fixed 40 | all `padding/table-cell` (8) | 0 | horizontal · main start · cross center | — |
| [atoms/CalendarDay](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=10-32) | `calendar (day button)` | Day: TEXT; State: default/selected/today/outside/closed/active | W fixed 32 · H fixed 32 | all 0 | 0 | horizontal · main center · cross center | radius `radius/md` (8) |

### 2.2 Molecules (shadcn compositions)

| Component (Figma) | shadcn source | Props / variants | Size | Padding | Gap | Alignment | Fill · stroke · radius |
|---|---|---|---|---|---|---|---|
| [molecules/Tabs](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=9-7) | `tabs` | — | W hug (300) · H hug (32) | all `spacing/0-5` (2) | `spacing/0` (0) | horizontal · main start · cross center | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| [molecules/FormField](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=9-16) | `form (FormItem/FormLabel/FormControl/FormMessage)` | Label: TEXT; Helper: TEXT; State: default/error | W fixed 320 · H hug (92) | all 0 | `gap/stack-sm` (8) | vertical · main start · cross start | fill literal #ffffff |
| [molecules/Alert](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=9-27) | `alert` | Title: TEXT; Description: TEXT; Variant: default/destructive | W fixed 420 · H hug (70) | T `spacing/3` (12) · R `spacing/4` (16) · B `spacing/3` (12) · L `spacing/4` (16) | `spacing/3` (12) | horizontal · main start · cross start | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10) |
| [molecules/Card](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=9-44) | `card` | Title: TEXT; Description: TEXT; Content: TEXT | W fixed 360 · H hug (208) | all `padding/card` (24) | `gap/stack-lg` (24) | vertical · main start · cross start | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| [molecules/Toast (Sonner)](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=9-55) | `sonner` | Title: TEXT; Description: TEXT; Type: default/success/error | W fixed 356 · H hug (76) | all `spacing/4` (16) | `spacing/3` (12) | horizontal · main start · cross start | fill `color/popover` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10); effect `shadow/lg` |
| [molecules/DropdownMenu](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=10-22) | `dropdown-menu` | — | W fixed 224 · H hug (139) | all `spacing/1` (4) | 0 | vertical · main start · cross start | fill `color/popover` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/md` |
| [molecules/Calendar](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=10-115) | `calendar` | — | W hug (250) · H hug (318) | all `spacing/3` (12) | `spacing/4` (16) | vertical · main start · cross start | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/sm` |

### 2.3 Innings Break domain components (composed only from shadcn primitives + tokens)

| Component (Figma) | shadcn source | Props / variants | Size | Padding | Gap | Alignment | Fill · stroke · radius |
|---|---|---|---|---|---|---|---|
| [molecules/WalletPill](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=11-45) | `Innings Break composition of shadcn primitives` | Amount: TEXT | W hug (147) · H hug (26) | T `spacing/1` (4) · R `spacing/2-5` (10) · B `spacing/1` (4) · L `spacing/2-5` (10) | `spacing/1-5` (6) | horizontal · main start · cross center | fill `ib/success-subtle` #f0fdf4; stroke `color/border` #e4e4e7 1px; radius `radius/full` (9999) |
| [atoms/QuantityStepper](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=11-50) | `Innings Break composition of shadcn primitives` | Qty: TEXT | W hug (104) · H hug (32) | all 0 | `spacing/2` (8) | horizontal · main start · cross center | fill literal #ffffff |
| [molecules/MatchSwitcherPill](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=11-60) | `Innings Break composition of shadcn primitives` | Match: TEXT; Meta: TEXT; Active: true/false | W hug (169) · H hug (56) | T `spacing/2` (8) · R `spacing/3` (12) · B `spacing/2` (8) · L `spacing/3` (12) | `spacing/0-5` (2) | vertical · main start · cross start | fill `color/primary` #18181b; stroke `color/primary` #18181b 1px; radius `radius/lg` (10) |
| [molecules/StatCard](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=11-67) | `Innings Break composition of shadcn primitives` | Label: TEXT; Value: TEXT; Hint: TEXT | W fixed 240 · H hug (106) | all `padding/card-compact` (16) | `spacing/1` (4) | vertical · main start · cross start | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| [molecules/OrderCard](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=11-71) | `Innings Break composition of shadcn primitives` | Team: TEXT; OrderRef: TEXT; Total: TEXT; Stage: new/accepted/preparing/transit/delivered | W fixed 296 · H hug (279) | all `padding/card-compact` (16) | `spacing/3` (12) | vertical · main start · cross start | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| [molecules/MenuItemCard](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=11-227) | `Innings Break composition of shadcn primitives` | Name: TEXT; Nutrition: TEXT; Price: TEXT; State: add/in-cart/sold-out | W fixed 358 · H hug (144) | all `spacing/3` (12) | `spacing/3` (12) | horizontal · main start · cross start | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| [organisms/BottomNav](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=12-274) | `IB pattern on shadcn tokens` | Active: calendar/menu/orders/profile | W fixed 390 · H hug (77) | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | horizontal · main start · cross start | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |
| [molecules/LedgerRow](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=13-135) | `Innings Break composition of shadcn primitives` | Type: credit/debit | W fixed 358 · H hug (97) | T `spacing/3` (12) · R `spacing/0` (0) · B `spacing/3` (12) · L `spacing/0` (0) | `spacing/3` (12) | horizontal · main start · cross center | fill literal #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| [molecules/TicketCard](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=13-159) | `Innings Break composition of shadcn primitives` | Meta: TEXT; Description: TEXT; Resolution: TEXT | W fixed 358 · H hug (216) | all `padding/card-compact` (16) | `spacing/2` (8) | vertical · main start · cross start | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| [molecules/KanbanColumnHeader](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=13-172) | `Innings Break composition of shadcn primitives` | Stage: new/accepted/preparing/transit/delivered | W fixed 296 · H hug (36) | T `spacing/2` (8) · R `spacing/3` (12) · B `spacing/2` (8) · L `spacing/3` (12) | 0 (auto: SPACE_BETWEEN) | horizontal · main space-between · cross center | fill `color/muted` #f4f4f5; stroke `ib/status-new` #fe9a00 T/R/B/L 0/0/0/2px; radius `radius/lg` (10) |

### 2.4 Organisms

| Component (Figma) | shadcn source | Props / variants | Size | Padding | Gap | Alignment | Fill · stroke · radius |
|---|---|---|---|---|---|---|---|
| [organisms/Header (Console)](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=12-77) | `navigation-menu + button + avatar (composition)` | Active: orders/calendar/menu/directory/support/settings | W fixed 1440 · H hug (61) | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | horizontal · main space-between · cross center | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| [organisms/Header (Mobile)](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=12-258) | `button + badge (composition)` | — | W fixed 390 · H hug (57) | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | horizontal · main space-between · cross center | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| [organisms/Sidebar](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=12-383) | `sidebar` | Active: team/presences/cutoffs/geofence | W fixed 256 · H fixed 900 | all `spacing/2` (8) | `spacing/1` (4) | vertical · main start · cross start | fill `color/sidebar` #fafafa; stroke `color/sidebar-border` #e4e4e7 T/R/B/L 0/1/0/0px |
| [organisms/Dialog](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=13-203) | `dialog` | Title: TEXT; Description: TEXT | W fixed 512 · H hug (254) | all `padding/dialog` (24) | `spacing/4` (16) | vertical · main start · cross start | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10); effect `shadow/lg` |
| [organisms/Sheet](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=13-218) | `sheet (side="bottom")` | Title: TEXT; Description: TEXT | W fixed 390 · H hug (278) | all `padding/sheet` (24) | `spacing/4` (16) | vertical · main start · cross start | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` ([14, 14, 0, 0]); effect `shadow/lg` |

Spatial rules (apply everywhere):

| Rule | Value |
|---|---|
| Header (Console + Mobile) | padding all 10 (`padding/header` → `spacing/2-5`), horizontal, space-between, cross center; logo left, links/actions right; 1px bottom `color/border` |
| Console page padding | all 24 (`padding/page-desktop`); section gap 24 (`gap/stack-lg`) |
| Mobile page padding | all 16 (`padding/page-mobile`); content gap 16 (`gap/stack-md`) unless the frame table says otherwise |
| Card | padding 24 (`padding/card`) or 16 (`padding/card-compact`); radius `radius/xl` 14; 1px `color/border`; fill `color/card`; effect `shadow/sm` |
| Dialog | padding 24 (`padding/dialog`); gap 16; radius `radius/lg`; width 512 (console default) / 560 (Dispatch) / 358 (mobile); overlay black @ 50% |
| Sheet (mobile) | width 390; padding 24 (`padding/sheet`); top radius `radius/xl`; handle 100×6 `color/muted`; anchored bottom |
| Form field | Label → control gap 8 (`gap/stack-sm`); control fills width; helper text `type/xs` `color/muted-foreground` (error: `color/destructive`) |
| Buttons in a footer | gap 8 (`gap/inline`), aligned end (`justify-end`) |
| Touch targets (mobile) | buttons lg = height 40; BottomNav items fill equally, bottom padding 20 (safe area) |

## 3. PRD feature → frame mapping

| App | PRD feature | Hi-fi frame(s) | Coverage |
|---|---|---|---|
| Console | 3.1 Authentication, access control & staff onboarding | C-3.1a Sign in, C-3.1b Team Members, C-3.1c Invite Operations Manager | Full |
| Console | 3.2 Business presences, multi-kitchen hubs & delivery geofencing | C-3.2 | Full |
| Console | 3.3 Active month calendar & operational schedule engine | C-3.3 | Full |
| Console | 3.4 Areas, venues & ground directory | C-3.4 | Full |
| Console | 3.5 Kitchen menu, nutrition, recipes & dynamic bundles | C-3.5 | Partial: recipe/prep-notes editor shown as button entry point only |
| Console | 3.6 Order queue, kitchen batch prep & fulfilment | C-3.6a Order Queue Kanban, C-3.6b Batch Prep Sheet & Invoice | Full |
| Console | 3.7 Third-party delivery dispatch coordination | C-3.7 Dispatch Courier dialog | Full |
| Console | 3.8 Help, support, quality & grievance management | C-3.8 | Full |
| Console | 3.9 In-app soft credits & early rainout cancellation engine | C-3.9a Cancelled & Rainout, C-3.9b Manual Soft Credit dialog | Full |
| Customer | 3.1 Authentication, team profile & CricHeroes onboarding | M-3.1a Sign up, M-3.1b Verify OTP, M-3.1c Team Profile & Roster | Partial: CricHeroes roster seed/import step not drawn separately |
| Customer | 3.2 Post-login landing, monthly calendar, active-week gating | M-3.2 | Full |
| Customer | 3.3 Match scheduling: ground search, slots, squad curation | M-3.3a step 2 Ground, M-3.3b step 4 Squad | Partial: steps 1 (Date) and 3 (Slot) shown only in stepper; date picked on M-3.2 |
| Customer | 3.4 Multi-match weekend pre-ordering & match switcher | M-3.4/3.5 | Full |
| Customer | 3.5 Menu browsing & per-item player assignment | M-3.4/3.5, M-3.5b Player assignment sheet | Full |
| Customer | 3.6 Squad menu polling (WhatsApp link) | M-3.6 Poll tracker, M-3.6b Player poll page | Full |
| Customer | 3.7 Consolidated order summary, cart adjustments, dual contacts | M-3.7 | Partial: inline quantity edit lives on M-3.4/3.5 (stepper), not on summary |
| Customer | 3.8 Upfront UPI payment & failure recovery | M-3.8a Confirmed, M-3.8b Failed / retry | Full |
| Customer | 3.9 Orders page, textual status sync, invoices | M-3.9 | Partial: Past tab and invoice view not drawn separately (invoice layout = C-3.6b receipt card) |
| Customer | 3.10 Early rainout cancellation & team wallet | M-3.10a Rainout cancel dialog, M-3.10b Late cancel blocked | Full |
| Customer | 3.11 Help & support, order-linked grievances | M-3.11 | Full |
| Customer | 3.12 Team credits wallet & refund ledger | M-3.12 | Full |

## 4. Console frames (desktop 1440)

### 4.1 C-3.1a Console · Sign in (whitelisted mobile + OTP)

Figma: [14:146](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=14-146) · root W fixed 1440 · H fixed 1024 · root fill `color/background` #ffffff · root layout horizontal · main start · cross start · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| Brand panel | 0,0 | W fixed 640 · H fill (1024) | vertical · main space-between · cross start | all `spacing/10` (40) | `spacing/6` (24) (auto: SPACE_BETWEEN) | fill `color/primary` #18181b |
| Auth column | 640,0 | W fill (800) · H fill (1024) | vertical · main center · cross center | all 0 | `spacing/6` (24) | — |
| Brand panel › Logo | 40,40 | W hug (187) · H hug (28) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Brand panel › Logo › Mark | 40,40 | W fixed 28 · H fixed 28 | horizontal · main center · cross center | all 0 | 0 | fill `ib/brand` #009966; radius `radius/md` (8) |
| Auth column › Sign-in form | 850,201 | W fixed 380 · H hug (623) | vertical · main start · cross start | all 0 | `gap/stack-lg` (24) | — |
| Auth column › Sign-in form › Heading | 850,201 | W fill (380) · H hug (80) | vertical · main start · cross center | all 0 | `spacing/2` (8) | — |
| Auth column › Sign-in form › molecules/FormField · Mobile number | 850,305 | W fill (380) · H hug (88) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Auth column › Sign-in form › OTP step | 850,502 | W fill (380) · H hug (92) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Auth column › Sign-in form › OTP step › InputOTP | 850,530 | W hug (280) · H hug (40) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Auth column › Sign-in form › OTP step › InputOTP › InputOTPSlot | 850,530 | W fixed 40 · H fixed 40 | horizontal · main center · cross center | all 0 | 0 | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| Auth column › Sign-in form › OTP step › InputOTP › InputOTPSlot | 898,530 | W fixed 40 · H fixed 40 | horizontal · main center · cross center | all 0 | 0 | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| Auth column › Sign-in form › OTP step › InputOTP › InputOTPSlot | 946,530 | W fixed 40 · H fixed 40 | horizontal · main center · cross center | all 0 | 0 | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| Auth column › Sign-in form › OTP step › InputOTP › InputOTPSlot | 994,530 | W fixed 40 · H fixed 40 | horizontal · main center · cross center | all 0 | 0 | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| Auth column › Sign-in form › OTP step › InputOTP › InputOTPSlot | 1042,530 | W fixed 40 · H fixed 40 | horizontal · main center · cross center | all 0 | 0 | stroke `color/ring` #9f9fa9 2px; radius `radius/md` (8); effect `shadow/xs` |
| Auth column › Sign-in form › OTP step › InputOTP › InputOTPSlot | 1090,530 | W fixed 40 · H fixed 40 | horizontal · main center · cross center | all 0 | 0 | stroke `color/input` #e4e4e7 1px; radius `radius/md` (8); effect `shadow/xs` |
| Brand panel › Quote | 40,900 | W fill (560) · H hug (84) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=default | 2 | 380×36 | FILL |
| `atoms/Input` | State=filled | 1 | 380×36 | FILL |
| `atoms/Label` | — | 2 | 98×20 | HUG |
| `atoms/Separator` | Orientation=horizontal | 1 | 380×1 | FILL |
| `molecules/Alert` | Variant=destructive | 1 | 380×90 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Sign in to the Console |
| `type/h4` | Geist | SemiBold | 20/28 | `color/primary-foreground` | #fafafa | 1 | “Every confirmed UPI order lands on the  |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 2 | Back-office for the Business Owner and i |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 6 | 4 |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/primary-foreground` | #fafafa | 1 | Innings Break Console |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 3 | Business Owner or invited Operations Man |
| `type/xs-semibold` | Geist | SemiBold | 12/16 | `color/primary-foreground` | #fafafa | 1 | IB |

**Container fill tokens used:** `color/primary` #18181b, `ib/brand` #009966

### 4.2 C-3.1b Console · Team Members (Business Owner only)

Figma: [14:506](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=14-506) · root W fixed 1440 · H hug (1024) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "settings"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › organisms/Sidebar → `organisms/Sidebar` {"Active": "team"} | 0,61 | W fixed 256 · H fill (676) | vertical · main start · cross start | all `spacing/2` (8) | `spacing/1` (4) | fill `color/sidebar` #fafafa; stroke `color/sidebar-border` #e4e4e7 T/R/B/L 0/1/0/0px |
| Body | 0,61 | W fill (1440) · H hug (676) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 256,61 | W fill (1184) · H hug (676) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 280,85 | W fill (1136) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 280,85 | W fill (833) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 1113,95 | W hug (303) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Stats | 280,165 | W fill (1136) · H hug (106) | horizontal · main start · cross center | all 0 | `spacing/4` (16) | — |
| Body › Main › Card · Team table | 280,295 | W fill (1136) · H hug (324) | vertical · main start · cross start | all `padding/card` (24) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Card · Team table › Toolbar | 305,320 | W fill (1086) · H hug (36) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Team table › Table | 305,372 | W fill (1086) · H hug (222) | vertical · main start · cross start | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 1px; radius `radius/md` (8) |
| Body › Main › Card · Team table › Table › TableHeader | 306,373 | W fill (1084) · H hug (41) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | fill `color/muted` #f4f4f5; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Team table › Table › TableRow 1 | 306,414 | W fill (1084) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Team table › Table › TableRow 2 | 306,459 | W fill (1084) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Team table › Table › TableRow 3 | 306,504 | W fill (1084) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Team table › Table › TableRow 4 | 306,549 | W fill (1084) · H hug (44) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=secondary | 1 | 80×20 | HUG |
| `atoms/Badge` | Variant=status-delivered | 2 | 52×20 | HUG |
| `atoms/Badge` | Variant=status-new | 1 | 55×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 217×36 | HUG |
| `atoms/Button` | Variant=ghost, Size=sm | 7 | 50×32 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 78×36 | HUG |
| `atoms/Input` | State=default | 1 | 320×36 | FIXED |
| `atoms/Select` | State=filled | 1 | 220×36 | FIXED |
| `atoms/TableCell` | Type=cell | 20 | 140×44 | FIXED |
| `atoms/TableCell` | Type=head | 7 | 140×40 | FIXED |
| `molecules/Alert` | Variant=default | 1 | 1136×70 | FILL |
| `molecules/StatCard` | — | 3 | 240×106 | FIXED |
| `organisms/Header (Console)` | Active=settings | 1 | 1440×61 | FILL |
| `organisms/Sidebar` | Active=team | 1 | 256×676 | FIXED |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Team Members |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Invite Operations Managers by mobile num |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5

### 4.3 C-3.1c Console · Invite Operations Manager (Dialog)

Figma: [14:393](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=14-393) · root W fixed 1440 · H fixed 1024 · root fill literal #000000 @ 50% · root layout vertical · main center · cross center · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Dialog · Invite Operations Manager | 464,239 | W fixed 512 · H hug (546) | vertical · main start · cross start | all `padding/dialog` (24) | `spacing/4` (16) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10); effect `shadow/lg` |
| organisms/Dialog · Invite Operations Manager › DialogHeader | 489,264 | W fill (462) · H hug (76) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| organisms/Dialog · Invite Operations Manager › molecules/FormField · Full name | 489,356 | W fill (462) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Invite Operations Manager › molecules/FormField · Mobile number | 489,436 | W fill (462) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Invite Operations Manager › molecules/FormField · Email | 489,516 | W fill (462) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Invite Operations Manager › molecules/FormField · Assigned Kitchen Hub | 489,596 | W fill (462) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Invite Operations Manager › Share | 489,676 | W fill (462) · H hug (32) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| organisms/Dialog · Invite Operations Manager › DialogFooter | 489,724 | W fill (462) · H hug (36) | horizontal · main end · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=default | 1 | 106×36 | HUG |
| `atoms/Button` | Variant=ghost, Size=sm | 1 | 125×32 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 80×36 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 1 | 158×32 | HUG |
| `atoms/Input` | State=filled | 3 | 462×36 | FILL |
| `atoms/Label` | — | 4 | 64×20 | HUG |
| `atoms/Select` | State=filled | 1 | 462×36 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Invite Operations Manager |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | The mobile number is whitelisted immedia |

**Container fill tokens used:** `color/background` #ffffff

### 4.4 C-3.2 Console · Business Presences, Kitchen Hubs & Geofencing

Figma: [15:288](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=15-288) · root W fixed 1440 · H hug (1282) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "settings"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › organisms/Sidebar → `organisms/Sidebar` {"Active": "presences"} | 0,61 | W fixed 256 · H fill (1221) | vertical · main start · cross start | all `spacing/2` (8) | `spacing/1` (4) | fill `color/sidebar` #fafafa; stroke `color/sidebar-border` #e4e4e7 T/R/B/L 0/1/0/0px |
| Body | 0,61 | W fill (1440) · H hug (1221) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 256,61 | W fill (1184) · H hug (1221) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 280,85 | W fill (1136) · H hug (139) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Actions | 1192,85 | W hug (224) · H hug (139) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › PageHeader › Titles | 280,127 | W fill (912) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › Two columns | 280,248 | W fill (1136) · H hug (644) | horizontal · main start · cross start | all 0 | `gap/stack-lg` (24) | — |
| Body › Main › Two columns › Card · City → Kitchen Hubs | 280,248 | W fixed 380 · H hug (338) | vertical · main start · cross start | all `padding/card` (24) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Two columns › Card · Kitchen Hub details | 684,248 | W fill (732) · H hug (644) | vertical · main start · cross start | all `padding/card` (24) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Two columns › Card · City → Kitchen Hubs › CardHeader | 305,273 | W fill (330) · H hug (74) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Two columns › Card · Kitchen Hub details › CardHeader | 709,273 | W fill (682) · H hug (54) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Two columns › Card · Kitchen Hub details › Row 1 | 709,343 | W fill (682) · H hug (64) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| Body › Main › Two columns › Card · City → Kitchen Hubs › City | 305,363 | W fill (330) · H hug (22) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Two columns › Card · City → Kitchen Hubs › Hubs | 305,401 | W fill (330) · H hug (112) | vertical · main start · cross start | T 0 · R 0 · B 0 · L `spacing/6` (24) | `spacing/1` (4) | — |
| Body › Main › Two columns › Card · Kitchen Hub details › Hub role | 709,423 | W fill (682) · H hug (48) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Body › Main › Two columns › Card · Kitchen Hub details › Row 2 | 709,487 | W fill (682) · H hug (64) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| Body › Main › Two columns › Card · Kitchen Hub details › molecules/FormField · Full address / landmark | 709,567 | W fill (682) · H hug (108) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Body › Main › Two columns › Card · Kitchen Hub details › Status | 709,691 | W fill (682) · H hug (20) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Two columns › Card · Kitchen Hub details › Geofence | 709,727 | W fill (682) · H hug (88) | horizontal · main start · cross center | all `spacing/4` (16) | `spacing/3` (12) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Two columns › Card · Kitchen Hub details › Footer | 709,831 | W fill (682) · H hug (36) | horizontal · main end · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Card · Slots & cutoffs (US-07) | 280,916 | W fill (1136) · H hug (342) | vertical · main start · cross start | all `padding/card` (24) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Card · Slots & cutoffs (US-07) › CardHeader | 305,941 | W fill (1086) · H hug (54) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Card · Slots & cutoffs (US-07) › CardHeader › Titles | 305,941 | W fill (985) · H hug (54) | vertical · main start · cross start | all 0 | `spacing/1-5` (6) | — |
| Body › Main › Card · Slots & cutoffs (US-07) › Table | 305,1011 | W fill (1086) · H hug (222) | vertical · main start · cross start | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 1px; radius `radius/md` (8) |
| Body › Main › Card · Slots & cutoffs (US-07) › Table › TableHeader | 306,1012 | W fill (1084) · H hug (41) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | fill `color/muted` #f4f4f5; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Slots & cutoffs (US-07) › Table › TableRow 1 | 306,1053 | W fill (1084) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Slots & cutoffs (US-07) › Table › TableRow 2 | 306,1098 | W fill (1084) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Slots & cutoffs (US-07) › Table › TableRow 3 | 306,1143 | W fill (1084) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Slots & cutoffs (US-07) › Table › TableRow 4 | 306,1188 | W fill (1084) · H hug (44) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=outline | 2 | 68×22 | HUG |
| `atoms/Badge` | Variant=secondary | 2 | 61×20 | HUG |
| `atoms/Badge` | Variant=status-delivered | 8 | 52×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 148×36 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 80×36 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 2 | 147×32 | HUG |
| `atoms/Input` | State=filled | 4 | 333×36 | FILL |
| `atoms/Label` | — | 7 | 120×20 | HUG |
| `atoms/RadioGroupItem` | Checked=false | 1 | 16×16 | FIXED |
| `atoms/RadioGroupItem` | Checked=true | 1 | 16×16 | FIXED |
| `atoms/Select` | State=filled | 1 | 333×36 | FILL |
| `atoms/Switch` | Checked=true | 1 | 32×18 | FIXED |
| `atoms/TableCell` | Type=cell | 10 | 160×44 | FIXED |
| `atoms/TableCell` | Type=cell-muted | 2 | 260×44 | FIXED |
| `atoms/TableCell` | Type=head | 5 | 160×40 | FIXED |
| `atoms/Textarea` | — | 1 | 682×80 | FILL |
| `molecules/DropdownMenu` | — | 1 | 224×139 | FIXED |
| `organisms/Header (Console)` | Active=settings | 1 | 1440×61 | FILL |
| `organisms/Sidebar` | Active=presences | 1 | 256×1221 | FIXED |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Business Presences |
| `type/large` | Geist | SemiBold | 18/28 | `color/card-foreground` | #09090b | 3 | Presence hierarchy |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 2 | Primary Kitchen |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 4 | Configure operating cities and Kitchen H |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 3 | Chennai Central Kitchen Hub |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 2 | Chennai |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 3 | Primary Kitchen · 10 km radius |

**Container fill tokens used:** `color/accent` #f4f4f5, `color/card` #ffffff, `color/muted` #f4f4f5

### 4.5 C-3.3 Console · Active Month Calendar & Operational Schedule

Figma: [16:818](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=16-818) · root W fixed 1440 · H hug (1024) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "calendar"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body | 0,61 | W fill (1440) · H hug (908) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 0,61 | W fill (1440) · H hug (908) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 24,85 | W fill (1392) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 24,85 | W fill (929) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 953,95 | W hug (463) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Toolbar | 24,165 | W fill (1392) · H hug (32) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Body › Main › Toolbar › Month nav | 24,165 | W hug (548) · H hug (32) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Toolbar › Legend | 890,171 | W hug (526) · H hug (20) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Calendar | 24,221 | W fill (1392) · H hug (610) | vertical · main start · cross start | all `padding/card-compact` (16) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Card · Calendar › Month grid (Mon–Sun) | 41,238 | W fill (1358) · H hug (576) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Calendar › Month grid (Mon–Sun) › Weekday header | 41,238 | W hug (1326) · H hug (16) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Calendar › Month grid (Mon–Sun) › Week row 1 | 41,262 | W hug (1326) · H hug (104) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Calendar › Month grid (Mon–Sun) › Week row 2 | 41,374 | W hug (1326) · H hug (104) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Calendar › Month grid (Mon–Sun) › Week row 3 | 41,486 | W hug (1326) · H hug (104) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Calendar › Month grid (Mon–Sun) › Week row 4 | 41,598 | W hug (1326) · H hug (104) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Card · Calendar › Month grid (Mon–Sun) › Week row 5 | 41,710 | W hug (1326) · H hug (104) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Notes | 24,855 | W fill (1392) · H hug (90) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=default | 8 | 84×20 | HUG |
| `atoms/Badge` | Variant=outline | 1 | 106×22 | HUG |
| `atoms/Badge` | Variant=secondary | 26 | 123×20 | HUG |
| `atoms/Badge` | Variant=status-delivered | 11 | 147×20 | HUG |
| `atoms/Badge` | Variant=status-new | 4 | 148×20 | HUG |
| `atoms/Button` | Variant=ghost, Size=default | 1 | 178×36 | HUG |
| `atoms/Button` | Variant=ghost, Size=sm | 5 | 150×32 | FILL |
| `atoms/Button` | Variant=outline, Size=default | 1 | 277×36 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 7 | 137×32 | HUG |
| `atoms/Button` | Variant=secondary, Size=sm | 1 | 119×32 | HUG |
| `molecules/Alert` | Variant=default | 2 | 688×90 | FILL |
| `organisms/Header (Console)` | Active=calendar | 1 | 1440×61 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Operational Calendar |
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | September 2026 |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Mon–Sun business week. Toggle days per K |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 10 | 5 |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/muted-foreground` | #71717b | 25 | 31 |
| `type/xs-semibold` | Geist | SemiBold | 12/16 | `color/muted-foreground` | #71717b | 8 | Monday |

**Container fill tokens used:** `color/background` #ffffff, `color/card` #ffffff, `ib/success-subtle` #f0fdf4

### 4.6 C-3.4 Console · Areas, Venues & Ground Directory

Figma: [17:511](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=17-511) · root W fixed 1440 · H hug (1096) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "directory"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body | 0,61 | W fill (1440) · H hug (1035) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 0,61 | W fill (1440) · H hug (1035) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 24,85 | W fill (1392) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 24,85 | W fill (1163) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 1187,95 | W hug (229) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Toolbar | 24,165 | W fill (1392) · H hug (36) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Body › Main › Toolbar › Filters | 760,165 | W hug (656) · H hug (36) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Body › Main › Toolbar › molecules/Tabs · TabsList | 24,167 | W hug (275) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Split | 24,225 | W fill (1392) · H hug (753) | vertical · main start · cross start | all 0 | `gap/stack-lg` (24) | — |
| Body › Main › Split › Card · Venues grid (US-11) | 24,225 | W fill (1392) · H hug (301) | vertical · main start · cross start | all `padding/card-compact` (16) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Split › Card · Venues grid (US-11) › Table | 41,242 | W fill (1358) · H hug (267) | vertical · main start · cross start | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 1px; radius `radius/md` (8) |
| Body › Main › Split › Card · Venue facilities (US-12) | 24,550 | W fill (1392) · H hug (428) | vertical · main start · cross start | all `padding/card` (24) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Split › Card · Venue facilities (US-12) › CardHeader | 49,575 | W fill (1342) · H hug (54) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Split › Card · Venue facilities (US-12) › Ground · Ground #1 (Centre Turf) | 49,645 | W fill (1342) · H hug (92) | horizontal · main space-between · cross center | all `spacing/3` (12) | `spacing/3` (12) (auto: SPACE_BETWEEN) | stroke `color/border` #e4e4e7 1px; radius `radius/md` (8) |
| Body › Main › Split › Card · Venue facilities (US-12) › Ground · Ground #2 (South Matting) | 49,753 | W fill (1342) · H hug (92) | horizontal · main space-between · cross center | all `spacing/3` (12) | `spacing/3` (12) (auto: SPACE_BETWEEN) | stroke `color/border` #e4e4e7 1px; radius `radius/md` (8) |
| Body › Main › Split › Card · Venue facilities (US-12) › Ground · Practice Net Cage A | 49,861 | W fill (1342) · H hug (92) | horizontal · main space-between · cross center | all `spacing/3` (12) | `spacing/3` (12) (auto: SPACE_BETWEEN) | stroke `color/border` #e4e4e7 1px; radius `radius/md` (8) |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=outline | 6 | 83×22 | HUG |
| `atoms/Badge` | Variant=secondary | 8 | 100×20 | HUG |
| `atoms/Badge` | Variant=status-delivered | 10 | 139×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 115×36 | HUG |
| `atoms/Button` | Variant=default, Size=sm | 1 | 174×32 | HUG |
| `atoms/Button` | Variant=ghost, Size=sm | 5 | 134×32 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 106×36 | HUG |
| `atoms/Input` | State=default | 1 | 280×36 | FIXED |
| `atoms/Select` | State=filled | 2 | 200×36 | FIXED |
| `atoms/TableCell` | Type=cell | 15 | 240×44 | FIXED |
| `atoms/TableCell` | Type=head | 8 | 56×40 | FIXED |
| `atoms/TabsTrigger` | Active=false | 2 | 80×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 1 | 94×28 | HUG |
| `molecules/Alert` | Variant=destructive | 1 | 1392×70 | FILL |
| `organisms/Header (Console)` | Active=directory | 1 | 1440×61 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Ground Directory |
| `type/large` | Geist | SemiBold | 18/28 | `color/card-foreground` | #09090b | 1 | Marina Cricket Arena — Grounds & facilit |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 2 | Decoupled CRUD for Areas, Venues and nes |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 3 | Ground #1 (Centre Turf) |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 3 | Gate: Enter Gate 4 opposite Lighthouse.  |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5

### 4.7 C-3.5 Console · Kitchen Menu, Nutrition & Dynamic Bundles

Figma: [17:875](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=17-875) · root W fixed 1440 · H hug (1024) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "menu"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body | 0,61 | W fill (1440) · H hug (848) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 0,61 | W fill (1440) · H hug (848) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 24,85 | W fill (1392) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 24,85 | W fill (1129) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 1153,95 | W hug (263) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Toolbar | 24,165 | W fill (1392) · H hug (32) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Body › Main › Toolbar › molecules/Tabs · TabsList | 24,165 | W hug (668) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Toolbar › molecules/Tabs · TabsList | 1190,165 | W hug (226) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Split | 24,221 | W fill (1392) · H hug (664) | horizontal · main start · cross start | all 0 | `gap/stack-lg` (24) | — |
| Body › Main › Split › Item grid | 24,221 | W fill (948) · H hug (664) | horizontal · main start · cross start | all 0 | `spacing/4` (16); wrap, row gap 16 | — |
| Body › Main › Split › Item grid › Card · Menu item · Cold-Pressed Watermelon Juice | 24,221 | W fixed 300 · H hug (324) | vertical · main start · cross start | all `padding/card-compact` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| Body › Main › Split › Item grid › Card · Menu item · Boiled Egg Duo with Pepper | 340,221 | W fixed 300 · H hug (324) | vertical · main start · cross start | all `padding/card-compact` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| Body › Main › Split › Item grid › Card · Menu item · Millet / Ragi Porridge (Koozh) | 656,221 | W fixed 300 · H hug (324) | vertical · main start · cross start | all `padding/card-compact` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| Body › Main › Split › Card · Dynamic Bundle Builder (US-15) | 996,221 | W fixed 420 · H hug (567) | vertical · main start · cross start | all `padding/card` (24) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Split › Card · Dynamic Bundle Builder (US-15) › CardHeader | 1021,246 | W fill (370) · H hug (74) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Split › Card · Dynamic Bundle Builder (US-15) › molecules/FormField · Bundle name | 1021,336 | W fill (370) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Body › Main › Split › Card · Dynamic Bundle Builder (US-15) › Lines | 1021,416 | W fill (370) · H hug (138) | vertical · main start · cross start | all 0 | `spacing/3` (12) | — |
| Body › Main › Split › Item grid › Card · Menu item · Tender Coconut Water | 24,561 | W fixed 300 · H hug (324) | vertical · main start · cross start | all `padding/card-compact` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| Body › Main › Split › Item grid › Card · Menu item · Dates & Nut Energy Balls (2) | 340,561 | W fixed 300 · H hug (324) | vertical · main start · cross start | all `padding/card-compact` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| Body › Main › Split › Item grid › Card · Menu item · Whole-Wheat Veggie Roll | 656,561 | W fixed 300 · H hug (324) | vertical · main start · cross start | all `padding/card-compact` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/xs` |
| Body › Main › Split › Card · Dynamic Bundle Builder (US-15) › Price | 1021,587 | W fill (370) · H hug (88) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| Body › Main › Split › Card · Dynamic Bundle Builder (US-15) › Scope | 1021,691 | W fill (370) · H hug (20) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Split › Card · Dynamic Bundle Builder (US-15) › Footer | 1021,727 | W fill (370) · H hug (36) | horizontal · main end · cross center | all 0 | `gap/inline` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=outline | 6 | 146×22 | HUG |
| `atoms/Badge` | Variant=status-delivered | 5 | 38×20 | HUG |
| `atoms/Badge` | Variant=status-new | 2 | 38×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 2 | 146×36 | HUG |
| `atoms/Button` | Variant=ghost, Size=sm | 6 | 156×32 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 2 | 109×36 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 6 | 52×32 | HUG |
| `atoms/Checkbox` | Checked=true | 1 | 16×16 | FIXED |
| `atoms/Input` | State=filled | 3 | 370×36 | FILL |
| `atoms/Label` | — | 3 | 86×20 | HUG |
| `atoms/QuantityStepper` | — | 3 | 104×32 | HUG |
| `atoms/Separator` | Orientation=horizontal | 1 | 370×1 | FILL |
| `atoms/Switch` | Checked=false | 1 | 32×18 | FIXED |
| `atoms/Switch` | Checked=true | 5 | 32×18 | FIXED |
| `atoms/TabsTrigger` | Active=false | 6 | 166×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 2 | 34×28 | HUG |
| `organisms/Header (Console)` | Active=menu | 1 | 1440×61 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Menu & Bundles |
| `type/large` | Geist | SemiBold | 18/28 | `color/card-foreground` | #09090b | 1 | Dynamic Bundle Builder |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 1 | Publish to Chennai Central Kitchen Hub |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 2 | Central in-house sports-nutrition catalo |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 3 | Cold-Pressed Watermelon Juice |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/card-foreground` | #09090b | 6 | Cold-Pressed Watermelon Juice |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 6 | ₹60 |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 10 | 110 kcal · 1g P · 26g C · 0g F · K+ Na+ |
| `type/xs-medium` | Geist | Medium | 12/16 | `color/muted-foreground` | #71717b | 1 | Sold Out |
| `type/xs-medium` | Geist | Medium | 12/16 | `ib/success` | #00a63e | 5 | In Stock |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5

### 4.8 C-3.6a Console · Order Queue (Kanban, day + slot scoped)

Figma: [17:1230](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=17-1230) · root W fixed 1440 · H hug (1366) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "orders"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body | 0,61 | W fill (1440) · H hug (1305) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 0,61 | W fill (1440) · H hug (1305) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 24,85 | W fill (1392) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 24,85 | W fill (874) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 898,95 | W hug (518) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Toolbar | 24,165 | W fill (1392) · H hug (32) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Body › Main › Toolbar › molecules/Tabs · TabsList | 24,165 | W hug (581) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Toolbar › molecules/Tabs · TabsList | 1065,165 | W hug (351) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Stats | 24,221 | W fill (1392) · H hug (106) | horizontal · main start · cross center | all 0 | `spacing/4` (16) | — |
| Body › Main › Kanban board | 24,351 | W fill (1392) · H hug (909) | horizontal · main start · cross start | all 0 | `spacing/4` (16) | — |
| Body › Main › Kanban board › Column · new | 24,351 | W fixed 264 · H hug (909) | vertical · main start · cross start | all `spacing/0` (0) | `spacing/3` (12) | — |
| Body › Main › Kanban board › Column · accepted | 304,351 | W fixed 264 · H hug (618) | vertical · main start · cross start | all `spacing/0` (0) | `spacing/3` (12) | — |
| Body › Main › Kanban board › Column · preparing | 584,351 | W fixed 264 · H hug (327) | vertical · main start · cross start | all `spacing/0` (0) | `spacing/3` (12) | — |
| Body › Main › Kanban board › Column · transit | 864,351 | W fixed 264 · H hug (327) | vertical · main start · cross start | all `spacing/0` (0) | `spacing/3` (12) | — |
| Body › Main › Kanban board › Column · delivered | 1144,351 | W fixed 264 · H hug (327) | vertical · main start · cross start | all `spacing/0` (0) | `spacing/3` (12) | — |
| Body › Main › Cancelled row | 24,1284 | W fill (1392) · H hug (58) | horizontal · main space-between · cross center | T `spacing/3` (12) · R `spacing/4` (16) · B `spacing/3` (12) · L `spacing/4` (16) | `spacing/3` (12) (auto: SPACE_BETWEEN) | fill `ib/destructive-subtle` #fef2f2; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10) |
| Body › Main › Cancelled row › l | 41,1303 | W hug (557) · H hug (20) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=default | 1 | 205×36 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 2 | 148×36 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 1 | 156×32 | HUG |
| `atoms/TabsTrigger` | Active=false | 8 | 55×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 2 | 120×28 | HUG |
| `molecules/KanbanColumnHeader` | Stage=accepted | 1 | 264×36 | FILL |
| `molecules/KanbanColumnHeader` | Stage=delivered | 1 | 264×36 | FILL |
| `molecules/KanbanColumnHeader` | Stage=new | 1 | 264×36 | FILL |
| `molecules/KanbanColumnHeader` | Stage=preparing | 1 | 264×36 | FILL |
| `molecules/KanbanColumnHeader` | Stage=transit | 1 | 264×36 | FILL |
| `molecules/OrderCard` | Stage=accepted | 2 | 264×279 | FILL |
| `molecules/OrderCard` | Stage=delivered | 1 | 264×279 | FILL |
| `molecules/OrderCard` | Stage=new | 3 | 264×279 | FILL |
| `molecules/OrderCard` | Stage=preparing | 1 | 264×279 | FILL |
| `molecules/OrderCard` | Stage=transit | 1 | 264×279 | FILL |
| `molecules/StatCard` | — | 5 | 266×106 | FILL |
| `organisms/Header (Console)` | Active=orders | 1 | 1440×61 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Order Queue |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Active Kitchen Hub → Match date → Slot → |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/destructive` | #e7000b | 1 | Cancelled / Rainout (2) — removed from p |

**Container fill tokens used:** `color/muted` #f4f4f5, `ib/destructive-subtle` #fef2f2

### 4.9 C-3.6b Console · Batch Prep Sheet & Invoice

Figma: [17:1793](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=17-1793) · root W fixed 1440 · H hug (1024) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "orders"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body | 0,61 | W fill (1440) · H hug (745) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 0,61 | W fill (1440) · H hug (745) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 24,85 | W fill (1392) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 24,85 | W fill (1026) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 1050,95 | W hug (366) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Toolbar | 24,165 | W fill (1392) · H hug (32) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Body › Main › Toolbar › molecules/Tabs · TabsList | 24,165 | W hug (312) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Toolbar › molecules/Tabs · TabsList | 1136,165 | W hug (280) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Split | 24,221 | W fill (1392) · H hug (561) | horizontal · main start · cross start | all 0 | `gap/stack-lg` (24) | — |
| Body › Main › Split › Left | 24,221 | W fill (948) · H hug (493) | vertical · main start · cross start | all 0 | `gap/stack-md` (16) | — |
| Body › Main › Split › Left › Stats | 24,221 | W fill (948) · H hug (106) | horizontal · main start · cross center | all 0 | `spacing/4` (16) | — |
| Body › Main › Split › Card · Invoice receipt (US-19) | 996,221 | W fixed 420 · H hug (561) | vertical · main start · cross start | all `padding/card` (24) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Split › Card · Invoice receipt (US-19) › Inv head | 1021,246 | W fill (370) · H hug (28) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Body › Main › Split › Left › Card · Prep table | 24,343 | W fill (948) · H hug (371) | vertical · main start · cross start | all `padding/card-compact` (16) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Split › Card · Invoice receipt (US-19) › Customer | 1021,343 | W fill (370) · H hug (60) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › Split › Card · Invoice receipt (US-19) › Items | 1021,428 | W fill (370) · H hug (104) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| Body › Main › Split › Card · Invoice receipt (US-19) › Billing | 1021,557 | W fill (370) · H hug (104) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| Body › Main › Split › Card · Invoice receipt (US-19) › Footer | 1021,725 | W fill (370) · H hug (32) | horizontal · main end · cross center | all 0 | `gap/inline` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=status-delivered | 1 | 41×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 205×36 | HUG |
| `atoms/Button` | Variant=default, Size=sm | 1 | 110×32 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 153×36 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 1 | 126×32 | HUG |
| `atoms/Separator` | Orientation=horizontal | 3 | 370×1 | FILL |
| `atoms/TableCell` | Type=cell | 35 | 230×44 | FIXED |
| `atoms/TableCell` | Type=head | 7 | 230×40 | FIXED |
| `atoms/TabsTrigger` | Active=false | 4 | 94×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 2 | 93×28 | HUG |
| `molecules/StatCard` | — | 3 | 305×106 | FILL |
| `organisms/Header (Console)` | Active=orders | 1 | 1440×61 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Aggregated Kitchen Prep Sheet |
| `type/large` | Geist | SemiBold | 18/28 | `color/card-foreground` | #09090b | 1 | Item totals by ground |
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Invoice INV-9281 |
| `type/mono-sm` | Geist Mono | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | UPI ref 4381 2290 7716 · Razorpay 24 Sep |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 6 | ₹660 |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 9 | Saturday 26 Sep — 6:30 AM Slot · Chennai |
| `type/sm` | Geist | Regular | 14/20 | `ib/success` | #00a63e | 1 | − ₹500 |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 3 | Chennai Strikers CC |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 3 | Order #IB-9281 · Sat 26 Sep · 6:30 AM Sl |
| `type/xs-semibold` | Geist | SemiBold | 12/16 | `color/primary-foreground` | #fafafa | 1 | IB |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5, `ib/brand` #009966

### 4.10 C-3.7 Console · Dispatch Courier & Logistics Booking (Dialog)

Figma: [18:1133](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=18-1133) · root W fixed 1440 · H fixed 1024 · root fill literal #000000 @ 50% · root layout vertical · main center · cross center · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Dialog · Dispatch Courier | 440,92 | W fixed 560 · H hug (840) | vertical · main start · cross start | all `padding/dialog` (24) | `spacing/4` (16) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10); effect `shadow/lg` |
| organisms/Dialog · Dispatch Courier › DialogHeader | 465,117 | W fill (510) · H hug (76) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| organisms/Dialog · Dispatch Courier › Order summary | 465,209 | W fill (510) · H hug (78) | horizontal · main start · cross center | all `spacing/3` (12) | `spacing/3` (12) | fill `color/muted` #f4f4f5; radius `radius/md` (8) |
| organisms/Dialog · Dispatch Courier › Order summary › s | 509,221 | W fill (454) · H hug (54) | vertical · main start · cross start | all 0 | `spacing/0-5` (2) | — |
| organisms/Dialog · Dispatch Courier › molecules/FormField · Delivery partner | 465,303 | W fill (510) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Dispatch Courier › Partners | 465,383 | W fill (510) · H hug (22) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| organisms/Dialog · Dispatch Courier › molecules/FormField · Booking / Tracking ID * | 465,421 | W fill (510) · H hug (88) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Dispatch Courier › molecules/FormField · Live tracking URL (optional) | 465,525 | W fill (510) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Dispatch Courier › Row | 465,605 | W fill (510) · H hug (64) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| organisms/Dialog · Dispatch Courier › Row › molecules/FormField · Driver name | 465,605 | W fill (247) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Dispatch Courier › Row › molecules/FormField · Driver phone | 728,605 | W fill (247) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Dispatch Courier › molecules/FormField · Estimated arrival (ETA) | 465,685 | W fill (510) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Dispatch Courier › DialogFooter | 465,871 | W fill (510) · H hug (36) | horizontal · main end · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=default | 1 | 51×20 | HUG |
| `atoms/Badge` | Variant=outline | 3 | 54×22 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 222×36 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 80×36 | HUG |
| `atoms/Input` | State=filled | 4 | 510×36 | FILL |
| `atoms/Label` | — | 6 | 106×20 | HUG |
| `atoms/Select` | State=filled | 2 | 510×36 | FILL |
| `molecules/Alert` | Variant=default | 1 | 510×90 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Dispatch Courier |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Assign a 3rd-party delivery partner. Boo |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | #IB-9262 · Porur Panthers · 6:30 AM Slot |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 2 | Drop: Marina Cricket Arena — Ground #1,  |

**Container fill tokens used:** `color/background` #ffffff, `color/muted` #f4f4f5

### 4.11 C-3.8 Console · Support & Issue Resolution

Figma: [18:1219](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=18-1219) · root W fixed 1440 · H hug (1024) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "support"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body | 0,61 | W fill (1440) · H hug (942) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 0,61 | W fill (1440) · H hug (942) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 24,85 | W fill (1392) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 24,85 | W fill (1287) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 1311,95 | W hug (105) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › Stats | 24,165 | W fill (1392) · H hug (106) | horizontal · main start · cross center | all 0 | `spacing/4` (16) | — |
| Body › Main › Split | 24,295 | W fill (1392) · H hug (684) | horizontal · main start · cross start | all 0 | `gap/stack-lg` (24) | — |
| Body › Main › Split › Card · Ticket list | 24,295 | W fixed 420 · H hug (684) | vertical · main start · cross start | all `padding/card-compact` (16) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Split › Card · Ticket detail | 468,295 | W fill (948) · H hug (651) | vertical · main start · cross start | all `padding/card` (24) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Split › Card · Ticket list › CardHeader | 41,312 | W fill (386) · H hug (54) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Split › Card · Ticket detail › CardHeader | 493,320 | W fill (898) · H hug (54) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Split › Card · Ticket list › molecules/Tabs · TabsList | 41,382 | W hug (287) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Split › Card · Ticket detail › Facts | 493,390 | W fill (898) · H hug (104) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| Body › Main › Split › Card · Ticket detail › Thread | 493,527 | W fill (898) · H hug (52) | vertical · main start · cross start | all 0 | `spacing/3` (12) | — |
| Body › Main › Split › Card · Ticket detail › molecules/FormField · Internal resolution notes | 493,595 | W fill (898) · H hug (108) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Body › Main › Split › Card · Ticket detail › Credit | 493,719 | W fill (898) · H hug (64) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| Body › Main › Split › Card · Ticket detail › Footer | 493,885 | W fill (898) · H hug (36) | horizontal · main end · cross center | all 0 | `gap/inline` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=status-new | 1 | 47×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 190×36 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 2 | 105×36 | HUG |
| `atoms/Button` | Variant=secondary, Size=default | 1 | 159×36 | HUG |
| `atoms/Input` | State=filled | 1 | 441×36 | FILL |
| `atoms/Label` | — | 3 | 160×20 | HUG |
| `atoms/Select` | State=filled | 1 | 441×36 | FILL |
| `atoms/Separator` | Orientation=horizontal | 1 | 898×1 | FILL |
| `atoms/TabsTrigger` | Active=false | 2 | 108×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 1 | 72×28 | HUG |
| `atoms/Textarea` | — | 1 | 898×80 | FILL |
| `molecules/Alert` | Variant=default | 1 | 898×70 | FILL |
| `molecules/StatCard` | — | 3 | 453×106 | FILL |
| `molecules/TicketCard` | — | 3 | 386×160 | FILL |
| `organisms/Header (Console)` | Active=support | 1 | 1440×61 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Support & Issues |
| `type/large` | Geist | SemiBold | 18/28 | `color/card-foreground` | #09090b | 2 | Support tickets |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 1 | “2 coconut water crates missing at Gate  |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 7 | Resolve customer tickets with notes or a |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 4 | #IB-9281 · Sat 26 Sep @ Marina Turf 1 ·  |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | Customer message |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5

### 4.12 C-3.9a Console · Cancelled & Rainout Orders

Figma: [18:1420](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=18-1420) · root W fixed 1440 · H hug (1024) · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Console) → `organisms/Header (Console)` {"Active": "orders"} | 0,0 | W fill (1440) · H hug (61) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body | 0,61 | W fill (1440) · H hug (661) | horizontal · main start · cross start | all 0 | `spacing/0` (0) | — |
| Body › Main | 0,61 | W fill (1440) · H hug (661) | vertical · main start · cross start | all `padding/page-desktop` (24) | `gap/stack-lg` (24) | — |
| Body › Main › PageHeader | 24,85 | W fill (1392) · H hug (56) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › PageHeader › Titles | 24,85 | W fill (1030) · H hug (56) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Body › Main › PageHeader › Actions | 1054,95 | W hug (362) · H hug (36) | horizontal · main start · cross center | all 0 | `gap/inline` (8) | — |
| Body › Main › molecules/Tabs · TabsList | 24,165 | W hug (270) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Body › Main › Cutoffs | 24,221 | W fill (1392) · H hug (78) | horizontal · main start · cross center | all 0 | `spacing/4` (16) | — |
| Body › Main › Cutoffs › Cutoff · 6:30 AM | 24,221 | W fill (453) · H hug (78) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/1` (4) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10) |
| Body › Main › Cutoffs › Cutoff · 10:30 AM | 493,221 | W fill (453) · H hug (78) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/1` (4) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10) |
| Body › Main › Cutoffs › Cutoff · 2:30 PM | 963,221 | W fill (453) · H hug (78) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/1` (4) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10) |
| Body › Main › Card · Cancelled table | 24,323 | W fill (1392) · H hug (281) | vertical · main start · cross start | all `padding/card-compact` (16) | `gap/stack-md` (16) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14); effect `shadow/sm` |
| Body › Main › Card · Cancelled table › CardHeader | 41,340 | W fill (1358) · H hug (54) | horizontal · main space-between · cross center | all 0 | `spacing/4` (16) (auto: SPACE_BETWEEN) | — |
| Body › Main › Card · Cancelled table › CardHeader › Titles | 41,340 | W fill (1358) · H hug (54) | vertical · main start · cross start | all 0 | `spacing/1-5` (6) | — |
| Body › Main › Card · Cancelled table › Table | 41,410 | W fill (1358) · H hug (177) | vertical · main start · cross start | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 1px; radius `radius/md` (8) |
| Body › Main › Card · Cancelled table › Table › TableHeader | 42,411 | W fill (1356) · H hug (41) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | fill `color/muted` #f4f4f5; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Cancelled table › Table › TableRow 1 | 42,452 | W fill (1356) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Cancelled table › Table › TableRow 2 | 42,497 | W fill (1356) · H hug (45) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Body › Main › Card · Cancelled table › Table › TableRow 3 | 42,542 | W fill (1356) · H hug (44) | horizontal · main start · cross center | all 0 | `spacing/0` (0) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=destructive | 1 | 86×20 | HUG |
| `atoms/Badge` | Variant=outline | 1 | 100×22 | HUG |
| `atoms/Badge` | Variant=secondary | 1 | 113×20 | HUG |
| `atoms/Badge` | Variant=status-delivered | 2 | 132×20 | HUG |
| `atoms/Badge` | Variant=status-transit | 1 | 60×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 167×36 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 187×36 | HUG |
| `atoms/TableCell` | Type=cell | 15 | 120×44 | FIXED |
| `atoms/TableCell` | Type=head | 7 | 120×40 | FIXED |
| `atoms/TabsTrigger` | Active=false | 1 | 99×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 1 | 167×28 | HUG |
| `molecules/Alert` | Variant=destructive | 1 | 1392×70 | FILL |
| `organisms/Header (Console)` | Active=orders | 1 | 1440×61 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Cancelled / Rainout |
| `type/large` | Geist | SemiBold | 18/28 | `color/card-foreground` | #09090b | 1 | Saturday 26 Sep |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 5 | Orders removed from prep queue. Rainout  |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 3 | 6:30 AM slot |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5

### 4.13 C-3.9b Console · Manual Soft Credit (Dialog)

Figma: [18:1557](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=18-1557) · root W fixed 1440 · H fixed 1024 · root fill literal #000000 @ 50% · root layout vertical · main center · cross center · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Dialog · Issue Manual Soft Credit | 464,217 | W fixed 512 · H hug (590) | vertical · main start · cross start | all `padding/dialog` (24) | `spacing/4` (16) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10); effect `shadow/lg` |
| organisms/Dialog · Issue Manual Soft Credit › DialogHeader | 489,242 | W fill (462) · H hug (76) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › Row | 489,334 | W fill (462) · H hug (64) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| organisms/Dialog · Issue Manual Soft Credit › Row › molecules/FormField · Linked order | 489,334 | W fill (223) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › Row › molecules/FormField · Amount (₹) | 728,334 | W fill (223) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › Quick | 489,414 | W fill (462) · H hug (32) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › molecules/FormField · Reason * | 489,462 | W fill (462) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › molecules/FormField · Notes | 489,542 | W fill (462) · H hug (108) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › Audit | 489,666 | W fill (462) · H hug (64) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| organisms/Dialog · Issue Manual Soft Credit › Audit › molecules/FormField · Issued by | 489,666 | W fill (223) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › Audit › molecules/FormField · Timestamp | 728,666 | W fill (223) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Issue Manual Soft Credit › DialogFooter | 489,746 | W fill (462) · H hug (36) | horizontal · main end · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=default | 1 | 151×36 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 80×36 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 2 | 56×32 | HUG |
| `atoms/Button` | Variant=secondary, Size=sm | 1 | 54×32 | HUG |
| `atoms/Input` | State=disabled | 2 | 223×36 | FILL |
| `atoms/Input` | State=filled | 1 | 223×36 | FILL |
| `atoms/Label` | — | 6 | 82×20 | HUG |
| `atoms/Select` | State=filled | 2 | 223×36 | FILL |
| `atoms/Textarea` | — | 1 | 462×80 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Issue Manual Soft Credit |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Credit goes to the Team Wallet of Anna N |

**Container fill tokens used:** `color/background` #ffffff

## 5. Customer frames (mobile 390 × 844)

### 5.1 M-3.1a Customer · Sign up (Team + CricHeroes verification)

Figma: [22:2081](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=22-2081) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| Content | 1,1 | W fill (388) · H fill (842) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Brand | 17,17 | W fill (356) · H hug (112) | vertical · main start · cross center | all 0 | `spacing/2` (8) | — |
| Content › Brand › Mark | 171,17 | W fixed 48 · H fixed 48 | horizontal · main center · cross center | all 0 | 0 | fill `ib/brand` #009966; radius `radius/lg` (10) |
| Content › Card · Sign up | 17,145 | W fill (356) · H hug (562) | vertical · main start · cross start | all `spacing/6` (24) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Sign up › Heading | 42,170 | W fill (306) · H hug (72) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Sign up › molecules/FormField · Team name | 42,254 | W fill (306) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Content › Card · Sign up › molecules/FormField · Team Manager mobile | 42,330 | W fill (306) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Content › Card · Sign up › molecules/FormField · CricHeroes Team profile URL * | 42,406 | W fill (306) · H hug (104) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Content › Card · Sign up › molecules/FormField · CricHeroes Captain profile URL (optional) | 42,522 | W fill (306) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=lg | 1 | 306×40 | FILL |
| `atoms/Button` | Variant=link, Size=sm | 1 | 306×32 | FILL |
| `atoms/Input` | State=filled | 4 | 306×36 | FILL |
| `atoms/Label` | — | 4 | 75×20 | HUG |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 2 | Innings Break |
| `type/large` | Geist | SemiBold | 18/28 | `color/primary-foreground` | #fafafa | 1 | IB |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 2 | Healthy match-day food, delivered to you |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 1 | Mandatory — verifies team legitimacy, fi |

**Container fill tokens used:** `color/card` #ffffff, `ib/brand` #009966

### 5.2 M-3.1b Customer · Verify OTP

Figma: [19:1379](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=19-1379) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| Content | 1,1 | W fill (388) · H fill (842) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-lg` (24) | — |
| Content › Brand | 17,17 | W fill (356) · H hug (112) | vertical · main start · cross center | all 0 | `spacing/2` (8) | — |
| Content › Brand › Mark | 171,17 | W fixed 48 · H fixed 48 | horizontal · main center · cross center | all 0 | 0 | fill `ib/brand` #009966; radius `radius/lg` (10) |
| Content › Card · OTP | 17,153 | W fill (356) · H hug (368) | vertical · main start · cross start | all `spacing/6` (24) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · OTP › Heading | 42,178 | W fill (306) · H hug (72) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · OTP › InputOTP | 42,262 | W fill (306) · H hug (52) | horizontal · main center · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=lg | 1 | 306×40 | FILL |
| `molecules/Alert` | Variant=destructive | 1 | 306×90 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 8 | Innings Break |
| `type/large` | Geist | SemiBold | 18/28 | `color/primary-foreground` | #fafafa | 1 | IB |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 2 | Healthy match-day food, delivered to you |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 1 | Resend code in 0:24 |

**Container fill tokens used:** `color/background` #ffffff, `color/card` #ffffff, `ib/brand` #009966

### 5.3 M-3.1c Customer · Team Profile & Roster

Figma: [19:1414](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=19-1414) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (708) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Heading | 17,74 | W fill (356) · H hug (52) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Team details | 17,142 | W fill (356) · H hug (208) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Team details › molecules/FormField · Team name | 34,159 | W fill (322) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Content › Card · Team details › r | 34,269 | W fill (322) · H hug (64) | horizontal · main start · cross center | all 0 | `gap/stack-md` (16) | — |
| Content › Card · Roster | 17,366 | W fill (356) · H hug (354) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/2` (8) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Roster › Roster head | 34,383 | W fill (322) · H hug (32) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Roster › Player · Arun Kumar | 34,423 | W fill (322) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| Content › Card · Roster › Player · Dinesh R | 34,485 | W fill (322) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| Content › Card · Roster › Player · Karthik S | 34,547 | W fill (322) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| Content › Card · Roster › Player · Vignesh P | 34,609 | W fill (322) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "profile"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Avatar` | Size=default | 4 | 32×32 | FIXED |
| `atoms/Badge` | Variant=default | 1 | 60×20 | HUG |
| `atoms/Badge` | Variant=outline | 3 | 179×22 | HUG |
| `atoms/Badge` | Variant=secondary | 1 | 63×20 | HUG |
| `atoms/Button` | Variant=ghost, Size=sm | 1 | 322×32 | FILL |
| `atoms/Button` | Variant=outline, Size=sm | 1 | 108×32 | HUG |
| `atoms/Input` | State=filled | 2 | 322×36 | FILL |
| `atoms/Label` | — | 3 | 75×20 | HUG |
| `atoms/Select` | State=filled | 1 | 153×36 | FILL |
| `organisms/BottomNav` | Active=profile | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | Chennai Strikers CC |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Team profile · 14 players · Captain Arun |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 4 | Arun Kumar |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | Roster (14) |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 4 | +91 98400 12345 |

**Container fill tokens used:** `color/card` #ffffff

### 5.4 M-3.2 Customer · Match Calendar (landing)

Figma: [19:1520](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=19-1520) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (708) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Heading | 17,74 | W fill (356) · H hug (52) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Legend | 17,476 | W fill (356) · H hug (22) | horizontal · main start · cross center | all 0 | `spacing/3` (12) | — |
| Content › Card · Upcoming | 17,514 | W fill (356) · H hug (182) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/2` (8) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "calendar"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=outline | 1 | 58×22 | HUG |
| `atoms/Badge` | Variant=status-delivered | 1 | 75×20 | HUG |
| `atoms/Badge` | Variant=status-preparing | 1 | 89×20 | HUG |
| `atoms/Button` | Variant=default, Size=lg | 1 | 356×40 | FILL |
| `molecules/Calendar` | — | 1 | 356×318 | FILL |
| `molecules/MatchSwitcherPill` | Active=false | 1 | 322×56 | FILL |
| `molecules/MatchSwitcherPill` | Active=true | 1 | 322×56 | FILL |
| `organisms/BottomNav` | Active=calendar | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | Your matches |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Pick a date to schedule a match & pre-or |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | Upcoming |

**Container fill tokens used:** `color/card` #ffffff

### 5.5 M-3.3a Customer · Schedule Match (Sheet, step 2 Ground)

Figma: [22:2117](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=22-2117) · root W fixed 390 · H fixed 844 · root fill literal #000000 @ 50% · root layout vertical · main end · cross center · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Sheet · Schedule a match | 0,162 | W fixed 390 · H hug (682) | vertical · main start · cross start | all `padding/sheet` (24) | `spacing/4` (16) | fill `color/background` #ffffff; radius `radius/xl` ([14, 14, 0, 0]); effect `shadow/lg` |
| organisms/Sheet · Schedule a match › Handle row | 24,186 | W fill (342) · H hug (6) | horizontal · main center · cross center | all 0 | `spacing/0` (0) | — |
| organisms/Sheet · Schedule a match › SheetHeader | 24,208 | W fill (342) · H hug (54) | vertical · main start · cross start | all 0 | `spacing/1-5` (6) | — |
| organisms/Sheet · Schedule a match › Stepper | 24,278 | W fill (342) · H hug (24) | horizontal · main start · cross center | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Schedule a match › Stepper › Step 1 | 24,278 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Schedule a match › Stepper › Step 2 | 111,278 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Schedule a match › Stepper › Step 3 | 197,278 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Schedule a match › Stepper › Step 4 | 284,278 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Schedule a match › Date chip | 24,318 | W fill (342) · H hug (20) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| organisms/Sheet · Schedule a match › molecules/FormField · Area | 24,354 | W fill (342) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Sheet · Schedule a match › molecules/FormField · Venue | 24,434 | W fill (342) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Sheet · Schedule a match › Grounds | 24,514 | W fill (342) · H hug (254) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| organisms/Sheet · Schedule a match › Grounds › Option · Ground #1 (Centre Turf) | 24,542 | W fill (342) · H hug (82) | horizontal · main start · cross center | all `spacing/3` (12) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/primary` #18181b 2px; radius `radius/lg` (10) |
| organisms/Sheet · Schedule a match › Grounds › Option · Ground #2 (Practice Turf) | 24,632 | W fill (342) · H hug (64) | horizontal · main start · cross center | all `spacing/3` (12) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10) |
| organisms/Sheet · Schedule a match › Grounds › Option · Kovalam Beach Turf | 24,704 | W fill (342) · H hug (64) | horizontal · main start · cross center | all `spacing/3` (12) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10) |
| organisms/Sheet · Schedule a match › Sheet footer | 24,784 | W fill (342) · H hug (36) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=secondary | 1 | 87×20 | HUG |
| `atoms/Badge` | Variant=status-delivered | 2 | 80×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 166×36 | FILL |
| `atoms/Button` | Variant=outline, Size=default | 1 | 168×36 | FILL |
| `atoms/Label` | — | 3 | 31×20 | HUG |
| `atoms/RadioGroupItem` | Checked=false | 2 | 16×16 | FIXED |
| `atoms/RadioGroupItem` | Checked=true | 1 | 16×16 | FIXED |
| `atoms/Select` | State=filled | 2 | 342×36 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Schedule a match |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Step 2 of 4 · Hierarchical ground search |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 4 | Sat, 26 Sep 2026 |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 6 | 1. Date |
| `type/xs-semibold` | Geist | SemiBold | 12/16 | `color/foreground` | #09090b | 1 | 2. Ground |

**Container fill tokens used:** `color/background` #ffffff, `color/card` #ffffff, `color/muted` #f4f4f5, `color/primary` #18181b

### 5.6 M-3.3b Customer · Schedule Match (Sheet, step 4 Squad curation)

Figma: [22:2187](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=22-2187) · root W fixed 390 · H fixed 844 · root fill literal #000000 @ 50% · root layout vertical · main end · cross center · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Sheet · Curate Team Squad for this Match? | 0,288 | W fixed 390 · H hug (556) | vertical · main start · cross start | all `padding/sheet` (24) | `spacing/4` (16) | fill `color/background` #ffffff; radius `radius/xl` ([14, 14, 0, 0]); effect `shadow/lg` |
| organisms/Sheet · Curate Team Squad for this Match? › Handle row | 24,312 | W fill (342) · H hug (6) | horizontal · main center · cross center | all 0 | `spacing/0` (0) | — |
| organisms/Sheet · Curate Team Squad for this Match? › SheetHeader | 24,334 | W fill (342) · H hug (74) | vertical · main start · cross start | all 0 | `spacing/1-5` (6) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Stepper | 24,424 | W fill (342) · H hug (24) | horizontal · main start · cross center | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Stepper › Step 1 | 24,424 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Stepper › Step 2 | 111,424 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Stepper › Step 3 | 197,424 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Stepper › Step 4 | 284,424 | W fill (83) · H hug (24) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Count | 24,464 | W fill (342) · H hug (32) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Roster | 24,512 | W fill (342) · H hug (256) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Roster › Squad · Arun Kumar | 24,512 | W fill (342) · H hug (48) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Roster › Squad · Dinesh R | 24,564 | W fill (342) · H hug (48) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Roster › Squad · Karthik S | 24,616 | W fill (342) · H hug (48) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Roster › Squad · Vignesh P | 24,668 | W fill (342) · H hug (48) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Roster › Squad · Sanjay M | 24,720 | W fill (342) · H hug (48) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Curate Team Squad for this Match? › Sheet footer | 24,784 | W fill (342) · H hug (36) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Avatar` | Size=default | 5 | 32×32 | FIXED |
| `atoms/Badge` | Variant=secondary | 2 | 60×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 167×36 | FILL |
| `atoms/Button` | Variant=ghost, Size=default | 1 | 167×36 | FILL |
| `atoms/Button` | Variant=outline, Size=sm | 1 | 109×32 | HUG |
| `atoms/Checkbox` | Checked=false | 1 | 16×16 | FIXED |
| `atoms/Checkbox` | Checked=true | 4 | 16×16 | FIXED |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Curate Team Squad for this Match? |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Optional · Step 4 of 4 · Sat 26 Sep · 6: |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 5 | Arun Kumar |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | 11 of 14 selected |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 3 | 1. Date |
| `type/xs-semibold` | Geist | SemiBold | 12/16 | `color/foreground` | #09090b | 1 | 4. Squad |

**Container fill tokens used:** `color/background` #ffffff, `color/muted` #f4f4f5, `color/primary` #18181b

### 5.7 M-3.4/3.5 Customer · Match Menu & Cart (match switcher)

Figma: [20:1583](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=20-1583) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (637) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Match switcher | 17,74 | W fill (356) · H hug (56) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Content › Cutoff | 17,146 | W fill (356) · H hug (32) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/3` (12) · B `spacing/2` (8) · L `spacing/3` (12) | `spacing/2` (8) | fill `ib/status-preparing-subtle` #f5f3ff; radius `radius/md` (8) |
| Content › molecules/Tabs · TabsList | 17,194 | W fill (356) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Sticky action bar | 1,695 | W fill (388) · H hug (71) | horizontal · main space-between · cross center | all `spacing/4` (16) | `spacing/2` (8) (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |
| Sticky action bar › Cart | 17,712 | W hug (196) · H hug (38) | vertical · main start · cross start | all 0 | `spacing/0-5` (2) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "menu"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=default | 1 | 111×36 | HUG |
| `atoms/TabsTrigger` | Active=false | 4 | 59×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 1 | 34×28 | HUG |
| `molecules/MatchSwitcherPill` | Active=false | 1 | 174×56 | FILL |
| `molecules/MatchSwitcherPill` | Active=true | 1 | 174×56 | FILL |
| `molecules/MenuItemCard` | State=add | 1 | 356×128 | FILL |
| `molecules/MenuItemCard` | State=in-cart | 1 | 356×128 | FILL |
| `molecules/MenuItemCard` | State=sold-out | 1 | 356×126 | FILL |
| `organisms/BottomNav` | Active=menu | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | 22 items · ₹2,420 |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 1 | Sat 26 Sep · 6:30 AM · Marina Turf 1 |
| `type/xs-medium` | Geist | Medium | 12/16 | `ib/warning` | #bb4d00 | 1 | Pre-order closes Fri 25 Sep, 8:00 PM (in |

**Container fill tokens used:** `color/background` #ffffff, `color/muted` #f4f4f5, `ib/status-preparing-subtle` #f5f3ff

### 5.8 M-3.5b Customer · Player Item Assignment (Sheet)

Figma: [20:1729](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=20-1729) · root W fixed 390 · H fixed 844 · root fill literal #000000 @ 50% · root layout vertical · main end · cross center · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Sheet · Assign items to players | 0,262 | W fixed 390 · H hug (582) | vertical · main start · cross start | all `padding/sheet` (24) | `spacing/4` (16) | fill `color/background` #ffffff; radius `radius/xl` ([14, 14, 0, 0]); effect `shadow/lg` |
| organisms/Sheet · Assign items to players › Handle row | 24,286 | W fill (342) · H hug (6) | horizontal · main center · cross center | all 0 | `spacing/0` (0) | — |
| organisms/Sheet · Assign items to players › SheetHeader | 24,308 | W fill (342) · H hug (74) | vertical · main start · cross start | all 0 | `spacing/1-5` (6) | — |
| organisms/Sheet · Assign items to players › Quick | 24,398 | W fill (342) · H hug (32) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| organisms/Sheet · Assign items to players › List | 24,446 | W fill (342) · H hug (286) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| organisms/Sheet · Assign items to players › List › Assign · Arun Kumar | 24,446 | W fill (342) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Assign items to players › List › Assign · Dinesh R | 24,504 | W fill (342) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Assign items to players › List › Assign · Karthik S | 24,562 | W fill (342) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Assign items to players › List › Assign · Vignesh P | 24,620 | W fill (342) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Assign items to players › List › Assign · Sanjay M | 24,678 | W fill (342) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/Sheet · Assign items to players › Count | 24,748 | W fill (342) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| organisms/Sheet · Assign items to players › Sheet footer | 24,784 | W fill (342) · H hug (36) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Avatar` | Size=default | 5 | 32×32 | FIXED |
| `atoms/Button` | Variant=default, Size=default | 1 | 166×36 | FILL |
| `atoms/Button` | Variant=ghost, Size=sm | 1 | 60×32 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 168×36 | FILL |
| `atoms/Button` | Variant=secondary, Size=sm | 1 | 158×32 | HUG |
| `atoms/Checkbox` | Checked=false | 2 | 16×16 | FIXED |
| `atoms/Checkbox` | Checked=true | 3 | 16×16 | FIXED |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Assign items to players |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 2 | Cold-Pressed Watermelon Juice × 11 · opt |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 5 | Arun Kumar |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | 3 of 11 |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 5 | 1 × Watermelon Juice |

**Container fill tokens used:** `color/background` #ffffff, `color/muted` #f4f4f5

### 5.9 M-3.6 Customer · Squad Poll Tracker (Captain)

Figma: [20:1785](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=20-1785) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (708) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Heading | 17,74 | W fill (356) · H hug (72) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Share | 17,162 | W fill (356) · H hug (118) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Share › Link | 34,179 | W fill (322) · H hug (36) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Content › Card · Results | 17,296 | W fill (356) · H hug (186) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Results › Head | 34,313 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Results › Tally · Watermelon Juice | 34,345 | W fill (322) · H hug (32) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Results › Tally · Ragi Koozh | 34,389 | W fill (322) · H hug (32) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Results › Tally · Boiled Egg Duo | 34,433 | W fill (322) · H hug (32) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Players | 17,498 | W fill (356) · H hug (204) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/1` (4) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Players › Vote · Dinesh R | 34,515 | W fill (322) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| Content › Card · Players › Vote · Karthik S | 34,573 | W fill (322) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| Content › Card · Players › Vote · Vignesh P | 34,631 | W fill (322) · H hug (54) | horizontal · main start · cross center | T `spacing/2` (8) · R `spacing/0` (0) · B `spacing/2` (8) · L `spacing/0` (0) | `spacing/3` (12) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "orders"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Avatar` | Size=default | 3 | 32×32 | FIXED |
| `atoms/Badge` | Variant=outline | 1 | 64×22 | HUG |
| `atoms/Badge` | Variant=status-delivered | 2 | 50×20 | HUG |
| `atoms/Badge` | Variant=status-preparing | 1 | 47×20 | HUG |
| `atoms/Button` | Variant=default, Size=default | 1 | 322×36 | FILL |
| `atoms/Button` | Variant=default, Size=lg | 1 | 356×40 | FILL |
| `atoms/Button` | Variant=outline, Size=sm | 1 | 60×32 | HUG |
| `atoms/Input` | State=filled | 1 | 254×36 | FILL |
| `organisms/BottomNav` | Active=orders | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | Squad poll · Sat 26 Sep |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 3 | Watermelon Juice |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Players vote without login. Poll closes  |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 3 | Dinesh R |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | 8 of 14 voted |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 3 | Juice + Koozh |
| `type/xs-medium` | Geist | Medium | 12/16 | `color/muted-foreground` | #71717b | 3 | 6 votes |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5, `color/primary` #18181b

### 5.10 M-3.6b Customer · Player Poll Page (no login)

Figma: [20:1891](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=20-1891) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| Content | 1,1 | W fill (388) · H fill (842) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-lg` (24) | — |
| Content › Brand | 17,17 | W fill (356) · H hug (112) | vertical · main start · cross center | all 0 | `spacing/2` (8) | — |
| Content › Brand › Mark | 171,17 | W fixed 48 · H fixed 48 | horizontal · main center · cross center | all 0 | 0 | fill `ib/brand` #009966; radius `radius/lg` (10) |
| Content › Card · Poll | 17,153 | W fill (356) · H hug (546) | vertical · main start · cross start | all `spacing/6` (24) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Poll › Heading | 42,178 | W fill (306) · H hug (72) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Poll › molecules/FormField · Your name | 42,262 | W fill (306) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Content › Card · Poll › Choices | 42,338 | W fill (306) · H hug (240) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=lg | 1 | 306×40 | FILL |
| `atoms/Checkbox` | Checked=false | 2 | 16×16 | FIXED |
| `atoms/Checkbox` | Checked=true | 2 | 16×16 | FIXED |
| `atoms/Input` | State=filled | 1 | 306×36 | FILL |
| `atoms/Label` | — | 2 | 69×20 | HUG |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 2 | Innings Break |
| `type/large` | Geist | SemiBold | 18/28 | `color/primary-foreground` | #fafafa | 1 | IB |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 6 | Healthy match-day food, delivered to you |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 4 | Watermelon Juice |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 1 | No account needed. Your captain pays for |

**Container fill tokens used:** `color/card` #ffffff, `ib/brand` #009966

### 5.11 M-3.7 Customer · Order Summary & Checkout

Figma: [21:1793](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-1793) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (629) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Heading | 17,74 | W fill (356) · H hug (72) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · Items | 17,162 | W fill (356) · H hug (259) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/2` (8) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Items › Line · 11 × Watermelon Juice | 34,179 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Items › Line · 11 × Ragi Koozh | 34,207 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Items › Line · 11 × Banana bundle | 34,235 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Items › Line · 12 × Boiled Egg Duo | 34,263 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Items › Line · Subtotal | 34,300 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Items › Line · GST (5%) | 34,328 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Items › Wallet | 34,356 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Items › Line · To pay via UPI | 34,384 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Contacts | 17,437 | W fill (356) · H hug (198) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Contacts › Contact · Captain (primary) | 34,486 | W fill (322) · H hug (38) | horizontal · main start · cross center | all 0 | `spacing/3` (12) | — |
| Content › Card · Contacts › Contact · On-field contact | 34,536 | W fill (322) · H hug (38) | horizontal · main start · cross center | all 0 | `spacing/3` (12) | — |
| Sticky action bar | 1,687 | W fill (388) · H hug (79) | horizontal · main space-between · cross center | all `spacing/4` (16) | `spacing/2` (8) (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |
| Sticky action bar › Pay | 17,704 | W hug (95) · H hug (46) | vertical · main start · cross start | all 0 | `spacing/0-5` (2) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "menu"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Avatar` | Size=default | 2 | 32×32 | FIXED |
| `atoms/Button` | Variant=default, Size=lg | 1 | 131×40 | HUG |
| `atoms/Button` | Variant=link, Size=sm | 1 | 184×32 | HUG |
| `atoms/Separator` | Orientation=horizontal | 1 | 322×1 | FILL |
| `atoms/Switch` | Checked=true | 1 | 32×18 | FIXED |
| `organisms/BottomNav` | Active=menu | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | Order summary |
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | ₹1,742 |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 7 | ₹660 |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 7 | Sat 26 Sep · 6:30 AM Slot · Marina Crick |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 2 | Arun K · +91 98400 12345 |
| `type/sm-medium` | Geist | Medium | 14/20 | `ib/success` | #00a63e | 1 | − ₹500 |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 3 | To pay via UPI |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 2 | Captain (primary) |
| `type/xs` | Geist | Regular | 12/16 | `ib/success` | #00a63e | 1 | after ₹500 credit |

**Container fill tokens used:** `color/background` #ffffff, `color/card` #ffffff

### 5.12 M-3.8a Customer · Payment Confirmed

Figma: [21:1898](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-1898) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| Content | 1,1 | W fill (388) · H fill (842) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-lg` (24) | — |
| Content › Result | 17,17 | W fill (356) · H hug (216) | vertical · main start · cross center | T `spacing/12` (48) · R 0 · B 0 · L 0 | `spacing/4` (16) | — |
| Content › Result › Icon | 163,65 | W fixed 64 · H fixed 64 | horizontal · main center · cross center | all 0 | 0 | fill `ib/success-subtle` #f0fdf4; radius `radius/full` (9999) |
| Content › Card · Receipt | 17,257 | W fill (356) · H hug (166) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/2` (8) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Receipt › Line · Amount paid (UPI) | 34,274 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Receipt › Line · Team credit used | 34,302 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Receipt › Line · UPI ref | 34,330 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Receipt › Line · Match | 34,358 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Receipt › Line · Ground | 34,386 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=lg | 1 | 356×40 | FILL |
| `atoms/Button` | Variant=outline, Size=lg | 1 | 356×40 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Payment confirmed |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 3 | 4381 2290 7716 |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 5 | Order #IB-9281 is booked. The kitchen wi |
| `type/sm` | Geist | Regular | 14/20 | `ib/success` | #00a63e | 1 | ₹500 |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 2 | Amount paid (UPI) |

**Container fill tokens used:** `color/card` #ffffff, `ib/success-subtle` #f0fdf4

### 5.13 M-3.8b Customer · Payment Failed (retry)

Figma: [21:1927](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-1927) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| Content | 1,1 | W fill (388) · H fill (842) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-lg` (24) | — |
| Content › Result | 17,17 | W fill (356) · H hug (216) | vertical · main start · cross center | T `spacing/12` (48) · R 0 · B 0 · L 0 | `spacing/4` (16) | — |
| Content › Result › Icon | 163,65 | W fixed 64 · H fixed 64 | horizontal · main center · cross center | all 0 | 0 | fill `ib/destructive-subtle` #fef2f2; radius `radius/full` (9999) |
| Content › Card · Receipt | 17,257 | W fill (356) · H hug (188) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/2` (8) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Receipt › Line · Order | 34,274 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Receipt › Line · Amount due | 34,302 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Receipt › Line · Cutoff | 34,330 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=lg | 1 | 356×40 | FILL |
| `atoms/Button` | Variant=outline, Size=lg | 1 | 356×40 | FILL |
| `molecules/Alert` | Variant=destructive | 1 | 322×70 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h3` | Geist | SemiBold | 24/32 | `color/foreground` | #09090b | 1 | Payment failed |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 2 | #IB-9281 (unpaid draft) |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 3 | UPI request expired or was declined. No  |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 2 | Amount due |

**Container fill tokens used:** `color/card` #ffffff, `ib/destructive-subtle` #fef2f2

### 5.14 M-3.9 Customer · My Orders (Active / Past, textual status)

Figma: [21:1959](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-1959) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (708) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Head | 17,74 | W fill (356) · H hug (32) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › molecules/Tabs · TabsList | 17,122 | W fill (356) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Content › Card · Active order | 17,170 | W fill (356) · H hug (290) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Active order › Top | 34,187 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Active order › Timeline | 34,247 | W fill (322) · H hug (152) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| Content › Card · Active order › Actions | 34,411 | W fill (322) · H hug (32) | horizontal · main start · cross center | all 0 | `spacing/2` (8) | — |
| Content › Card · Order #IB-9420 | 17,476 | W fill (356) · H hug (106) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/2` (8) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Order #IB-9420 › Top | 34,493 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "orders"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=status-new | 1 | 142×20 | HUG |
| `atoms/Badge` | Variant=status-transit | 1 | 68×20 | HUG |
| `atoms/Button` | Variant=ghost, Size=sm | 1 | 128×32 | HUG |
| `atoms/Button` | Variant=outline, Size=sm | 3 | 97×32 | HUG |
| `atoms/TabsTrigger` | Active=false | 1 | 66×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 1 | 78×28 | HUG |
| `organisms/BottomNav` | Active=orders | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | My orders |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 1 | Kitchen accepts by Sat 6:00 PM. |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Delivered |
| `type/sm-medium` | Geist | Medium | 14/20 | `color/foreground` | #09090b | 4 | Paid |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 2 | #IB-9281 |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 7 | Sat 26 Sep · 6:30 AM · Marina Turf 1 |

**Container fill tokens used:** `color/card` #ffffff, `color/muted` #f4f4f5

### 5.15 M-3.10a Customer · Rainout Cancel (Dialog, ≥ 1.5 h)

Figma: [21:2138](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-2138) · root W fixed 390 · H fixed 844 · root fill literal #000000 @ 50% · root layout vertical · main center · cross center · padding all 0 · gap 0

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Dialog · Cancel match for rainout? | 16,219 | W fixed 358 · H hug (406) | vertical · main start · cross start | all `padding/dialog` (24) | `spacing/4` (16) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/lg` (10); effect `shadow/lg` |
| organisms/Dialog · Cancel match for rainout? › DialogHeader | 41,244 | W fill (308) · H hug (76) | vertical · main start · cross start | all 0 | `spacing/2` (8) | — |
| organisms/Dialog · Cancel match for rainout? › Info | 41,336 | W fill (308) · H hug (84) | horizontal · main start · cross center | all `spacing/3` (12) | `spacing/3` (12) | fill `ib/success-subtle` #f0fdf4; radius `radius/md` (8) |
| organisms/Dialog · Cancel match for rainout? › molecules/FormField · Reason | 41,436 | W fill (308) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/Dialog · Cancel match for rainout? › DialogFooter | 41,564 | W fill (308) · H hug (36) | horizontal · main end · cross center | all 0 | `spacing/2` (8) | — |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=destructive, Size=default | 1 | 208×36 | HUG |
| `atoms/Button` | Variant=outline, Size=default | 1 | 106×36 | HUG |
| `atoms/Label` | — | 1 | 50×20 | HUG |
| `atoms/Select` | State=filled | 1 | 308×36 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/large` | Geist | SemiBold | 18/28 | `color/foreground` | #09090b | 1 | Cancel match for rainout? |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Sat 26 Sep · 6:30 AM · Marina Turf 1 · O |
| `type/sm` | Geist | Regular | 14/20 | `ib/success` | #00a63e | 1 | You are cancelling 4 h 10 min before the |
| `type/xs` | Geist | Regular | 12/16 | `color/muted-foreground` | #71717b | 1 | Credits never expire in MVP and auto-app |

**Container fill tokens used:** `color/background` #ffffff, `ib/success-subtle` #f0fdf4

### 5.16 M-3.10b Customer · Late Cancel Blocked (< 1.5 h)

Figma: [21:2163](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-2163) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (708) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Head | 17,74 | W fill (356) · H hug (28) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Cutoffs | 17,280 | W fill (356) · H hug (138) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/2` (8) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · Cutoffs › Line · 6:30 AM slot | 34,325 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Cutoffs › Line · 10:30 AM slot | 34,353 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| Content › Card · Cutoffs › Line · 2:30 PM slot | 34,381 | W fill (322) · H hug (20) | horizontal · main space-between · cross center | all 0 | `spacing/2` (8) (auto: SPACE_BETWEEN) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "orders"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Badge` | Variant=status-preparing | 1 | 71×20 | HUG |
| `atoms/Button` | Variant=default, Size=lg | 1 | 356×40 | FILL |
| `atoms/Button` | Variant=outline, Size=lg | 1 | 356×40 | FILL |
| `molecules/Alert` | Variant=destructive | 1 | 356×110 | FILL |
| `organisms/BottomNav` | Active=orders | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | Order #IB-9279 |
| `type/sm` | Geist | Regular | 14/20 | `color/foreground` | #09090b | 3 | until 5:00 AM |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 4 | Sat 26 Sep · 6:30 AM · YMCA Ground 2 |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | Rainout cancellation cutoffs |

**Container fill tokens used:** `color/card` #ffffff

### 5.17 M-3.11 Customer · Help & Support

Figma: [21:2236](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-2236) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (708) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Heading | 17,74 | W fill (356) · H hug (72) | vertical · main start · cross start | all 0 | `spacing/1` (4) | — |
| Content › Card · New ticket | 17,162 | W fill (356) · H hug (342) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/3` (12) | fill `color/card` #ffffff; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › Card · New ticket › molecules/FormField · Order | 34,179 | W fill (322) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Content › Card · New ticket › molecules/FormField · Issue type | 34,255 | W fill (322) · H hug (64) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| Content › Card · New ticket › molecules/FormField · Describe the problem | 34,331 | W fill (322) · H hug (108) | vertical · main start · cross start | all 0 | `gap/stack-sm` (8) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "profile"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/Button` | Variant=default, Size=default | 1 | 322×36 | FILL |
| `atoms/Label` | — | 3 | 38×20 | HUG |
| `atoms/Select` | State=filled | 2 | 322×36 | FILL |
| `atoms/Textarea` | — | 1 | 322×80 | FILL |
| `molecules/TicketCard` | — | 1 | 356×196 | FILL |
| `organisms/BottomNav` | Active=profile | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h4` | Geist | SemiBold | 20/28 | `color/foreground` | #09090b | 1 | Help & Support |
| `type/sm` | Geist | Regular | 14/20 | `color/muted-foreground` | #71717b | 1 | Raise an issue on a recent order. Resolu |
| `type/sm-semibold` | Geist | SemiBold | 14/20 | `color/foreground` | #09090b | 1 | Your tickets |

**Container fill tokens used:** `color/card` #ffffff

### 5.18 M-3.12 Customer · Team Credits (Wallet ledger)

Figma: [21:2320](https://www.figma.com/design/2NZ7jzWZKmjEmfE7yKHuPj?node-id=21-2320) · root W fixed 390 · H fixed 844 · root fill `color/background` #ffffff · root layout vertical · main start · cross start · padding all 0 · gap `spacing/0` (0)

**Layout regions** (auto-layout containers — console depth ≤ 5, mobile depth ≤ 3; ordered top→bottom, left→right; path uses › ):

| Region (path) | x,y | Size | Layout | Padding | Gap | Fill · stroke · radius |
|---|---|---|---|---|---|---|
| organisms/Header (Mobile) → `organisms/Header (Mobile)` {} | 1,1 | W fill (388) · H hug (57) | horizontal · main space-between · cross center | all `padding/header` (10) | 0 (auto: SPACE_BETWEEN) | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 0/0/1/0px |
| Content | 1,58 | W fill (388) · H fill (708) | vertical · main start · cross start | all `padding/page-mobile` (16) | `gap/stack-md` (16) | — |
| Content › Card · Balance | 17,74 | W fill (356) · H hug (114) | vertical · main start · cross start | all `spacing/4` (16) | `spacing/1` (4) | fill `color/primary` #18181b; stroke `color/border` #e4e4e7 1px; radius `radius/xl` (14) |
| Content › molecules/Tabs · TabsList | 17,204 | W fill (356) · H hug (32) | horizontal · main start · cross center | all `spacing/0-5` (2) | `spacing/0` (0) | fill `color/muted` #f4f4f5; radius `radius/lg` (10) |
| Content › Ledger | 17,252 | W fill (356) · H hug (388) | vertical · main start · cross start | all 0 | `spacing/0` (0) | — |
| organisms/BottomNav → `organisms/BottomNav` {"Active": "profile"} | 1,766 | W fill (388) · H hug (77) | horizontal · main start · cross start | T `spacing/2` (8) · R `spacing/2` (8) · B `spacing/5` (20) · L `spacing/2` (8) | 0 | fill `color/background` #ffffff; stroke `color/border` #e4e4e7 T/R/B/L 1/0/0/0px |

**Component instances** (shadcn / IB component + variant, count, measured size, horizontal sizing):

| Component | Variant | Count | Size (measured) | W sizing |
|---|---|---|---|---|
| `atoms/TabsTrigger` | Active=false | 2 | 64×28 | HUG |
| `atoms/TabsTrigger` | Active=true | 1 | 34×28 | HUG |
| `molecules/LedgerRow` | Type=credit | 2 | 356×97 | FILL |
| `molecules/LedgerRow` | Type=debit | 2 | 356×97 | FILL |
| `organisms/BottomNav` | Active=profile | 1 | 388×77 | FILL |
| `organisms/Header (Mobile)` | — | 1 | 388×57 | FILL |

**Typography used directly in this frame** (outside component instances):

| Style | Family | Weight | Size/LH | Colour token | Hex | Count | Example |
|---|---|---|---|---|---|---|---|
| `type/h2` | Geist | SemiBold | 30/36 | `color/primary-foreground` | #fafafa | 1 | ₹1,700 |
| `type/sm` | Geist | Regular | 14/20 | `color/primary-foreground` | #fafafa | 1 | Team Credits balance |
| `type/xs` | Geist | Regular | 12/16 | `color/primary-foreground` | #fafafa | 1 | Auto-applies at checkout · never expires |

**Container fill tokens used:** `color/muted` #f4f4f5, `color/primary` #18181b

## 6. Known deviations (as built in Figma)

| Item | As built | Intended | Action for implementation |
|---|---|---|---|
| Textarea filled value colour | `color/muted-foreground` | `color/foreground` | Use `text-foreground` for entered text; placeholder stays muted |
| Calendar week-row gap | 16 (`spacing/4`) | shadcn default 8 (`spacing/2`) | Use shadcn Calendar default spacing |
| shadcn Theme Dark mode | not authored | shadcn Zinc dark | Out of scope unless requested |
| Mobile frames scroll | content clips at 844 (Content `clipsContent`) | scrollable content area | Make Content `overflow-y-auto` between header and bottom bar/nav |

