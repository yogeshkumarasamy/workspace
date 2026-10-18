# yt-upload-spike

Workers Free spike for [Y0 / issue #88](https://github.com/yogeshkumarasamy/workspace/issues/88). It answers one question: can a Workflow step stream a Range of a source file into a mock YouTube resumable upload and stay inside the Free plan, for the volume yt-scheduler actually has?

Option B (Hostinger / PHP) is dropped. Workers Paid ($5/month) is not a fallback. YouTube is not called. The sink speaks YouTube's `308 Resume Incomplete` + `Range` protocol and then `200`.

This package is not a production deploy target. It is not listed in [deploy/targets.json](../../deploy/targets.json). It has no cron trigger. Its `build` script does not emit `dist`. Preview and production workflows do not deploy it.

## What is already known, and what is not

Published Free-plan caps (Workers limits and Workflows limits, checked 2026-10-18):

| Cap | Free plan |
|---|---|
| CPU per invocation, including each Workflow step | 10 ms. Waiting on `fetch` does not count. |
| Wall clock per Workflow step | Unlimited |
| Workflow steps | 3,000 / day, and 1,024 per instance |
| Requests | 100,000 / day, shared by every Worker on the account |
| Subrequests | 50 per invocation |
| Request body entering a Worker on a Free Cloudflare account | 100 MB |
| Worker memory | 128 MB |
| Queues | 10,000 operations / day. One delivered message is a write, a read, and a delete (3 operations). |

**The table below is budget arithmetic, not a CPU measurement.** A pass or a fail against 10 ms comes only from Workers Logs `cpuTimeMs`, collected by the manual workflow [Y0 Workers Free CPU measure](../../.github/workflows/yt-upload-spike-measure.yml). That workflow has not filled a number into this file.

Streaming matters for two caps at once. Buffering a 64 MiB chunk in JavaScript would both spend CPU on the copy and press the 128 MB isolate limit. Each step passes the source `ReadableStream` straight into the sink `PUT`. Local tests check that the PUT body is that same stream.

## Volume

Stated volume: a typical week is 6 Shorts + 1 long video. The busy week is about 15 uploads (~60 / month). Long videos are up to about 500 MB. The fixture size used below is **500 MiB** (524,288,000 bytes), which is an exact multiple of 256 KiB.

Shorts do not have a stated file size. The table uses a planning ceiling of **64 MiB per Short** (one 64 MiB chunk, or more when the chunk size is smaller). A quieter Short is fewer steps.

Caps reset daily. A month does not pool steps, so 60 uploads / month is the wrong place to look. The stress case is the busiest UTC day. Two of those are tabulated:

- **Typical week, piled:** all 6 Shorts and the long video land on one UTC day.
- **Max mix, piled:** 15 uploads on one UTC day, one of them a 500 MiB long and the other 14 Shorts.
- **Envelope:** the same 15 uploads, but every one of them is a 500 MiB long. That is stricter than the stated mix. It is here so a smaller chunk size cannot hide behind the Shorts assumption.

A spread-out week is easier than the piled row: the long video's own step count is the peak day.

Each chunk step does three subrequests (status probe, source `GET`, sink `PUT`). The status probe is what makes a retried step skip a chunk the sink already committed. Three is under the cap of 50. One Workflow instance stops at 1,020 steps so it stays under the 1,024 instance cap; the measure script starts another instance on the same sink session if it has to.

| Chunk | Steps for one 500 MiB long | Instances | Steps for one 64 MiB Short | Typical week piled (7 files) | Max mix piled (15 files) | 15-long envelope | Under 3,000 steps for the envelope? |
|---|---:|---:|---:|---:|---:|---:|---|
| 64 MiB | 8 | 1 | 1 | 14 | 22 | 120 | yes |
| 32 MiB | 16 | 1 | 2 | 28 | 44 | 240 | yes |
| 16 MiB | 32 | 1 | 4 | 56 | 88 | 480 | yes |
| 8 MiB | 63 | 1 | 8 | 111 | 175 | 945 | yes |
| 4 MiB | 125 | 1 | 16 | 221 | 349 | 1,875 | yes |
| 2 MiB | 250 | 1 | 32 | 442 | 698 | 3,750 | no |
| 1 MiB | 500 | 1 | 64 | 884 | 1,396 | 7,500 | no |
| 512 KiB | 1,000 | 1 | 128 | 1,768 | 2,792 | 15,000 | no |
| 256 KiB | 2,000 | 2 | 256 | 3,536 | 5,584 | 30,000 | no |

Requests on that same day are about one invocation per step, plus one create per instance. The 15-long envelope at 64 MiB is about 120 invocations. The account also spends cron-hub ticks (one a minute, three environments is 4,320 / day in the CI plan) and whatever Innings Break uses. Upload steps at this volume are a small slice of 100,000 / day. The step cap binds before the request cap.

Queue operations are `steps × 3`. A typical piled week at 256 KiB is 10,608 operations, over the 10,000 / day Queues allowance. At 64 MiB that same day is 42 operations. Queues do not raise the 10 ms CPU cap, and their free allowance is tighter than Workflow steps, so they are a worse place to move the bytes. A queue message cannot carry the file (128 KB message cap); the consumer would still `GET` + `PUT` one chunk, same as a step.

YouTube's resumable protocol wants chunk sizes that are multiples of 256 KiB except the last chunk. The mock allows smaller sizes only when a test opts in, so the suite can run without multi-megabyte fixtures.

The mock sink is itself a Worker, so a chunk PUT is an incoming request. On a Free Cloudflare account that body cap is 100 MB. 64 MiB fits. A real YouTube PUT is an outbound fetch from the Workflow step; this spike does not assume that outbound body has the same 100 MB cap, and it does not measure chunks above 64 MiB.

## Best free-plan option, before the CPU measurement

On budget alone, **Workflow passthrough at 64 MiB** is the one that fits. A 500 MiB long is 8 steps. A piled max week in the stated shape is 22 steps. Even the 15-long envelope is 120 steps, against 3,000 / day and 1,024 / instance. Run the measure script at 64, then 32, then 16. Keep the largest size whose uploader `cpuTimeMs` stays under 10.

If 64 / 32 / 16 all exceed 10 ms, keep stepping down. 8 MiB and 4 MiB still fit the 15-long envelope. Below 4 MiB the envelope does not fit in one UTC day. The stated max mix (one long + 14 Shorts) still fits at 512 KiB (2,792 steps) and does not fit at 256 KiB. 256 KiB also needs two Workflow instances per 500 MiB file.

If every aligned size, including 256 KiB, exceeds 10 ms, Workers cannot carry the bytes on the Free plan. The client script (`scripts/client-transfer.mjs`, and `GET /browser-transfer` on the deployed worker) moves the file on the machine or in the browser. That path is a handful of control-plane requests and zero chunk steps. It does not publish while the machine or tab is closed, so it does not, by itself, meet unattended scheduling. Queues are not a way through that CPU wall.

Durable Object CPU is documented separately from Workflow steps (the DO limits page lists a 30 second default). This spike does not use a higher DO limit to hash or buffer the file. The uploader is a Workflow step and stays under the 10 ms question. Checksums of large objects are computed by the measure script after it downloads the parts, not inside the Worker.

## How the harness works

1. `UploadSession` (SQLite Durable Object) is the mock sink. `PUT` with `Content-Range: bytes START-END/TOTAL` appends only when `START` is the byte already received. A retry of a finished range returns `308` and does not append. An overlap returns `409`. A status probe is `PUT` with `Content-Range: bytes */TOTAL`. Completion is `200`. Memory parts up to 256 KiB are hashed in the sink. Larger parts are streamed into R2 with `bucket.put(key, request.body)` and the Worker does not hash them.
2. `UploadWorkflow` loads the cursor, then each `step.do` GETs `Range: bytes=o-(o+C-1)` and PUTs `response.body` to the sink. A `NonRetryableError` step named `forced-interruption` stops an instance so a second instance can resume the same session.
3. Sources are a generated stream (tests, max 1 MiB), an R2 object, or any HTTPS URL. Drive is an HTTPS URL plus `DRIVE_ACCESS_TOKEN` on the Worker. The token is not stored in Workflow params.
4. `POST /queue/chunk` enqueues the same transfer for a one-chunk comparison. Same CPU cap, tighter operations cap.

## Local checks

```sh
pnpm --filter @apps/yt-upload-spike test
pnpm --filter @apps/yt-upload-spike lint
pnpm --filter @apps/yt-upload-spike typecheck
```

Vitest runs inside `@cloudflare/vitest-pool-workers` (package 0.23.0, which is the Workers Vitest pool; Cloudflare has since published the same API as `@cloudflare/vitest-plugin`). That package's workerd accepts compatibility dates through 2026-08-22, so `wrangler.jsonc` uses that date. The suite covers the sink protocol, a duplicate range, checksums, resume after a forced interruption, stream identity, the queue consumer, and the budget table. It does not produce CPU milliseconds. Miniflare does not apply the 10 ms cap.

## Measure on a Free account

Run it from GitHub Actions so the API token stays in repository secrets.

1. Merge this workflow to `main`. The Actions tab lists it from the default branch.
2. Open **Actions → Y0 Workers Free CPU measure → Run workflow**.
3. Leave the inputs at 500 MiB and 64 MiB unless you are stepping down by hand. The job starts at 64 MiB and steps down on its own when `cpuTimeMs` is 10 or higher, stopping before it would spend more than 2,800 of the 3,000 daily Workflow steps.
4. Read the job summary and download the `yt-upload-spike-cpu` artifact. `cpuTimeMs` cells that say `not returned` are empty on purpose.

The job deploys only `yt-spike-gha-throwaway` (workers.dev, no cron). It does not call YouTube. When the measurement finishes, or the measure step fails, it deletes that Worker, its Workflow, its Durable Object namespace, and the R2 bucket of the same name. A second run starts by deleting leftovers from a cancelled run.

R2 is the default source: the job writes a 500 MiB fixture and puts it in the throwaway bucket. Enabling R2 on a new account asks for a payment method even though the free tier (10 GB-month, plus the operation allowance) is enough for this fixture. If bucket creation fails for that reason, the job says so and falls back to serving the same fixture from the Actions runner through a temporary tunnel. The Worker then only streams Range GETs into mock sink PUTs. That fallback needs no R2 subscription and no Drive grant.

The observability query needs Workers Observability Write (the Edit permission on the token template). Score a size only from the `cpuTimeMs` field. The script does not read GraphQL `cpuTimeP50`.

`pnpm measure` from a shell is the same sweep when `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set and you pass `--sweep`. Without those variables it exits 2 and prints the credential list. It does not invent a CPU number.
