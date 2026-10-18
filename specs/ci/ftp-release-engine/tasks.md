# T09 tasks

Spec: [spec.md](file:///workspace/specs/ci/ftp-release-engine/spec.md). Issue: [#73](https://github.com/yogeshkumarasamy/workspace/issues/73).

- [x] `deploy/ftp-release.mjs` uploads to `releases/<sha>.partial`, renames that folder onto `releases/<sha>`, and switches traffic by renaming one router `.htaccess`.
- [x] Release `.htaccess` is rendered from the T10 template path. Lines containing `__PREVIOUS__` are dropped when there is no previous release. `.release.json` and `app-config.json` are written into every release.
- [x] An older SHA cannot switch the router (`git merge-base --is-ancestor`, fail closed when the live SHA is unknown). The job result is `superseded`.
- [x] Smoke failure switches the router back to the previous SHA and exits non-zero. The newest 5 releases remain, and the live and previous SHAs are not pruned.
- [x] `.github/workflows/deploy-static.yml` is a new `workflow_call` workflow with concurrency `deploy-<env>-<target>`, `cancel-in-progress: false`, and `timeout-minutes: 15`. Existing deploy workflows are untouched, and the new workflow does not use `FTP-Deploy-Action`.
- [x] `node --test deploy/ftp-release.test.mjs` passes, including a local pure-ftpd run (13 tests, 0 failures). `actionlint` reports no issues for the new workflow.

Verification:

- `node --test deploy/ftp-release.test.mjs` — 13 passed, 0 failed. The pure-ftpd case published six SHAs, pruned the oldest, kept the previous release's files unmodified, served an old `assets/*.js` through the release fallback chain, refused to switch an older SHA, rolled the router back when smoke returned HTTP 500, and switched another slug with `rm` + `mv`.
- `actionlint .github/workflows/deploy-static.yml` — exit 0, no findings.
