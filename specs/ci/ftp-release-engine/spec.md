# T09 · FTP release engine

> **Status**: Approved for implementation by [issue #73](https://github.com/yogeshkumarasamy/workspace/issues/73) (epic [#71](https://github.com/yogeshkumarasamy/workspace/issues/71), plan [#93](https://github.com/yogeshkumarasamy/workspace/issues/93) §6.1–§6.3).
> **Tasks**: [tasks.md](file:///workspace/specs/ci/ftp-release-engine/tasks.md)

## Problem

`FTP-Deploy-Action` uploads file by file into the live folder and trusts `.ftp-deploy-sync-state.json`. Overlapping runs mix files, a failed run leaves a half-updated site, and an open tab 404s when the next build deletes a chunk.

Hostinger Single has FTP only (no SSH, SFTP, rsync, or symlinks) and one FTP account. The web server is LiteSpeed. A deploy must upload a finished tree and then switch by renaming one small file.

## Non-goals

- Editing the existing deploy or preview workflows. [T12 (#76)](https://github.com/yogeshkumarasamy/workspace/issues/76) is what calls this workflow. Those files are already changing in other pull requests.
- `deploy/targets.json` and `deploy/plan.mjs`. Those belong to [T07 (#70)](https://github.com/yogeshkumarasamy/workspace/issues/70) / [PR #100](https://github.com/yogeshkumarasamy/workspace/pull/100). This engine consumes the same slug and site path (`plan.path`), and does not add another manifest.
- The `.htaccess` template files. Those belong to [T10 (#74)](https://github.com/yogeshkumarasamy/workspace/issues/74) under `deploy/htaccess/`. This engine renders them. It does not add copies.
- `rollback.yml` and the full smoke matrix. Those belong to [T11 (#75)](https://github.com/yogeshkumarasamy/workspace/issues/75). This engine still smoke-checks the release it just switched to, and switches back when that check fails.
- API / Worker deploys, preview cleanup, and root `robots.txt`.
- Connecting to the real Hostinger account from tests or from a developer machine. The workflow may connect only when GitHub Actions runs it with `FTP_ALLOW_REMOTE=1`.

## What lands

| File | Role |
|---|---|
| [deploy/ftp-release.mjs](file:///workspace/deploy/ftp-release.mjs) | Release engine. Render, upload, switch, guard, smoke, rollback, prune. |
| [.github/workflows/deploy-static.yml](file:///workspace/.github/workflows/deploy-static.yml) | Reusable `workflow_call` wrapper. No matrix of its own. |
| [deploy/ftp-release.test.mjs](file:///workspace/deploy/ftp-release.test.mjs) | Unit tests plus a local pure-ftpd run. |

Caller (T12) inputs match [issue #73](https://github.com/yogeshkumarasamy/workspace/issues/73): `env`, `target`, `slug_dir`, `base`, `sha`, `artifact`, plus optional `api_base_url`.

`base` here is the **site path** (`/portfolio/` or `/preview/portfolio/pr-42/`). `/previews/...` is still accepted. In [deploy/plan.mjs](file:///workspace/deploy/plan.mjs) the field named `base` is a git SHA. T12 must pass `plan.path` as this `base`, and the path with slashes stripped as `slug_dir`. The script rejects a pair that is not `base === "/" + slug_dir + "/"`.

## Layout

Unchanged from plan §6.1. For one app:

```
<env docroot>/<slug_dir>/
  .htaccess                         router, the only file the switch replaces
  releases/
    <sha>/                          full dist + release .htaccess + .release.json + app-config.json
    <sha>.partial/                  upload in progress; never linked by the router
```

`slug_dir` is `<slug>` or `preview/<slug>/pr-<N>` (`previews/` is still accepted). Preview deploys use the dev docroot and the dev host. The script refuses any other shape, including `..`.

## Publish sequence

One `lftp` process stays open for the whole publish and runs the plan's commands (`mkdir`, `mirror -R --parallel=2`, `mv`, `put`, `rm`). Opening a new login for every command is a poor fit for the single Hostinger FTP account.

1. Read `<slug_dir>/.htaccess` and the release `.release.json` it points at. That SHA is `PREV` (empty on the first deploy).
2. Render the T10 release template into `dist/.htaccess`. Write `dist/.release.json` (`sha`, `target`, `builtAt`) and `dist/app-config.json` (`env`, `apiBaseUrl`, `sha`).
3. If `releases/<sha>/.release.json` already records this SHA and target, leave that folder untouched (a retry or a superseded rerun must not rewrite a release that is already in the old-tab chain). Otherwise delete `<slug>/releases/<sha>.partial` when one is left over, mirror `dist/` into a new partial (`lftp mirror -R --parallel=2`), delete that SHA's folder only when it exists without a matching `.release.json`, then `mv` the partial to `<sha>`. The destination name does not exist for a new SHA, so the finished tree appears in one `RNFR`/`RNTO`. Directory rename-over is not used.
4. Read the live SHA again. If it changed while the upload ran, rewrite only that release's `.htaccess` so the asset fallback points at the SHA that is live now.
5. **Stale-run guard.** `git merge-base --is-ancestor <live> <sha>`. An empty live SHA may switch. The same SHA may switch. Anything else, including a live SHA this checkout cannot see, skips the switch and finishes as `superseded` (exit 0, warning annotation). No prune on that path.
6. Render the router template and `put` it to `<slug_dir>/.htaccess.new`, then rename it onto `<slug_dir>/.htaccess`.
7. Smoke: `GET <origin><base>.release.json` must report this SHA, `index.html` must be 200, and the first `assets/*.js` it references must be 200 with a JavaScript content type. Default 5 attempts, 6 seconds apart. On failure, render the router with `CURRENT` set back to `PREV` and switch again (`rolled-back`, exit 1). The first deploy has no `PREV`; the job fails and leaves the new router in place.
8. After a successful smoke, prune. Keep the newest 5 releases by `.release.json` `builtAt`, and always keep the live SHA and `PREV` even when they are older than those five. Delete leftover `*.partial` directories. Never delete any other name.

## Templates

T10 owns the bytes. This engine only substitutes tokens:

| Token | Meaning |
|---|---|
| `__BASE__` | Site base, always starts and ends with `/` |
| `__SHA__` | This release |
| `__CURRENT__` | SHA the router sends traffic to |
| `__PREVIOUS__` | Previous release. Every line that still contains this token is dropped when there is no previous release |

Expected files, overridable with `RELEASE_HTACCESS_TEMPLATE` and `ROUTER_HTACCESS_TEMPLATE`:

- `deploy/htaccess/release.htaccess.tpl`
- `deploy/htaccess/router.htaccess.tpl`

Until T10 merges, a run fails at render time with that path in the error. Tests pass their own fixtures and do not add those files.

## Workflow

[deploy-static.yml](file:///workspace/.github/workflows/deploy-static.yml) checks out the caller ref with `fetch-depth: 0` (the guard needs history), downloads the artifact so `index.html` is at the top of `dist/`, installs `lftp`, and runs the script. Job settings from plan §6.3:

- `concurrency.group`: `deploy-<env>-<target>`
- `cancel-in-progress: false` (GitHub keeps the newest pending run and cancels older pending runs; the in-progress run finishes)
- `timeout-minutes: 15`
- `environment`: the `env` input, so FTP secrets and reviewers come from that GitHub Environment

T12 sets `strategy.max-parallel: 2` on the caller. This workflow has no matrix. Preview concurrency (`preview-pr-<N>`) and API concurrency stay on those workflows.

Secrets read from the selected environment:

| Secret | Script variable | Notes |
|---|---|---|
| `FTP_HOST` | `FTP_HOST` | TLS required in the workflow |
| `FTP_USERNAME` | `FTP_USER` | Same name the current workflows already use |
| `FTP_PASSWORD` | `FTP_PASS` | Never printed; stripped from `lftp` output |
| `FTP_TARGET_DIR` | `FTP_ENV_DIR` | Docroot relative to the FTP login. Empty when the login is already the docroot |

`PUBLIC_ORIGIN` is chosen from `env` (preview and dev share `https://dev.yogeshkumarasamy.in`). The script will not open a non-local FTP host or a public smoke URL unless `FTP_ALLOW_REMOTE=1`, which the workflow sets and local tests do not.

Hostinger's FTPS certificate is a Let's Encrypt cert for `*.hstgr.io` and `hstgr.io` only. `FTP_HOST` is the account IP (`82.25.107.98`). That address has no PTR, and `ftp.yogeshkumarasamy.in` is the same IP, so no name we control is on the certificate. `lftp` still forces TLS and verifies the chain (`ftp:ssl-force true`, `ssl:verify-certificate yes`). It does not check the certificate name (`ssl:check-hostname no`). `FTP_TLS_CHECK_HOSTNAME` overrides that: `yes` turns the name check back on, and an empty value or `no` leaves it off. [deploy-static.yml](file:///workspace/.github/workflows/deploy-static.yml) sets `FTP_TLS_CHECK_HOSTNAME=no`. Local unit tests use `FTP_SSL=off` against pure-ftpd and do not set the variable.

Outputs: `result` (`deployed`, `superseded`, `rolled-back`, or `failed`), `previous`, `live`, `switch` (`rename-over` or `rm-then-mv`). `rolled-back` and `failed` exit 1 after the outputs are written.

## Router switch and T08

[T08 (#72)](https://github.com/yogeshkumarasamy/workspace/issues/72) has not recorded Hostinger's FTP behaviour. The script defaults to `FTP_ROUTER_SWITCH=auto`:

1. Try `mv .htaccess.new .htaccess` (rename over the existing file).
2. If that command fails, `rm -f .htaccess` and `mv` the new file into place.

`rename-over` avoids a gap where the folder is served with no router. `rm-then-mv` opens that gap for the time between the two commands. Set `FTP_ROUTER_SWITCH=rm-then-mv` or `rename-over` to force one path. Local pure-ftpd accepts file rename-over; that is not evidence about Hostinger.

Directory rename onto an existing folder is not used. A same-SHA retry deletes that SHA's directory, then renames the partial onto the free name.

## Observed on local pure-ftpd (not Hostinger)

A throwaway pure-ftpd on `127.0.0.1` accepted file rename-over (`mv .htaccess.new .htaccess`), uploaded `.htaccess` and `.release.json` when started with `--allowdotfiles`, and returned `550 File exists` from `mkdir -p` when the directory was already there. `LIST` timestamps were minute resolution. Directory rename onto an existing name is not used. None of this is evidence about Hostinger; T08 still has to record the real server.

## Prune clock

pure-ftpd `LIST` timestamps are minute resolution, so two releases in the same minute cannot be ordered from the listing. Each release carries `builtAt`. Prune sorts on that. `CURRENT` and `PREV` are kept even when the timestamp is missing or tied.

## Stale runs and five overlapping merges

The concurrency group serialises one app on one environment. A burst of merges leaves the oldest run in progress and the newest one pending; GitHub cancels the pending runs in between. The in-progress run may still be an older SHA. It is allowed to switch only when the live SHA is an ancestor of the SHA it is publishing, so a rerun or a late older run cannot move the router backwards. Its upload, if it finishes, is a folder the router does not point at.

An old-tab chunk request hits the live release, misses `assets/*`, and the release `.htaccess` sends it to `__PREVIOUS__`, which chains through the retained releases. Keeping five, and never deleting the live or previous folder, is what makes that chain exist. LiteSpeed actually applying those rules is a T08 probe, not something this repository can prove.

## Verification

- `node --test deploy/ftp-release.test.mjs` against local pure-ftpd on `127.0.0.1`. No route to Hostinger.
- `actionlint` on [deploy-static.yml](file:///workspace/.github/workflows/deploy-static.yml).
