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
The API stays on the Node server for local dev. Hostinger serves only the screens. Vite `base` is `APP_BASE` (default `/yt-scheduler/`; previews use `/preview/yt-scheduler/pr-<N>/`, the same `/preview/` prefix the portfolio preview is served at). The static build is `apps/yt-scheduler/dist`. The Node compile output is `dist-server/` so it is not uploaded with the UI. `<base href="%BASE_URL%">` makes `document.baseURI` the app base on deep links.

The new-job dialog snapshots its fields when it opens. A later channel refetch (the screen polls every 15 seconds) must not clear them. Pasting a Drive share URL (`/file/d/<id>/view` or `?id=<id>`) stores that file id and leaves the other fields alone.

Before the first render the client fetches `app-config.json` with `cache: "no-store"`. If `apiBaseUrl` is set, that Workers URL is the API base (an origin with no path is treated as `<origin>/api/`, matching the current routes) and every `fetch` sends `x-api-key`. If it is absent, the base is `new URL("api/", document.baseURI)`. OAuth navigations go to `<worker-origin>/oauth/start` when `apiBaseUrl` is set, otherwise `oauth/start` under the page base. The Node server mounts the same API and OAuth handlers at `/yt-scheduler/` so local `pnpm dev:web` and `pnpm start` keep working.

`deploy/targets.json` registers the UI as `yt-scheduler` and the Worker as `yt-scheduler-api` (`d1: "yt"`, `workerNames.production` = `yt-scheduler-api-prod`). Deploy writes `app-config.json` and a flat `.htaccess` into the dist. Mock environments may include `apiKey` so the page can sign in. Production does not.

### Privacy policy and terms
`web/public/privacy/index.html` and `web/public/terms/index.html` are plain HTML. The build stamps `__APP_BASE__` and `__CONTACT__` (`scripts/stamp-legal-pages.mjs`, after `vite build`) so the pages work at `/yt-scheduler/` and at `/preview/yt-scheduler/pr-<N>/`. They do not load JavaScript. The flat `.htaccess` (`deploy/yt-static.mjs`) rewrites `privacy` and `terms`, with or without a trailing slash, to that file before the SPA fallback. The service worker navigation fallback ignores those paths. The signed-out home page (`web/index.html` plus the React sign-in screen) says what the app does and links to both pages.

Contact is `web/src/legal-contact.json`. `contactEmail` stays empty unless a real address is set there. The GitHub profile is the public contact until then. The pages name the OAuth scopes `youtube`, `youtube.upload`, `drive.file`, `openid`, and `email`, the encrypted refresh token in Cloudflare D1, job metadata, revocation at `https://myaccount.google.com/permissions`, the Google API Services User Data Policy (including Limited Use), the YouTube Terms of Service, and the Google Privacy Policy.

## Workers API (free plan)
`apps/yt-scheduler-api` is the hosted API: Hono on a Worker, D1 instead of Postgres, WebCrypto for the refresh token. Dev, staging, and PR previews set `YOUTUBE_MODE=mock` and do not call Google. Production sets `YOUTUBE_MODE=live` and publishes publicly (a future `publishAt` is sent as private, which YouTube flips to public at that time). The default Drive scope is `drive.file`. `drive.readonly` is an explicit `DRIVE_SCOPE=readonly` opt-in.

`GET /api/drive/list`, `GET /api/drive/file/:id`, and `GET /api/google/access-token` (Google Picker) mint an access token from `driveRefreshTokenEnc` when that channel has connected Drive, and otherwise from the YouTube refresh token. In live mode, `/api/google/access-token` returns 409 until Drive is connected (Channels → Use separate Drive account; the same Google account is fine). YouTube upload, playlist, and schedule calls keep the YouTube refresh token. Drive reads during an upload (file metadata, media bytes, and a Drive thumbnail) use the Drive refresh token when it is set.

Uploads run in Workflow `UploadWorkflow`. Chunk size is `UPLOAD_CHUNK_BYTES` (default 64 MiB, multiple of 256 KiB, max 64 MiB). There is no cron on this Worker: a job starts the Workflow, which sleeps until `runAt`. One Free-plan instance shares 50 external subrequests and 1,000 Cloudflare-service subrequests (D1 included) across every `step.do`. A chunk is a status probe, a source GET, and a sink PUT, so the instance stops after 16 chunk steps (sooner when D1 would pass 1,000, or when opening the YouTube session already spent external calls). It writes the confirmed byte offset to D1 and starts another instance on the same resumable session. An unfinished transfer stays `uploading`. Wrangler 4 deploys from Node 22. The local Node server in `apps/yt-scheduler` remains the Postgres demo.

## PWA (v3)
vite-plugin-pwa (`registerType: "prompt"` plus an hourly `reg.update()`). `scope` and `start_url` are `BASE_URL`. Icon paths are relative to that base. `navigateFallback` is `BASE_URL + "index.html"`, with a denylist for `api/` and `oauth/`, and runtime `NetworkOnly` for both. `VITE_PWA=off` disables the plugin for previews. The manifest and icons are described in the README. The Hono server serves `sw.js`, `registerSW.js` and the manifest itself with no-cache headers, and serves assets as immutable (a small `readFile` helper with a path-traversal guard). On mobile (<768px) the calendar is an agenda with a "Move to…" sheet, and dialogs are full-screen.

CI greps the built `index.html` and `*.webmanifest` and fails if a `/`-rooted URL is not under `APP_BASE` (`scripts/check-base-urls.mjs`, also a step in [ci.yml](file:///workspace/.github/workflows/ci.yml)).

## Schema
`src/schema.ts` is the source of truth. `pnpm --filter @apps/yt-scheduler gen:schema` writes `schema/metadata.schema.json` and `schema/job.schema.json`.
