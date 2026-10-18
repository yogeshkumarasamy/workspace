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

## Web app (v2)
`web/` is a React 18 + Vite 5 + Tailwind 3 SPA built from `@repo/ui/shadcn` primitives (added to `packages/ui`: Button, Card, Input/Textarea/Select/Label/Switch/Checkbox, Badge, Progress, Alert, Tabs, Dialog, Table). History routing uses React Router with `basename` set from `import.meta.env.BASE_URL`. Drag-to-reschedule uses HTML5 DnD and calls `POST /jobs/:id/reschedule`. That updates the job locally before upload, and calls `videos.update` (status part: private + publishAt + our flags) once the video is uploaded and scheduled. New endpoints: `PATCH /jobs/:id`, `POST /jobs/bulk`, `GET /drive/list`, `GET /drive/file/:id`, `GET /channels/:id/playlists`, `GET /config`. Jobs gain a `log` jsonb column (added with `alter table … add column if not exists`).

## Static hosting (Y1, option A)
The API stays on the Node server for local dev. Hostinger serves only the screens. Vite `base` is `APP_BASE` (default `/yt-scheduler/`; previews use `/previews/yt-scheduler/pr-<N>/`). The static build is `apps/yt-scheduler/dist`. The Node compile output is `dist-server/` so it is not uploaded with the UI. `<base href="%BASE_URL%">` makes `document.baseURI` the app base on deep links.

Before the first render the client fetches `app-config.json` with `cache: "no-store"`. If `apiBaseUrl` is set, that Workers URL is the API base (an origin with no path is treated as `<origin>/api/`, matching the current routes) and every `fetch` sends `x-api-key`. If it is absent, the base is `new URL("api/", document.baseURI)`. OAuth navigations go to `<worker-origin>/oauth/start` when `apiBaseUrl` is set, otherwise `oauth/start` under the page base. The Node server mounts the same API and OAuth handlers at `/yt-scheduler/` so local `pnpm dev:web` and `pnpm start` keep working. Porting the server to Workers is a later ticket.

`deploy/targets.json` already registers this UI as the static target `yt-scheduler` (dist `apps/yt-scheduler/dist`, history routing, `api: "yt-scheduler-api"`). The Worker target itself is not added here.

## PWA (v3)
vite-plugin-pwa (`registerType: "prompt"` plus an hourly `reg.update()`). `scope` and `start_url` are `BASE_URL`. Icon paths are relative to that base. `navigateFallback` is `BASE_URL + "index.html"`, with a denylist for `api/` and `oauth/`, and runtime `NetworkOnly` for both. `VITE_PWA=off` disables the plugin for previews. The manifest and icons are described in the README. The Hono server serves `sw.js`, `registerSW.js` and the manifest itself with no-cache headers, and serves assets as immutable (a small `readFile` helper with a path-traversal guard). On mobile (<768px) the calendar is an agenda with a "Move to…" sheet, and dialogs are full-screen.

CI greps the built `index.html` and `*.webmanifest` and fails if a `/`-rooted URL is not under `APP_BASE` (`scripts/check-base-urls.mjs`, also a step in [ci.yml](file:///workspace/.github/workflows/ci.yml)).

## Schema
`src/schema.ts` is the source of truth. `pnpm --filter @apps/yt-scheduler gen:schema` writes `schema/metadata.schema.json` and `schema/job.schema.json`.
