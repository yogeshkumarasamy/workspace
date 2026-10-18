# T07 · Deploy targets and UI–API planner

> **Status**: Approved for implementation by [issue #70](https://github.com/yogeshkumarasamy/workspace/issues/70) (epic [#67](https://github.com/yogeshkumarasamy/workspace/issues/67), plan [#93](https://github.com/yogeshkumarasamy/workspace/issues/93) §4.2 and §5.1–§5.2).
> **Tasks**: [tasks.md](file:///workspace/specs/ci/affected-planner/tasks.md)

## Problem

Nothing in the repo declares which UI talks to which API, or where a target deploys. Workflows hard-code `@apps/portfolio`. CI needs one planner that turns "what changed" into the list of targets to test, build, and deploy, plus the API URL each UI must use.

## Non-goals

- Wiring the planner into `.github/workflows` (T06, T12, T14).
- Editing `turbo.json` or the root `package.json` (T05, PR #97, owns those).
- Adding the `yt-scheduler-api` target. Option A (Workers) is chosen for that API (issue #89); the Worker package lands in a later ticket. The UI entry still names `api: "yt-scheduler-api"` so a UI-only change can point at the dev API.
- Stacked pull requests. Previews exist only when the PR base is `main`.
- Running `oasdiff` or applying D1 migrations. The planner only flags `contractCheck` and `freshDb`.

## Manifest

[deploy/targets.json](file:///workspace/deploy/targets.json) is the source of truth for package name, kind, dist directory, slug, routing, and which API a UI calls. The Turborepo graph decides what is affected. The manifest decides where it deploys.

Innings Break console and customer Workers share `d1: "ib"`. If either of those Workers is in a preview plan, both Workers and both UIs are planned, and both Workers receive the same preview database `ib-pr-<N>`.

## Inputs

[deploy/plan.mjs](file:///workspace/deploy/plan.mjs) accepts:

| Input | Use |
|---|---|
| Event, ref, PR base ref, PR number, head sha | Choose `preview`, `dev`, `staging`, or `production`. |
| Changed files | Specs, docs, `*.md`, `.github/**`, and `deploy/**` deploy nothing by themselves. Other files map onto a target by its package root. Migration, OpenAPI, and JSON Schema paths, plus `packages/innings-break-contract/**`, mark a schema change. |
| `turbo query affected --tasks build --base <sha>` JSON | Packages and tasks the graph says must build. Dependency reasons become `dependent`. |
| Last successful GitHub Deployment `<env>/<target>` | Push base per target. A failed deployment is skipped. Fallback is `HEAD~1`. |
| Label `force-all` or a dispatch `forceAll` input | Plan every manifest target even if the diff is otherwise ignored. |

Base selection:

- Pull request into `main`: one base, `merge-base(origin/main, HEAD)`.
- Pull request into any other branch: no preview. The plan is empty.
- Push to `main`, `release/staging`, or `release/production`: each target uses the sha of the last **successful** Deployment named `<env>/<target>`.

`yt-scheduler-api` is not a manifest target, so it is never deployed by this planner. The static `yt-scheduler` UI is. Its screens read `apiBaseUrl` from `app-config.json` at runtime.

## Decision matrix (previews on dev)

Previews are served from `dev.yogeshkumarasamy.in` at `/previews/<slug>/pr-<N>/`. Push deploys use `/<slug>/` on that environment's host and do **not** auto-rebuild a paired UI: the UI artifact is configured at deploy time.

| # | Situation | UI | API | UI `apiBaseUrl` |
|---|---|---|---|---|
| 1 | UI changed, API not changed | build + deploy | none | latest **dev** API |
| 2 | API code only | auto-rebuild (`paired-api`) | deploy | **PR** preview API |
| 3 | API plus contract, schema, or migrations | auto-rebuild | deploy + `freshDb` | **PR** preview API, `contractCheck` |
| 4 | UI and API both changed | build (`affected`) | deploy | **PR** preview API |
| 5 | Contract package only | build | deploy | **PR** preview API, `contractCheck` |
| 6 | Shared lib | every dependent UI the graph reports | none | dev API |
| 7 | Specs, docs, or other non-deploy paths only | none | none | — |

`force-all` plans every manifest entry with reason `force-all`.

Push plans do not add `paired-api` or `shared-d1` rows. They still record each target's own deployment base so a failed deploy is inside the next successful range.

## Plan entry

`plan.json` is an array, one object per deploy, APIs before UIs:

```json
{
  "target": "ib-console",
  "kind": "static",
  "env": "preview",
  "base": "<sha>",
  "path": "/previews/ib-console/pr-42/",
  "apiBaseUrl": "https://ib-console-api-pr-42.acct.workers.dev",
  "reason": "paired-api",
  "host": "dev.yogeshkumarasamy.in",
  "d1": null,
  "freshDb": false,
  "schemaChanged": true,
  "contractCheck": true
}
```

- Static `path` is the site path. Worker `path` is the Worker name (`ib-console-api-pr-42`, `ib-console-api-dev`, `ib-console-api-staging`, or `ib-console-api` in production).
- Production Worker hostnames and script names have no environment suffix. Preview and dev/staging do.
- Production D1 is `ib-prod`. Preview D1 is `ib-pr-<N>`. Dev and staging are `ib-dev` and `ib-staging`.
- `apiBaseUrl` is `null` for Workers and for portfolio.
- A UI whose API target is not in the plan (including `yt-scheduler` until E5) uses `https://<api>-dev.<acct>.workers.dev` on preview, and the environment API on a push.
- `<acct>` comes from `WORKERS_SUBDOMAIN` (default `acct`, the placeholder in the plan).

`--dry-run` prints a report whose `matrix` field is `{ "include": <plan.json> }`, which is the object a later workflow assigns to `strategy.matrix`. `test` lists packages that actually changed (plus shared libraries and contracts). `build` lists every package the deploy plan must produce, including paired UIs and the unchanged Innings Break Worker.

## Reasons

| `reason` | Meaning |
|---|---|
| `affected` | This target's own files changed. |
| `dependent` | A dependency or the declared contract package changed. |
| `paired-api` | UI rebuilt because its API is in the preview plan. |
| `shared-d1` | The other Innings Break Worker shares D1 `ib`, so this side ships with it. |
| `force-all` | Label or dispatch input. |
