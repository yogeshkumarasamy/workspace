# Tech Spec: YT Scheduler (`apps/yt-scheduler`)

## Stack
Node 20 and TypeScript (ESM). **Hono** HTTP on `@hono/node-server`, **Postgres** via `pg` (Neon/Supabase free tier, or docker-compose), the official **googleapis** client, **zod** for validation, and **Vitest** for tests. The UI is one server-rendered HTML page with vanilla JS, so the app has no frontend build step. It runs as **one long-running process**: uploads of about 100 MB don't fit serverless time limits.

## Data model
- `channels`: YouTube channel id, handle, title, encrypted refresh token (AES-256-GCM), Google email, an optional separate Drive account token, `defaults` (category, language, madeForKids, shorts/long playlists) and `slots` (timezone, shortsTime, longWeekday, longTime, minLeadMinutes).
- `jobs`: channel, idempotency key (unique per channel), status, video/thumbnail source, metadata, uploadMode, runAt, publishAt, attempts, lastError, youtubeVideoId, warnings.
- `quota_usage(day, channel_id, units)`: the day is the Pacific-time quota day. The limit applies to the whole Google Cloud project, but usage is shown per channel.

## Job lifecycle
`queued → uploading → processing → scheduled | published`, with `failed` (retryable from the UI) and `cancelled`.
- The worker ticks every `TICK_SECONDS` and claims due jobs one at a time with `FOR UPDATE SKIP LOCKED`.
- When the quota budget is short, the job is deferred to the next quota reset.
- The Drive or URL stream is piped straight into the googleapis resumable `videos.insert`, with no temp file.
- Thumbnail and playlist steps are best-effort. If they fail, the job gets a warning and the video is never uploaded again.
- Retryable errors back off exponentially (1m to 1h, 5 attempts). 4xx errors fail immediately. `quotaExceeded` waits for the reset.
- On restart, jobs stuck in `uploading` go back to the queue.

## API (all `/api/*` need `x-api-key`)
`GET/PATCH /channels[/:id]`, `GET /jobs?channel=&status=`, `POST /jobs` (single, or `{jobs:[]}` returning 207 with a result per item), `GET /jobs/:id`, `POST /jobs/:id/cancel|retry`, `POST /drive/import {folderId, channel?, dryRun?}`, `GET /slots/next?channel=&type=`, `GET /quota`, `POST /tick`. OAuth: `GET /oauth/start?key=…[&purpose=drive&channelId=…]`, then `/oauth/callback`.

## Schema
`src/schema.ts` is the source of truth. `pnpm --filter @apps/yt-scheduler gen:schema` writes `schema/metadata.schema.json` and `schema/job.schema.json`.
