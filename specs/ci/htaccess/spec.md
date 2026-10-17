# T10 · .htaccess templates and robots.txt

> **Status**: Approved for implementation by [issue #74](https://github.com/yogeshkumarasamy/workspace/issues/74) (epic [#71](https://github.com/yogeshkumarasamy/workspace/issues/71), plan [#93](https://github.com/yogeshkumarasamy/workspace/issues/93) §7).
> **Tasks**: [tasks.md](file:///workspace/specs/ci/htaccess/tasks.md)

## Problem

Hostinger Single serves `dev.yogeshkumarasamy.in`, `staging.yogeshkumarasamy.in`, and `yogeshkumarasamy.in` with LiteSpeed and FTP only. Each app goes live by uploading `releases/<sha>/` and replacing one router `.htaccess`. Those files have to send deep links to `index.html`, 404 a missing hashed chunk, cache the shell and the chunks differently, and keep dev, staging, and previews out of the index.

## Non-goals

- Uploading anything, or opening an FTP session. T08 probes the live server. T09 and T12 perform the switch.
- Editing `.github/workflows`, `package.json`, or `turbo.json`. Those files belong to the open CI tickets.
- Moving portfolio canonical, Open Graph, and sitemap URLs (T13). This ticket only reserves the host-root redirect and the production sitemap line.
- Switching the apex `/` redirect from 302 to 301. That happens in T13 after the redirect has been verified. The template stays `R=302`.
- Choosing yt-scheduler option A or B (plan Q1). The PHP front-controller rule and the `Require all denied` block ship in the template and are rendered only when the caller passes `phpApi: true`.

## Files

| File | Rendered to |
|---|---|
| [root.htaccess.tpl](file:///workspace/deploy/htaccess/root.htaccess.tpl) | `<docroot>/.htaccess` on each host |
| [router.htaccess.tpl](file:///workspace/deploy/htaccess/router.htaccess.tpl) | `<slug>/.htaccess`, replaced on every switch |
| [release.htaccess.tpl](file:///workspace/deploy/htaccess/release.htaccess.tpl) | `<slug>/releases/<sha>/.htaccess`, immutable inside the release |
| [previews.htaccess.tpl](file:///workspace/deploy/htaccess/previews.htaccess.tpl) | `previews/.htaccess` on the dev host only |
| [robots.production.txt](file:///workspace/deploy/htaccess/robots.production.txt) | `robots.txt` on `yogeshkumarasamy.in` |
| [robots.dev.txt](file:///workspace/deploy/htaccess/robots.dev.txt) | `robots.txt` on `dev.yogeshkumarasamy.in` |
| [robots.staging.txt](file:///workspace/deploy/htaccess/robots.staging.txt) | `robots.txt` on `staging.yogeshkumarasamy.in` |

[deploy/htaccess.mjs](file:///workspace/deploy/htaccess.mjs) reads those files. Slugs are `portfolio`, `ib-console`, `ib`, and `yt-scheduler`. A base is `/<slug>/` or `/previews/<slug>/pr-<N>/` with a trailing slash and a positive PR number.

## What CI substitutes

The published snippets are the template bodies. Rendering changes only the placeholders and the three omissions below. Comments stay on their own lines. Directives stay in the LiteSpeed subset: `RewriteRule`, `RewriteCond`, `FilesMatch`, `Header set` / `Header always set`, and `AddType`, plus the `Options`, `DirectoryIndex`, `RewriteEngine`, `RewriteBase`, `IfModule`, and `Require` lines from the plan. There is no `<If>`, no `expr`, and no `Header edit`.

| Placeholder | Meaning |
|---|---|
| `__BASE__` | App or preview base, including the trailing slash. |
| `__CURRENT__` | Live sha written into the router. |
| `__SHA__` | This release's sha. |
| `__PREVIOUS__` | Previous live sha. The asset fallback line is omitted when there is no previous release. |
| `__API_ORIGINS__` | Space-separated `https` Worker origins for this environment, inserted into `connect-src`. An empty list leaves `connect-src 'self'`. |

Host differences inside the one root template:

- `X-Robots-Tag: noindex, nofollow` is kept for dev and staging and omitted for production.
- `/dev/` and `/staging/` return 404 only when the host is `yogeshkumarasamy.in`, so the nested subdomain folders cannot leak through the apex.
- `/previews` returns 404 unless the host is `dev.yogeshkumarasamy.in`.
- `www.yogeshkumarasamy.in` redirects to the apex. The same rule is a no-op on the other hosts.
- HTTP redirects to HTTPS with 301 unless `X-Forwarded-Proto` is already `https`.
- `/` redirects to `/portfolio/` with 302. The `Location` has no fragment, so the browser keeps a `#hash` route across the redirect.
- Worker origins are supplied by the deploy job. Dev uses `ib-console-api-dev.<acct>.workers.dev` and `ib-customer-api-dev.<acct>.workers.dev`. Staging uses the `-staging` names. Production uses the unsuffixed Worker names. `yt-scheduler-api` is not added until Q1 is decided. Same-origin option B is already covered by `'self'`.

A sha is 7–40 hex characters. The previous sha must differ from the release sha. An API origin that is not `https`, or that contains a quote, space, or semicolon, is rejected.

## robots.txt

Production allows `/` and publishes `Sitemap: https://yogeshkumarasamy.in/portfolio/sitemap.xml`. Dev and staging are `Disallow: /`. Previews add `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: no-store` from `previews/.htaccess`, including on a 404 for `/previews/` and `/previews/<app>/`.

## Request behaviour the rules encode

Checked by [deploy/htaccess.test.mjs](file:///workspace/deploy/htaccess.test.mjs) through a per-directory model of this directive subset ([deploy/htaccess-sim.mjs](file:///workspace/deploy/htaccess-sim.mjs)). The model is not a substitute for the T08 LiteSpeed probe.

- A history-routed path such as `/ib-console/team/42` is rewritten to the live release and answered with `index.html` (200, `text/html`). Portfolio's hash router never needs that fallback; the same rule is harmless for `/portfolio/about`.
- A missing `.js` (and the other static extensions in the release rule) is 404 with an empty body. It is not `index.html`.
- `index.html`, `app-config.json`, `.release.json`, `sw.js`, `registerSW.js`, and `manifest.webmanifest` are `Cache-Control: no-cache, must-revalidate`. A Vite name with an 8-character hash is `public, max-age=31536000, immutable`.
- `sw.js` sends `Service-Worker-Allowed` equal to `__BASE__`.
- A hashed file the current release does not have is looked up in the previous release, which chains while that release is still on disk. A pruned release stops at the router `^releases/` pass-through and returns 404.
- Dev and staging responses, including 404s, send `X-Robots-Tag` containing `noindex`. Production responses do not. A preview URL on dev also sends `noarchive`. The same preview URL on staging or production is 404 from the root rule, so the preview header is never reached.
- Security headers from the root template are present. CSP is `Content-Security-Policy-Report-Only` only.

Option B, when `phpApi` is set, rewrites `/api/` to `api/index.php` and answers an existing `.sql`, `.lock`, `.neon`, `.dist`, or `.md` file with 403. The default render used for portfolio, Innings Break, and option A omits both of those blocks.

## Verify

```bash
pnpm exec node --test deploy/htaccess.test.mjs
node deploy/htaccess.mjs check
```

`check` lints the templates and renders one sample of each file. It does not contact a host.
