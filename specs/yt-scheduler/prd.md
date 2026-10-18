# PRD: YT Scheduler

**Approval:** Pre-approved by the repo owner in chat on 2026-10-14 ("Explore the best in the market… build our own app… Go yolo"). This counts as the human approval for PRD → Spec → Tasks → Code for this app only (AGENTS.md §2).

## Why
The YouTube Ideas agent already plans ideas and auto-generates episodes for **@meeyazhpirai** (Tamil kids animated series) into private Google Drive folders. Uploading and scheduling is still manual, and SaaS schedulers (Buffer, Hootsuite, Later, Metricool, Mixpost Pro) need paid plans. We want a free, self-hosted service.

## What
- Agents push jobs over HTTP (`POST /api/jobs`, `x-api-key`), single or bulk, idempotent per channel + `idempotencyKey`.
- Video and thumbnail sources: https URL **or** Google Drive file id (private Drive, read with `drive.readonly`).
- A `metadata.json` sidecar next to each video, with a published JSON Schema.
- Drive folder import: one episode folder (with `Short NN` subfolders) becomes N jobs.
- Upload right away with YouTube-native scheduling (`private` + `status.publishAt`), or hold the upload until `uploadAt`.
- Auto-slotting per channel when `publishAt` is left out: Shorts daily at 07:00 Asia/Kolkata, long episodes weekly.
- **Multi-channel is first-class:** connect several channels over OAuth, set defaults and slots per channel, filter jobs by channel, track quota per channel.
- Retries with backoff, quota awareness (about 1,700 units per job against 10k a day), and a web UI to view, create, cancel and retry jobs.
- Surface clearly that unaudited API projects upload **private-locked**.

## Non-goals (v1)
Analytics, comments, other social networks, editing videos after upload, and multi-user auth (one API key for the operator).
