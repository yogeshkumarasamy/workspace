# T10 tasks

Spec: [spec.md](file:///workspace/specs/ci/htaccess/spec.md). Issue: [#74](https://github.com/yogeshkumarasamy/workspace/issues/74).

- [x] `deploy/htaccess/` holds the root, router, release, and previews templates plus `robots.dev.txt`, `robots.staging.txt`, and `robots.production.txt`.
- [x] `deploy/htaccess.mjs` renders `__BASE__`, `__CURRENT__`, `__SHA__`, `__PREVIOUS__`, and `__API_ORIGINS__`, omits the production `X-Robots-Tag`, omits the previous-asset rule on the first release, and omits Option B rules unless `phpApi` is set.
- [x] Rendered files pass the LiteSpeed lint (no trailing comments, no `<If>`, no `Header edit`).
- [x] Tests cover deep links versus a missing `.js`, cache headers, apex `/dev/` and `/staging/` 404s, `/previews` 404 off dev, `noindex` on dev/staging/previews only, HTTPS and `www` redirects, and report-only CSP.
- [x] No workflow, live host, `package.json`, or `turbo.json` change.
- [x] `pnpm exec node --test deploy/htaccess.test.mjs` passes (13 tests, 0 failures). `node deploy/htaccess.mjs check` prints `ok`.
