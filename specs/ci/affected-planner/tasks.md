# T07 tasks

Spec: [spec.md](file:///workspace/specs/ci/affected-planner/spec.md). Issue: [#70](https://github.com/yogeshkumarasamy/workspace/issues/70).

- [x] `deploy/targets.json` lists portfolio, ib-console, ib, yt-scheduler, and both Innings Break APIs, including dist paths and which API each UI uses. No `yt-scheduler-api` entry.
- [x] `deploy/plan.mjs` plans test, build, and deploy from changed files and from `turbo query affected` JSON.
- [x] Previews only for PRs whose base is `main`, on `dev.yogeshkumarasamy.in`, at `/previews/<slug>/pr-<N>/`.
- [x] Unit tests cover matrix rows 1–7, the shared D1 rule, and the `force-all` label.
- [x] Push base is the last successful GitHub Deployment `<env>/<target>`, so a failed deploy is retried.
- [x] Dry-run output exposes `matrix.include` equal to the `plan.json` array. No workflow file is changed.
- [x] `pnpm exec node --test deploy/plan.test.mjs` passes (23 tests, 0 failures).
