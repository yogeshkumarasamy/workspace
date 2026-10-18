# Innings Break runtime — Workers, shared D1, cron hub

> **Status: PENDING APPROVAL (T17, issue #83).**
> **Authorized Personas**: Customer API — Team Manager. Console API — Business Owner and Operations Manager. Cron hub — none.
>
> The direction (Cloudflare Workers + one D1 database per environment + one cron-hub Worker per environment) is approved. This document is the spec text waiting for review. AGENTS.md forbids API implementation until this spec is approved.
>
> **In this change**: spec text and Wrangler scaffolding only.
> **Not in this change**: handlers, Hono app code, migrations, Cloudflare resources, credentials, deploys, and `.github/workflows`.

Overview: [innings-break.md](file:///.specify/memory/innings-break.md) §3. Decision log: [Session 27](file:///.specify/memory/innings-break-changelog.md).

---

## 1. What changed from Express

The previous runtime was one Node.js + Express process at `apps/innings-break-api`. That directory is not created.

| Concern | Decision |
|---|---|
| HTTP | Hono, running on Cloudflare Workers. No `@hono/node-server`. Hono is not installed in this change. |
| Processes | Two API Workers per environment, plus one cron-hub Worker per environment. |
| Database | One D1 database per environment. Both API Workers bind it. |
| Cron | One `* * * * *` trigger on each environment's cron hub. Nowhere else. |
| Sessions | WebCrypto. Not Node.js `crypto`. |
| Location in the repo | `apps/`, because AGENTS.md puts deployable services in `apps/` and persona checks use `apps/innings-break-*`. Worker script names still match the CI plan. |

Packages:

| Package | Directory | Worker script (dev / staging / prod) |
|---|---|---|
| `@apps/innings-break-customer-api` | `apps/innings-break-customer-api` | `ib-customer-api-dev` / `ib-customer-api-staging` / `ib-customer-api-prod` |
| `@apps/innings-break-console-api` | `apps/innings-break-console-api` | `ib-console-api-dev` / `ib-console-api-staging` / `ib-console-api-prod` |
| `@apps/cron-hub` | `apps/cron-hub` | `cron-hub-dev` / `cron-hub-staging` / `cron-hub-prod` |

Wrangler environment keys are `dev`, `staging`, `production`, and `preview`. The production Worker suffix is `prod`, matching `ib-console-api-{dev,staging,prod}`.

`src/index.js` in each package is a non-functional scaffold (HTTP 501). It is not the API.

## 2. Shared D1

One database per environment. Both Workers use binding name `DB`.

| Wrangler env | D1 name | Who binds it |
|---|---|---|
| `dev` | `ib-dev` | `ib-console-api-dev` and `ib-customer-api-dev` |
| `staging` | `ib-staging` | `ib-console-api-staging` and `ib-customer-api-staging` |
| `production` | `ib-prod` | `ib-console-api-prod` and `ib-customer-api-prod` |
| `preview` | `ib-pr-<N>` (committed name: `ib-pr-UNSET`) | The two preview Workers for that PR only |

Rules:

* The console API and the customer API in one environment use the same `database_name` and the same `database_id`. `pnpm check:ib-wrangler` fails if they differ.
* `database_id` in git is the placeholder `REPLACE_WITH_<name>_DATABASE_ID`. Deploy fails until those placeholders are replaced with the ids from the Cloudflare dashboard. This change does not create the databases.
* Preview `database_id` stays `REPLACE_WITH_ib-pr-N_DATABASE_ID`. It must never be copied from `ib-dev`, `ib-staging`, or `ib-prod`. Per-PR databases are a later ticket (T20).
* Neither Wrangler file sets `migrations_dir`. A later ticket applies migrations **once** per environment, from one folder, before either Worker deploys. Expand-only migrations are that later ticket's rule.
* The customer API reads grounds, areas, and hubs that the console API writes. That is why they share a database: a preview that updated only one Worker would test against the wrong data.

D1 bindings are not inherited from the top-level Wrangler config, so each environment block declares its own binding.

## 3. Cron hub

Workers Free allows **5 cron triggers per account**. This design uses **3**:

| Worker | `dev` | `staging` | `production` | `preview` |
|---|---|---|---|---|
| `cron-hub-*` | `* * * * *` | `* * * * *` | `* * * * *` | `crons: []` |
| `ib-console-api-*` | none | none | none | none |
| `ib-customer-api-*` | none | none | none | none |

`triggers` is inheritable. An empty `crons` array removes triggers on deploy. Omitting `triggers` leaves any cron already on that Worker in place, so `preview` and both API Workers set `"crons": []` on purpose. There is no top-level `triggers` block, so a named environment cannot inherit a cron that its own block does not set.

The cron hub has no D1 binding. It calls the console API over a service binding named `IB_CONSOLE_API`:

| Cron-hub env | Service binding target |
|---|---|
| `dev` | `ib-console-api-dev` |
| `staging` | `ib-console-api-staging` |
| `production` | `ib-console-api-prod` |
| `preview` | `ib-console-api-preview` (template only; previews are not given a cron) |

No yt-scheduler binding. Option A vs option B is still open (issue #88). If option A is chosen later, yt is another service binding on this same cron, not a new cron trigger.

### 3.1 What the every-minute trigger runs

Cloudflare evaluates cron expressions in UTC. The hub's `scheduled` handler (not written in this change) does only this:

1. **Hourly auto-complete** when `minute === 0`. Invoke the console API with job `hourly-auto-complete`. This is the existing rule that an order still in transit is completed after 24 hours. Running at minute 0 UTC is hourly; it does not have to fall on an IST hour.
2. **Sunday upcoming-week lock** when the time in `Asia/Kolkata` is Sunday 14:00. Invoke the console API with job `lock-upcoming-week`. That instant is Sunday 08:30 UTC. Product copy already locks the next week at Sunday 2:00 PM IST ([console feature 3.3, US-09](file:///specs/innings-break/console/features/03-active-month-calendar-view-operational-schedule-engine.md)). A check of `minute === 0` alone never lands on 14:00 IST, because IST is UTC+5:30.

Both calls go to the console API `POST /__cron` through the service binding. The handler is idempotent: repeating a tick does not lock the week twice and does not complete an order twice. The route rejects any request that does not carry the `CRON_SHARED_SECRET` header. That secret is a Wrangler secret, not a var in git. Public callers get 404. Preview Workers expose the same route for a manual test and have no cron trigger.

Deploying `cron-hub` before that handler exists would fire a failing Worker every minute. Do not deploy the cron hub until the handler is implemented and this spec is approved.

## 4. Sessions (WebCrypto)

Not implemented in this change. When it is:

* After SMS OTP succeeds, the Worker generates a session id with `crypto.getRandomValues`.
* The client receives the id. D1 stores only the SHA-256 from `crypto.subtle.digest`.
* Customer sessions and console sessions are different rows and different cookies. A console session cannot call the customer API, or the reverse.
* A delegated match-week session is scoped to that week and that team.
* `nodejs_compat` is not enabled. Node.js `crypto` is not a dependency.
* Any signing secret is a Wrangler secret (`SESSION_SECRET`), per environment, not a committed var.

## 5. CORS vars (public)

Committed `vars` only. No secrets.

| Env | `CORS_ORIGIN` |
|---|---|
| `dev` | `https://dev.yogeshkumarasamy.in` |
| `staging` | `https://staging.yogeshkumarasamy.in` |
| `production` | `https://yogeshkumarasamy.in` |
| `preview` | `https://dev.yogeshkumarasamy.in` |

Allowed request headers, when the handler exists: `content-type`, `authorization`, `x-api-key`.

## 6. Scaffolding layout

```
apps/innings-break-console-api/wrangler.jsonc
apps/innings-break-console-api/src/index.js    # 501 scaffold
apps/innings-break-customer-api/wrangler.jsonc
apps/innings-break-customer-api/src/index.js   # 501 scaffold
apps/cron-hub/wrangler.jsonc
apps/cron-hub/src/index.js                     # 501 scaffold; scheduled() throws
scripts/check-ib-wrangler.mjs
```

Check: `pnpm check:ib-wrangler`.

Always deploy with `--env dev`, `--env staging`, or `--env production`. A bare `wrangler deploy` uses the top-level name (`ib-console-api`, `ib-customer-api`, or `cron-hub`) and is not an environment in this design. The top-level config has no D1 binding and no cron.

## 7. Cloudflare setup — you do this, not the repo

Nothing in this change calls Cloudflare. No database, Worker, token, or secret is created here.

Do this only after you approve this spec. Order matters: the cron hub is last, and only once `POST /__cron` exists.

1. In the Cloudflare dashboard, create **three** D1 databases. Do not create a database per API.
   * `ib-dev`
   * `ib-staging`
   * `ib-prod`
2. Copy each database id into **both** `apps/innings-break-console-api/wrangler.jsonc` and `apps/innings-break-customer-api/wrangler.jsonc` for that environment, replacing `REPLACE_WITH_ib-dev_DATABASE_ID`, `REPLACE_WITH_ib-staging_DATABASE_ID`, and `REPLACE_WITH_ib-prod_DATABASE_ID`. The two files must stay identical per environment. Leave the preview id as `REPLACE_WITH_ib-pr-N_DATABASE_ID`.
3. Create an account API token. Use the **Edit Cloudflare Workers** template, then restrict it to this account only. The first deploy creates Workers that do not exist yet, so the token needs permission to create Workers (Workers Scripts Write, or Workers product Admin under the current roles). Add **D1 Edit** as well if this token should create or migrate databases; creating the three databases in the dashboard does not require putting D1 Edit on the CI token. Do not use the global API key.
4. Store the token outside the repo, in GitHub Environments `dev`, `staging`, and `production` (those environments are set up by issue #76, not by this change):
   * `CLOUDFLARE_API_TOKEN`
   * `CLOUDFLARE_ACCOUNT_ID`
   Do not commit either value. Do not put `account_id` in the Wrangler files.
5. Deploy is a later ticket (T19) and is intentionally not wired in `.github/workflows` here. When that ticket exists, the order per environment is: apply migrations once, deploy `ib-console-api`, deploy `ib-customer-api`, then deploy `cron-hub`. `wrangler deploy --env dev` will fail today because the database ids are placeholders and the workflow is not added.
6. After the three cron-hub Workers are deployed, the account should show **3** cron triggers. The cap is 5. Do not add a cron to either API Worker, to a preview Worker, or to a fourth schedule.
7. Do not create `ib-pr-*` databases now. Those are per-PR previews (T20). Do not deploy `cron-hub` preview; its config exists so a preview deploy cannot keep a cron.

Local secrets later, never committed: `.dev.vars` (gitignored) for `CRON_SHARED_SECRET` and `SESSION_SECRET`.

## 8. Out of scope

* API routes, Hono, schema, and migrations (T18, issue #84).
* Deploy jobs (T19, issue #85). This change does not edit `.github/workflows`.
* Per-PR Workers and `ib-pr-<N>` (T20, issue #86).
* yt-scheduler on the cron hub (issue #88, option A is undecided).
* A constitution amendment. That waits until this spec is approved.
